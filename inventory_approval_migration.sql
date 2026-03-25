-- ============================================================
-- LIFELINE: Inventory Approval Workflow Migration
-- Run this in Supabase SQL Editor
-- ============================================================

-- Step 1: Add new columns to stock_items for the approval workflow
ALTER TABLE stock_items
  ADD COLUMN IF NOT EXISTS status           TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS submitted_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS submitted_by_name TEXT,
  ADD COLUMN IF NOT EXISTS rejection_comment TEXT,
  ADD COLUMN IF NOT EXISTS image_url        TEXT;

-- Step 2: Update any existing rows to have 'approved' status
-- (so they still show up in Sales without needing re-approval)
UPDATE stock_items SET status = 'approved' WHERE status = 'pending';

-- Step 3: Enable Realtime for stock_items (if not already)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'stock_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE stock_items;
  END IF;
END $$;

-- Step 4: Drop old stock RLS policies (replace with workflow-aware ones)
DROP POLICY IF EXISTS "Authenticated users can view stock"  ON stock_items;
DROP POLICY IF EXISTS "Inventory staff can manage stock"    ON stock_items;
DROP POLICY IF EXISTS "stock_select_all"                    ON stock_items;
DROP POLICY IF EXISTS "stock_insert_inventory"              ON stock_items;
DROP POLICY IF EXISTS "stock_update_inventory"              ON stock_items;
DROP POLICY IF EXISTS "stock_delete_admin"                  ON stock_items;

-- Step 5: Re-create correct RLS policies

-- 5a: Sales Staff can only read APPROVED items
CREATE POLICY "sales_read_approved_stock"
  ON stock_items FOR SELECT
  TO authenticated
  USING (
    status = 'approved'
    OR get_my_role() IN ('super_admin', 'manager', 'inventory_staff')
  );

-- 5b: Inventory Staff can insert (submit) new items
CREATE POLICY "inventory_submit_stock"
  ON stock_items FOR INSERT
  TO authenticated
  WITH CHECK (
    get_my_role() IN ('super_admin', 'manager', 'inventory_staff')
  );

-- 5c: Inventory Staff can update ONLY their OWN pending items
--     Admin/Manager can update any item (approve/reject/edit approved)
CREATE POLICY "inventory_update_own_pending"
  ON stock_items FOR UPDATE
  TO authenticated
  USING (
    (submitted_by = auth.uid() AND status = 'pending')
    OR get_my_role() IN ('super_admin', 'manager')
  )
  WITH CHECK (
    (submitted_by = auth.uid() AND status = 'pending')
    OR get_my_role() IN ('super_admin', 'manager')
  );

-- 5d: Inventory Staff can delete their own pending items
--     Admin can delete anything
CREATE POLICY "inventory_delete_own_pending"
  ON stock_items FOR DELETE
  TO authenticated
  USING (
    (submitted_by = auth.uid() AND status = 'pending')
    OR get_my_role() IN ('super_admin', 'manager')
  );

-- Step 6: Verify the columns exist
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'stock_items'
ORDER BY ordinal_position;
