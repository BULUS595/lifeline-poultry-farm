-- ============================================================
-- LIFELINE: V3 STOCK TRACKING & ACCOUNTABILITY
-- ============================================================

-- 1. Update stock_items with deletion metadata
ALTER TABLE stock_items DROP CONSTRAINT IF EXISTS stock_items_status_check;

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='stock_items' AND column_name='deleted_by') THEN
        ALTER TABLE stock_items ADD COLUMN deleted_by UUID REFERENCES auth.users(id);
        ALTER TABLE stock_items ADD COLUMN deleted_at TIMESTAMPTZ;
    END IF;
END $$;

ALTER TABLE stock_items 
  ADD CONSTRAINT stock_items_status_check 
  CHECK (status IN ('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'DELETED'));

-- 2. Create Stock Activity Logs Table
CREATE TABLE IF NOT EXISTS stock_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_type TEXT NOT NULL CHECK (action_type IN ('CREATE', 'DELETE', 'APPROVE', 'REJECT', 'EDIT')),
    performed_by UUID REFERENCES auth.users(id),
    performed_by_role TEXT,
    performed_by_name TEXT,
    stock_id UUID, -- Not a foreign key so it persists even if stock item is deleted
    stock_name TEXT,
    price DECIMAL,
    quantity DECIMAL,
    image_url TEXT,
    message TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for logs
ALTER TABLE stock_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all logs"
  ON stock_activity_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
        AND role IN ('super_admin', 'manager')
    )
  );

CREATE POLICY "Users can insert their own logs"
  ON stock_activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (performed_by = auth.uid());

-- 3. Adjust RLS for soft deletion visibility
-- Approved items should NOT include DELETED status
-- Pending items should NOT include DELETED status
-- This ensures they disappear from normal lists but stay in DB for logging

CREATE OR REPLACE VIEW deleted_stocks_log AS
SELECT * FROM stock_items WHERE status = 'DELETED';
