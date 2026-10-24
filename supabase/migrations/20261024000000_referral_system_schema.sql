-- Migration: 20261024000000_referral_system_schema.sql
-- Description: End-to-end referral code system, unique code generation, backfill, attribution constraints, and campaign settings.

-- 1. Helper function to generate unique, readable, URL-safe referral codes (GS + 6 chars)
CREATE OR REPLACE FUNCTION generate_unique_referral_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  result TEXT;
  i INT;
  is_unique BOOLEAN := FALSE;
  attempts INT := 0;
BEGIN
  WHILE NOT is_unique AND attempts < 100 LOOP
    attempts := attempts + 1;
    result := 'GS';
    FOR i IN 1..6 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;

    -- Verify uniqueness across customers table
    PERFORM 1 FROM customers WHERE referral_code = result;
    IF NOT FOUND THEN
      is_unique := TRUE;
    END IF;
  END LOOP;

  IF NOT is_unique THEN
    -- Fallback to high-entropy hex if 100 random picks collided
    result := 'GS' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
  END IF;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 2. Backfill existing customers with referral_code if missing
DO $$
DECLARE
  r RECORD;
  new_code TEXT;
BEGIN
  FOR r IN SELECT id FROM customers WHERE referral_code IS NULL LOOP
    new_code := generate_unique_referral_code();
    UPDATE customers SET referral_code = new_code WHERE id = r.id;
  END LOOP;
END $$;

-- 3. Set referral_code column default and enforce NOT NULL & UNIQUE
ALTER TABLE customers ALTER COLUMN referral_code SET DEFAULT generate_unique_referral_code();
ALTER TABLE customers ALTER COLUMN referral_code SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_customers_referral_code'
  ) THEN
    ALTER TABLE customers ADD CONSTRAINT uq_customers_referral_code UNIQUE (referral_code);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_customers_referral_code_upper ON customers(UPPER(referral_code));

-- 4. Enhance referral_attributions schema
ALTER TABLE referral_attributions ADD COLUMN IF NOT EXISTS referrer_reward_coins INT NOT NULL DEFAULT 100;
ALTER TABLE referral_attributions ADD COLUMN IF NOT EXISTS referee_reward_coins INT NOT NULL DEFAULT 100;
ALTER TABLE referral_attributions ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE referral_attributions ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Prevent self-referral via check constraint
ALTER TABLE referral_attributions DROP CONSTRAINT IF EXISTS check_referral_no_self_referral;
ALTER TABLE referral_attributions ADD CONSTRAINT check_referral_no_self_referral CHECK (referrer_id != referee_id);

CREATE INDEX IF NOT EXISTS idx_referral_attributions_code_upper ON referral_attributions(UPPER(referral_code));
CREATE INDEX IF NOT EXISTS idx_referral_attributions_status ON referral_attributions(status);
CREATE INDEX IF NOT EXISTS idx_referral_attributions_referee ON referral_attributions(referee_id);

-- 5. Seed / Update Authoritative Referral Campaign Settings in system_settings
INSERT INTO system_settings (key, value, description)
VALUES (
  'referral_campaign',
  '{
    "is_active": true,
    "referrer_reward_coins": 100,
    "referee_reward_coins": 100,
    "max_referrals_per_customer": 50,
    "qualification_trigger": "PHONE_VERIFIED_AND_ONBOARDED"
  }'::jsonb,
  'Authoritative referral program parameters and reward rules'
)
ON CONFLICT (key) DO UPDATE
SET value = jsonb_set(
  jsonb_set(
    system_settings.value,
    '{is_active}',
    COALESCE(system_settings.value->'is_active', 'true'::jsonb)
  ),
  '{referrer_reward_coins}',
  COALESCE(system_settings.value->'referrer_reward_coins', '100'::jsonb)
),
updated_at = NOW();
