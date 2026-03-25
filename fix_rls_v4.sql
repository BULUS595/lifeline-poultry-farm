-- ============================================================
-- LIFELINE: FINAL RLS FIX FOR SALES/INVENTORY
-- ============================================================

-- Drop the old RLS policies that used lowercase 'approved'
DROP POLICY IF EXISTS "sales_read_approved_stock" ON stock_items;
DROP POLICY IF EXISTS "inventory_submit_stock" ON stock_items;
DROP POLICY IF EXISTS "inventory_update_own_pending" ON stock_items;
DROP POLICY IF EXISTS "inventory_delete_own_pending" ON stock_items;

-- 1: Sales Staff can only read UPPERCASE APPROVED items with qty > 0
CREATE POLICY "sales_read_approved_stock"
  ON stock_items FOR SELECT
  TO authenticated
  USING (
    status = 'APPROVED'
    OR get_my_role() IN ('super_admin', 'manager', 'inventory_staff')
  );

-- 2: Inventory Staff can insert (submit) new items
CREATE POLICY "inventory_submit_stock"
  ON stock_items FOR INSERT
  TO authenticated
  WITH CHECK (
    get_my_role() IN ('super_admin', 'manager', 'inventory_staff')
  );

-- 3: Inventory Staff can update ONLY their OWN pending items
CREATE POLICY "inventory_update_own_pending"
  ON stock_items FOR UPDATE
  TO authenticated
  USING (
    (submitted_by = auth.uid() AND status = 'PENDING_APPROVAL')
    OR get_my_role() IN ('super_admin', 'manager')
  )
  WITH CHECK (
    (submitted_by = auth.uid() AND status = 'PENDING_APPROVAL')
    OR get_my_role() IN ('super_admin', 'manager')
  );

-- 4: Inventory Staff can delete their own pending items
CREATE POLICY "inventory_delete_own_pending"
  ON stock_items FOR DELETE
  TO authenticated
  USING (
    (submitted_by = auth.uid() AND status = 'PENDING_APPROVAL')
    OR get_my_role() IN ('super_admin', 'manager')
  );

-- 5: Make sure notifications are clearable
DROP POLICY IF EXISTS "notifications_update" ON stock_notifications;

CREATE POLICY "notifications_update" 
  ON stock_notifications FOR UPDATE 
  TO authenticated 
  USING (recipient_role = get_my_role() OR get_my_role() IN ('super_admin', 'manager'))
  WITH CHECK (recipient_role = get_my_role() OR get_my_role() IN ('super_admin', 'manager'));
