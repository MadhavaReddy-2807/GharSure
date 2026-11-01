-- Migration: 20261101000000_cart_sync_and_survey_enhancements.sql
-- Description: Adds customer_carts table for cross-platform cart synchronization and survey image_url column

CREATE TABLE IF NOT EXISTS customer_carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_customer_cart UNIQUE (customer_id)
);

CREATE INDEX IF NOT EXISTS idx_customer_carts_customer_id ON customer_carts(customer_id);

ALTER TABLE customer_carts ENABLE ROW LEVEL SECURITY;

-- Add image_url to surveys if not exists
ALTER TABLE surveys ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Ensure products table has all merchandising columns
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_hot_pick BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_recommended BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_new_arrival BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_best_seller BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5,2) DEFAULT 0.00;
ALTER TABLE products ADD COLUMN IF NOT EXISTS display_order INT DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS strike_off_reason TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS struck_off_at TIMESTAMPTZ;
