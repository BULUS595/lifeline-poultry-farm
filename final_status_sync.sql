-- ============================================================
-- LIFELINE: FINAL WORKFLOW SYNC
-- =-- Updating status strings to match exact request
-- ============================================================

-- 1. Update the check constraint and existing data
ALTER TABLE stock_items DROP CONSTRAINT IF EXISTS stock_items_status_check;

UPDATE stock_items SET status = 'PENDING_APPROVAL' WHERE status = 'pending';
UPDATE stock_items SET status = 'APPROVED' WHERE status = 'approved';
UPDATE stock_items SET status = 'REJECTED' WHERE status = 'rejected';

ALTER TABLE stock_items 
  ADD CONSTRAINT stock_items_status_check 
  CHECK (status IN ('PENDING_APPROVAL', 'APPROVED', 'REJECTED'));

-- 2. Ensure stock_notifications has the 'message' column for the popup
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='stock_notifications' AND column_name='message') THEN
        ALTER TABLE stock_notifications ADD COLUMN message TEXT;
    END IF;
END $$;
