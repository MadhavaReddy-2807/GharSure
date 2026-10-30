-- Migration: 20261030000000_vouchers_orders_checkout_schema.sql
-- Description: Creates vouchers, customer_vouchers, product_variants, orders, and order_items tables

-- 1. Product Variants
CREATE TABLE IF NOT EXISTS product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  sku VARCHAR(100),
  price_inr NUMERIC(10,2),
  coin_price INTEGER DEFAULT 0,
  inventory_stock INTEGER NOT NULL DEFAULT 50,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id);

-- 2. Vouchers definition table
CREATE TABLE IF NOT EXISTS vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  partner VARCHAR(100) NOT NULL,
  discount_type VARCHAR(20) NOT NULL DEFAULT 'PERCENTAGE', -- 'PERCENTAGE', 'FLAT_INR', 'FREE_PASS'
  discount_value NUMERIC(10,2) NOT NULL DEFAULT 0,
  min_order_inr NUMERIC(10,2) NOT NULL DEFAULT 0,
  coin_cost INTEGER NOT NULL DEFAULT 50,
  validity_days INTEGER NOT NULL DEFAULT 30,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vouchers_status ON vouchers(status);

-- 3. Customer Unlocked Vouchers (Entitlements)
CREATE TABLE IF NOT EXISTS customer_vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  voucher_id UUID NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'UNLOCKED', -- 'UNLOCKED', 'REDEEMED', 'EXPIRED'
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  redeemed_at TIMESTAMPTZ,
  order_id UUID,
  idempotency_key VARCHAR(255) UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_vouchers_cust_status ON customer_vouchers(customer_id, status);

-- 4. Orders table
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number VARCHAR(50) UNIQUE NOT NULL,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  subtotal_inr NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount_inr NUMERIC(10,2) NOT NULL DEFAULT 0,
  delivery_fee_inr NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_inr NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_coins INTEGER NOT NULL DEFAULT 0,
  voucher_id UUID REFERENCES vouchers(id),
  voucher_code VARCHAR(50),
  payment_method VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  payment_status VARCHAR(50) NOT NULL DEFAULT 'PENDING_PAYMENT', -- 'PAID', 'PENDING_PAYMENT', 'FAILED', 'CANCELLED'
  order_status VARCHAR(50) NOT NULL DEFAULT 'CONFIRMED', -- 'CONFIRMED', 'PROCESSING', 'DISPATCHED', 'DELIVERED', 'CANCELLED'
  shipping_name VARCHAR(255) NOT NULL,
  shipping_phone VARCHAR(50) NOT NULL,
  shipping_address TEXT NOT NULL,
  shipping_city VARCHAR(100) NOT NULL,
  shipping_pincode VARCHAR(20) NOT NULL,
  payment_reference VARCHAR(255),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);

-- 5. Order Items table
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  title VARCHAR(255) NOT NULL,
  brand VARCHAR(100),
  variant_id UUID REFERENCES product_variants(id),
  variant_name VARCHAR(100),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price_inr NUMERIC(10,2) NOT NULL DEFAULT 0,
  unit_coins INTEGER NOT NULL DEFAULT 0,
  total_price_inr NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_coins INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- 6. Seed Default Vouchers
INSERT INTO vouchers (code, title, description, partner, discount_type, discount_value, min_order_inr, coin_cost, validity_days, status)
VALUES
  ('PURE50OFF', '50% Off Annual Maintenance & Filter Care', 'Applicable on comprehensive home maintenance services across certified technicians.', 'PureCare Network', 'PERCENTAGE', 50.00, 500.00, 50, 30, 'ACTIVE'),
  ('FREEHOMEPASS', 'Complimentary Doorstep Home Diagnostic Pass', 'Includes complete household inspection by a certified technician at zero charge.', 'GharSure Home Services', 'FREE_PASS', 100.00, 0.00, 25, 60, 'ACTIVE'),
  ('GHARCARE300', '₹300 Off Whole-House Care Kit', 'Redeemable against any home appliance or kitchen care installation package.', 'GharSure Essentials', 'FLAT_INR', 300.00, 1000.00, 75, 45, 'ACTIVE')
ON CONFLICT (code) DO NOTHING;
