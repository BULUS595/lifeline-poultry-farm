-- ============================================================
-- LIFELINE: V5 ATOMIC SALES & INVENTORY SYNC
-- ============================================================

-- 1. Protect against negative stock and update status checks
ALTER TABLE stock_items DROP CONSTRAINT IF EXISTS stock_items_quantity_check;
ALTER TABLE stock_items ADD CONSTRAINT stock_items_quantity_check CHECK (quantity >= 0);

ALTER TABLE stock_items DROP CONSTRAINT IF EXISTS stock_items_status_check;
ALTER TABLE stock_items ADD CONSTRAINT stock_items_status_check 
  CHECK (status IN ('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'DELETED', 'OUT_OF_STOCK'));

-- 2. Define Custom Types
-- (Ensure we're dropping old functions first if reshaping)
DROP FUNCTION IF EXISTS process_retail_sale(JSONB);

-- 3. Create the Database Function for Atomic Sales Processing
CREATE OR REPLACE FUNCTION process_retail_sale(payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_receipt_number TEXT;
    v_items JSONB;
    v_total_price DECIMAL;
    v_payment_method TEXT;
    v_customer_name TEXT;
    v_salesperson_id UUID;
    v_farm_id TEXT;
    v_sale_id UUID;
    
    item RECORD;
    v_item_id UUID;
    v_item_name TEXT;
    v_requested_qty DECIMAL;
    
    v_current_stock DECIMAL;
    v_min_threshold DECIMAL;
    v_new_stock DECIMAL;
    v_new_status TEXT;
    
    v_inserted_sale RECORD;
BEGIN
    -- Extract top-level fields
    v_receipt_number := payload->>'receiptNumber';
    v_items := payload->'items';
    v_total_price := (payload->>'totalPrice')::DECIMAL;
    v_payment_method := payload->>'paymentMethod';
    v_customer_name := payload->>'customerName';
    v_salesperson_id := (payload->>'salespersonId')::UUID;
    v_farm_id := payload->>'farmId';

    -- Loop through each item in the sale using jsonb_array_elements
    FOR item IN SELECT * FROM jsonb_array_elements(v_items)
    LOOP
        v_item_id := (item.value->>'id')::UUID;
        v_item_name := item.value->>'name';
        v_requested_qty := (item.value->>'quantity')::DECIMAL;

        -- 1. LOCK the row specifically for this stock item to prevent race conditions
        SELECT quantity, min_threshold INTO v_current_stock, v_min_threshold
        FROM stock_items
        WHERE id = v_item_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Item % not found in inventory.', v_item_name;
        END IF;

        -- 2. Prevent Overselling!
        IF v_current_stock < v_requested_qty THEN
            RAISE EXCEPTION 'Not enough stock available for % (Requested: %, Available: %)', v_item_name, v_requested_qty, v_current_stock;
        END IF;

        -- 3. Reduce stock atomically and calculate status
        v_new_stock := v_current_stock - v_requested_qty;
        
        IF v_new_stock = 0 THEN
            v_new_status := 'OUT_OF_STOCK';
        ELSE
            v_new_status := 'APPROVED';
        END IF;

        UPDATE stock_items 
        SET quantity = v_new_stock, status = v_new_status, last_updated = NOW()
        WHERE id = v_item_id;

        -- 4. Check for Out of Stock or Low Stock Triggers
        -- Only alert low stock if it CROSSED the threshold during THIS sale
        IF v_new_stock = 0 THEN
            INSERT INTO stock_notifications (stock_item_id, recipient_role, message)
            VALUES (
                v_item_id, 
                'super_admin', 
                '⚠️ ' || v_item_name || ' is out of stock. Restocking required.'
            ),
            (
                v_item_id, 
                'manager', 
                '⚠️ ' || v_item_name || ' is out of stock. Restocking required.'
            );
        ELSIF v_new_stock <= v_min_threshold THEN
            -- Check if it just crossed it, preventing spam
            IF v_current_stock > v_min_threshold THEN
                INSERT INTO stock_notifications (stock_item_id, recipient_role, message)
                VALUES (
                    v_item_id, 
                    'super_admin', 
                    '⚠️ ' || v_item_name || ' is running low (only ' || v_new_stock || ' left).'
                ),
                (
                    v_item_id, 
                    'manager', 
                    '⚠️ ' || v_item_name || ' is running low (only ' || v_new_stock || ' left).'
                );
            END IF;
        END IF;

    END LOOP;

    -- 5. Insert the final transaction record ONLY if all stock checks pass
    INSERT INTO retail_sales (
        receipt_number, items, total_price, payment_method, 
        customer_name, salesperson_id, farm_id, created_at
    ) 
    VALUES (
        v_receipt_number, v_items, v_total_price, v_payment_method, 
        v_customer_name, v_salesperson_id, v_farm_id, NOW()
    ) RETURNING id, created_at INTO v_inserted_sale;

    -- Return the inserted sale data
    RETURN jsonb_build_object(
        'id', v_inserted_sale.id,
        'receiptNumber', v_receipt_number,
        'items', v_items,
        'totalPrice', v_total_price,
        'paymentMethod', v_payment_method,
        'customerName', v_customer_name,
        'salespersonId', v_salesperson_id,
        'farmId', v_farm_id,
        'createdAt', v_inserted_sale.created_at
    );

END;
$$;
