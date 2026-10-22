-- Migration: 20261022000000_admin_portal_schema.sql
-- Description: Complete schema for GharSure Admin Portal (RBAC, Surveys, Ledger, Content, Store, Referrals, Buildings, Support, Settings, Audit)

-- 1. Enhance Customers Table for Admin Management
ALTER TABLE customers ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS reward_coins INT NOT NULL DEFAULT 100;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS support_notes TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS household_details JSONB DEFAULT '{}'::jsonb;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS referral_code VARCHAR(30);

-- 2. Admin Users and Roles Table
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('SUPER_ADMIN', 'OPERATIONS_ADMIN', 'CONTENT_MANAGER', 'SUPPORT_ADMIN', 'ANALYST')),
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'INVITED')),
  permissions TEXT[] DEFAULT '{}',
  invited_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role);

-- 3. Admin Sessions Table
CREATE TABLE IF NOT EXISTS admin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  session_token_hash VARCHAR(64) UNIQUE NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(session_token_hash);

-- 4. Extend Audit Events Table
ALTER TABLE audit_events ADD COLUMN IF NOT EXISTS admin_id UUID REFERENCES admin_users(id) ON DELETE SET NULL;
ALTER TABLE audit_events ADD COLUMN IF NOT EXISTS actor_type VARCHAR(30) DEFAULT 'CUSTOMER';
CREATE INDEX IF NOT EXISTS idx_audit_events_admin ON audit_events(admin_id, created_at DESC);

-- 5. Surveys, Questions, Responses
CREATE TABLE IF NOT EXISTS surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL DEFAULT 'Water Quality',
  language VARCHAR(10) NOT NULL DEFAULT 'en',
  estimated_duration_min INT NOT NULL DEFAULT 5,
  internal_objective TEXT,
  sponsor_details TEXT,
  target_audience JSONB DEFAULT '{}'::jsonb,
  reward_coins INT NOT NULL DEFAULT 50,
  response_quota INT NOT NULL DEFAULT 500,
  responses_count INT NOT NULL DEFAULT 0,
  status VARCHAR(30) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'TESTING', 'APPROVED', 'SCHEDULED', 'PUBLISHED', 'PAUSED', 'CLOSED', 'ARCHIVED')),
  version INT NOT NULL DEFAULT 1,
  created_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_surveys_status ON surveys(status);

CREATE TABLE IF NOT EXISTS survey_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  order_num INT NOT NULL,
  question_text TEXT NOT NULL,
  question_type VARCHAR(50) NOT NULL CHECK (question_type IN ('SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TEXT', 'RATING', 'BOOLEAN')),
  options JSONB DEFAULT '[]'::jsonb,
  is_required BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_survey_questions_survey ON survey_questions(survey_id, order_num ASC);

CREATE TABLE IF NOT EXISTS survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  status VARCHAR(30) NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('STARTED', 'COMPLETED', 'SCREENED_OUT')),
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  reward_issued BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_survey_customer UNIQUE (survey_id, customer_id)
);

CREATE INDEX IF NOT EXISTS idx_survey_responses_survey ON survey_responses(survey_id);
CREATE INDEX IF NOT EXISTS idx_survey_responses_customer ON survey_responses(customer_id);

-- 6. Immutable Coin Ledger Table
CREATE TABLE IF NOT EXISTS coin_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  amount INT NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('SURVEY_REWARD', 'REFERRAL_BONUS', 'STORE_REDEMPTION', 'MANUAL_ADJUSTMENT', 'WELCOME_BONUS')),
  description TEXT NOT NULL,
  idempotency_key VARCHAR(128) UNIQUE NOT NULL,
  admin_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coin_tx_customer ON coin_transactions(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_coin_tx_idempotency ON coin_transactions(idempotency_key);

-- 7. Products and Scorecards Table
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  brand VARCHAR(100) NOT NULL,
  summary TEXT,
  specifications JSONB DEFAULT '{}'::jsonb,
  price_inr NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  score NUMERIC(3,1) DEFAULT NULL,
  scorecard_details JSONB DEFAULT '{}'::jsonb,
  evidence_sources JSONB DEFAULT '[]'::jsonb,
  status VARCHAR(30) NOT NULL DEFAULT 'PUBLISHED' CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);

-- 8. Store Items and Trial Campaigns
CREATE TABLE IF NOT EXISTS trial_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  coin_cost INT NOT NULL DEFAULT 0,
  inventory_stock INT NOT NULL DEFAULT 100,
  redeemed_count INT NOT NULL DEFAULT 0,
  status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PAUSED', 'EXHAUSTED', 'CLOSED')),
  partner_name VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trials_status ON trial_campaigns(status);

-- 9. Referral Attributions Table
CREATE TABLE IF NOT EXISTS referral_attributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  referee_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  referral_code VARCHAR(50) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'QUALIFIED', 'REWARDED', 'REJECTED')),
  reward_coins INT NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  qualified_at TIMESTAMPTZ,
  CONSTRAINT uq_referral_referee UNIQUE (referee_id)
);

CREATE INDEX IF NOT EXISTS idx_referral_referrer ON referral_attributions(referrer_id);

-- 10. Buildings and Observations Table
CREATE TABLE IF NOT EXISTS buildings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  pincode VARCHAR(10) NOT NULL,
  city VARCHAR(100) NOT NULL,
  locality VARCHAR(255) NOT NULL,
  total_units INT DEFAULT NULL,
  water_source VARCHAR(100),
  avg_tds INT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_buildings_pincode ON buildings(pincode);
CREATE INDEX IF NOT EXISTS idx_buildings_city ON buildings(city);

CREATE TABLE IF NOT EXISTS building_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('WATER', 'DAMPNESS', 'BROADBAND', 'APPLIANCE')),
  observation_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  moderation_status VARCHAR(30) NOT NULL DEFAULT 'APPROVED' CHECK (moderation_status IN ('PENDING', 'APPROVED', 'REJECTED')),
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_observations_building ON building_observations(building_id);
CREATE INDEX IF NOT EXISTS idx_observations_status ON building_observations(moderation_status);

-- 11. Notification Campaigns Table
CREATE TABLE IF NOT EXISTS notification_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  channel VARCHAR(50) NOT NULL CHECK (channel IN ('WHATSAPP', 'IN_APP', 'SMS')),
  template_name VARCHAR(100) NOT NULL,
  body_text TEXT NOT NULL,
  target_filter JSONB DEFAULT '{}'::jsonb,
  status VARCHAR(30) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SENT', 'SCHEDULED', 'FAILED')),
  sent_count INT NOT NULL DEFAULT 0,
  created_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. Support Tickets Table
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number VARCHAR(50) UNIQUE NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  subject VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
  status VARCHAR(30) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')),
  assigned_to UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  notes JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_customer ON support_tickets(customer_id);

-- 13. System Settings Table
CREATE TABLE IF NOT EXISTS system_settings (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. Enable Row Level Security (RLS) on all administrative tables
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE coin_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE trial_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_attributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE building_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Note: In Supabase, the backend server using the postgres connection string or service role bypasses RLS.
-- By enabling RLS without public anon policies, direct client-side anon/authenticated access is securely forbidden.

-- 15. Initial Super Admin Bootstrap (Password: GharSureAdmin@2026!)
INSERT INTO admin_users (email, full_name, password_hash, role, status)
VALUES (
  'admin@gharsure.com',
  'GharSure Super Admin',
  'a8f3b2c1d0e9f8a7b6c5d4e3f2a1b0c9:62fece060e9fc2df3aaa55fbf124b9c6cc1e403ecd6153718cee75d47a6809fbbd8484b06d747510017c8743dc833e80c6f30da8b9ff0e31d8fc66abae93ce21',
  'SUPER_ADMIN',
  'ACTIVE'
)
ON CONFLICT (email) DO NOTHING;

-- 16. Default System Settings
INSERT INTO system_settings (key, value, description)
VALUES 
  ('survey_defaults', '{"default_reward_coins": 50, "default_response_quota": 500, "allow_anonymous": false}'::jsonb, 'Global survey configurations'),
  ('reward_rules', '{"signup_bonus_coins": 100, "referral_bonus_coins": 100, "min_redemption_coins": 50}'::jsonb, 'Platform coin emission and redemption rules'),
  ('feature_flags', '{"enable_referrals": true, "enable_store_trials": true, "enable_building_intel": true}'::jsonb, 'Runtime feature toggles'),
  ('content_moderation', '{"require_review_for_observations": true}'::jsonb, 'Community content moderation policies')
ON CONFLICT (key) DO NOTHING;

-- 17. Seed Initial Verified Products (GharSure Scorecard Verified)
INSERT INTO products (title, category, brand, summary, specifications, price_inr, score, scorecard_details, evidence_sources, status)
VALUES 
  (
    'Eureka Forbes Aquaguard Ritz RO+UV+MTDS',
    'Water Purifiers',
    'Eureka Forbes',
    'Active Copper & Zinc technology with multi-stage mineral protection tested for Cauvery and Borewell hardness.',
    '{"stages": 8, "capacity_litres": 5.5, "purification_type": "RO + UV + MTDS", "warranty_years": 1}'::jsonb,
    14499.00,
    8.6,
    '{"safety_score": 9.0, "filter_life_score": 8.2, "serviceability_score": 8.5, "noise_score": 8.7}'::jsonb,
    '[{"source": "GharSure Lab Testing Batch #2026-W1", "type": "LAB_VERIFIED"}, {"source": "BIS IS 10500 Compliant", "type": "REGULATORY"}]'::jsonb,
    'PUBLISHED'
  ),
  (
    'HM Digital TDS-3 Handheld Water TDS Meter',
    'Testing Equipment',
    'HM Digital',
    'Reliable digital tester calibrated to 342 ppm NaCl standard for instant household water TDS checks.',
    '{"range_ppm": "0-9990", "accuracy_pct": 2, "battery_type": "2x 1.5V button cell"}'::jsonb,
    599.00,
    9.1,
    '{"accuracy_score": 9.4, "build_score": 8.8, "ease_of_use": 9.2}'::jsonb,
    '[{"source": "Direct Laboratory Standard Calibration Test", "type": "LAB_VERIFIED"}]'::jsonb,
    'PUBLISHED'
  ),
  (
    'Bosch 7 kg 5 Star Inverter Touch Control Front Load Washing Machine',
    'Appliances',
    'Bosch',
    'Anti-Tangle program with EcoSilence Drive motor engineered for hard water wash performance.',
    '{"capacity_kg": 7.0, "energy_rating": "5 Star", "max_spin_speed": 1200, "inverter": true}'::jsonb,
    32990.00,
    8.9,
    '{"cleaning_efficiency": 9.1, "hard_water_resilience": 8.7, "energy_efficiency": 9.2, "motor_durability": 9.0}'::jsonb,
    '[{"source": "100-Wash Hard Water Accelerated Longevity Test", "type": "FIELD_VERIFIED"}]'::jsonb,
    'PUBLISHED'
  )
ON CONFLICT DO NOTHING;

-- 18. Seed Initial Trial Campaigns
INSERT INTO trial_campaigns (title, description, coin_cost, inventory_stock, redeemed_count, status, partner_name)
VALUES
  (
    'Zero-Cost Water Hardness Test Strip Kit',
    'Claim 5 precision test strips to measure calcium carbonate and total hardness in your tap water.',
    0,
    250,
    18,
    'ACTIVE',
    'GharSure Community Lab'
  ),
  (
    'Appliance Descaling Starter Pack (2x 100g)',
    'Specially formulated descaler for electric kettles, coffee makers, and washing machine drums.',
    50,
    150,
    7,
    'ACTIVE',
    'EcoClean Labs'
  )
ON CONFLICT DO NOTHING;

-- 19. Seed Initial Building Intelligence Hubs
INSERT INTO buildings (name, pincode, city, locality, total_units, water_source, avg_tds)
VALUES
  ('Prestige Shantiniketan', '560048', 'Bengaluru', 'Whitefield', 3002, 'Cauvery + Borewell Blend', 340),
  ('Sobha Dream Acres', '560087', 'Bengaluru', 'Panathur / Balagere', 6500, 'Borewell + Private Tankers', 680),
  ('Brigade Gateway', '560055', 'Bengaluru', 'Rajajinagar / Malleshwaram', 1255, 'Cauvery Municipal Water', 145)
ON CONFLICT DO NOTHING;

-- 20. Seed Initial Form-based Survey
INSERT INTO surveys (
  survey_id,
  title,
  description,
  category,
  language,
  estimated_duration_min,
  internal_objective,
  sponsor_details,
  reward_coins,
  response_quota,
  status,
  version
)
VALUES (
  'SURV-WATER-01',
  'Bengaluru Tap & RO Water Quality Experience',
  'Help us benchmark drinking water hardness, TDS levels, and purifier maintenance costs across apartments in Bengaluru.',
  'Water Quality',
  'en',
  4,
  'Collect ground truth TDS and purifier maintenance costs to build the 2026 Water Vulnerability Index.',
  'GharSure Urban Labs',
  50,
  1000,
  'PUBLISHED',
  1
)
ON CONFLICT (survey_id) DO NOTHING;

-- Add Survey Questions for SURV-WATER-01
DO $$
DECLARE
  v_survey_id UUID;
BEGIN
  SELECT id INTO v_survey_id FROM surveys WHERE survey_id = 'SURV-WATER-01';
  IF v_survey_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM survey_questions WHERE survey_id = v_survey_id) THEN
      INSERT INTO survey_questions (survey_id, order_num, question_text, question_type, options, is_required)
      VALUES
        (v_survey_id, 1, 'What is the primary source of water supply in your home?', 'SINGLE_CHOICE', '["Cauvery (Municipal Supply)", "Borewell", "Private Water Tankers", "Mixed / Varies by Season"]'::jsonb, true),
        (v_survey_id, 2, 'Do you currently use a water purifier for drinking?', 'SINGLE_CHOICE', '["Yes, RO + UV", "Yes, UV only / Gravity filter", "No purifier, we boil water", "Buy 20L water cans"]'::jsonb, true),
        (v_survey_id, 3, 'Have you noticed white mineral scaling or stains on bathroom tiles and taps?', 'SINGLE_CHOICE', '["Severe scaling", "Mild scaling", "None observed", "Not sure"]'::jsonb, true),
        (v_survey_id, 4, 'How often do you replace water purifier filters or membranes?', 'SINGLE_CHOICE', '["Every 6 months or less", "Once a year", "Only when water tastes bad or purifier beeps", "Never / Just installed"]'::jsonb, false),
        (v_survey_id, 5, 'If you know your incoming tap water TDS (ppm), enter the approximate reading:', 'TEXT', '[]'::jsonb, false);
    END IF;
  END IF;
END $$;
