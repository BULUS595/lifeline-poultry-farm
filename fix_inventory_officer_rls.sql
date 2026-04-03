-- ============================================================
-- LIFELINE: FIX FOR INVENTORY OFFICER ROLE
-- ============================================================

-- This script extends the RLS policies to include the 'inventory_officer' role.
-- Run this in your Supabase SQL Editor.

-- 1: Update 'sales_read_approved_stock' policy
DROP POLICY IF EXISTS "sales_read_approved_stock" ON stock_items;
CREATE POLICY "sales_read_approved_stock"
  ON stock_items FOR SELECT
  TO authenticated
  USING (
    status = 'APPROVED'
    OR status = 'approved'
    OR get_my_role() IN ('super_admin', 'manager', 'inventory_staff', 'inventory_officer', 'inventory officer')
  );

-- 2: Update 'inventory_submit_stock' policy
DROP POLICY IF EXISTS "inventory_submit_stock" ON stock_items;
CREATE POLICY "inventory_submit_stock"
  ON stock_items FOR INSERT
  TO authenticated
  WITH CHECK (
    get_my_role() IN ('super_admin', 'manager', 'inventory_staff', 'inventory_officer', 'inventory officer')
  );

-- 3: Update 'inventory_update_own_pending' policy
DROP POLICY IF EXISTS "inventory_update_own_pending" ON stock_items;
CREATE POLICY "inventory_update_own_pending"
  ON stock_items FOR UPDATE
  TO authenticated
  USING (
    (submitted_by = auth.uid() AND (status = 'PENDING_APPROVAL' OR status = 'pending'))
    OR get_my_role() IN ('super_admin', 'manager')
  )
  WITH CHECK (
    (submitted_by = auth.uid() AND (status = 'PENDING_APPROVAL' OR status = 'pending'))
    OR get_my_role() IN ('super_admin', 'manager')
  );

-- 4: Update 'inventory_delete_own_pending' policy
DROP POLICY IF EXISTS "inventory_delete_own_pending" ON stock_items;
CREATE POLICY "inventory_delete_own_pending"
  ON stock_items FOR DELETE
  TO authenticated
  USING (
    (submitted_by = auth.uid() AND (status = 'PENDING_APPROVAL' OR status = 'pending'))
    OR get_my_role() IN ('super_admin', 'manager')
  );

-- 5: Also fix 'get_my_role' if it's missing the new roles specifically
-- (This depends on your get_my_role implementation, but ensuring the policy handles it is first step)

-- 6: Verify active items
SELECT name, status, quantity FROM stock_items WHERE status != 'DELETED';
