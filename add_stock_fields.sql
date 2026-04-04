-- ============================================================
-- LIFELINE: ADD CATEGORY AND DESCRIPTION TO STOCK ITEMS
-- ============================================================

-- Add new columns for richer inventory data
ALTER TABLE stock_items ADD COLUMN IF NOT EXISTS category text DEFAULT 'other';
ALTER TABLE stock_items ADD COLUMN IF NOT EXISTS description text;

-- Update existing items to ensure consistency
UPDATE stock_items SET category = 'other' WHERE category IS NULL;

-- Verify columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'stock_items' 
AND column_name IN ('category', 'description');
