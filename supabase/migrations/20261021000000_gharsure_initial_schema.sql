-- GharSure Mobile-First Onboarding Schema
-- Sequential Customer IDs, OTP Challenges, Sessions, and Audit Logging

-- 1. Sequence for sequential, human-readable customer IDs
CREATE SEQUENCE IF NOT EXISTS customer_id_seq START WITH 1 INCREMENT BY 1;

-- 2. Helper function to generate customer_id
CREATE OR REPLACE FUNCTION generate_customer_id()
RETURNS TEXT AS $$
BEGIN
  RETURN 'GH' || lpad(nextval('customer_id_seq')::text, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- 3. Customers Table
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id VARCHAR(16) UNIQUE NOT NULL DEFAULT ('GH' || lpad(nextval('customer_id_seq')::text, 6, '0')),
  auth_user_id UUID UNIQUE,
  phone_e164 VARCHAR(20) UNIQUE NOT NULL,
  phone_verified_at TIMESTAMPTZ,
  full_name VARCHAR(100),
  display_name VARCHAR(50),
  city VARCHAR(100),
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger to prevent client mutation of immutable identity fields (id, customer_id, phone_e164)
CREATE OR REPLACE FUNCTION enforce_customer_immutable_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    NEW.id = OLD.id;
    NEW.customer_id = OLD.customer_id;
    NEW.phone_e164 = OLD.phone_e164;
    NEW.created_at = OLD.created_at;
    NEW.updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_customers_immutable_fields ON customers;
CREATE TRIGGER trg_customers_immutable_fields
BEFORE UPDATE ON customers
FOR EACH ROW
EXECUTE FUNCTION enforce_customer_immutable_fields();

-- 4. OTP Challenges Table
CREATE TABLE IF NOT EXISTS otp_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_e164 VARCHAR(20) NOT NULL,
  otp_hash VARCHAR(255) NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  resend_count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Customer Sessions Table (for active server-side sessions)
CREATE TABLE IF NOT EXISTS customer_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  session_token_hash VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  user_agent TEXT,
  ip_address VARCHAR(45),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Audit & Security Events Table
CREATE TABLE IF NOT EXISTS audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(64) NOT NULL,
  phone_e164 VARCHAR(20),
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  ip_address VARCHAR(45),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Indexes for performance and quick lookups
CREATE INDEX IF NOT EXISTS idx_customers_phone_e164 ON customers(phone_e164);
CREATE INDEX IF NOT EXISTS idx_customers_customer_id ON customers(customer_id);
CREATE INDEX IF NOT EXISTS idx_otp_challenges_phone_created ON otp_challenges(phone_e164, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_sessions_token_hash ON customer_sessions(session_token_hash);
CREATE INDEX IF NOT EXISTS idx_customer_sessions_customer_id ON customer_sessions(customer_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_phone_created ON audit_events(phone_e164, created_at DESC);

-- 8. Row Level Security (RLS)
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

-- Customer Profile RLS Policies:
-- Service role bypasses RLS automatically in Supabase.
-- Direct client access policies for Supabase Auth integration:
DROP POLICY IF EXISTS "Customers can read own profile" ON customers;
CREATE POLICY "Customers can read own profile"
  ON customers FOR SELECT
  USING (
    auth.uid() = auth_user_id 
    OR id::text = current_setting('request.jwt.claim.sub', true)
  );

DROP POLICY IF EXISTS "Customers can update own permitted profile" ON customers;
CREATE POLICY "Customers can update own permitted profile"
  ON customers FOR UPDATE
  USING (
    auth.uid() = auth_user_id 
    OR id::text = current_setting('request.jwt.claim.sub', true)
  )
  WITH CHECK (
    auth.uid() = auth_user_id 
    OR id::text = current_setting('request.jwt.claim.sub', true)
  );

-- Privileged tables (otp_challenges, customer_sessions, audit_events)
-- are accessible ONLY via trusted server logic (service role).
-- Direct anon or authenticated role access is denied by default.
