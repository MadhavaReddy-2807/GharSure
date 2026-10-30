-- Migration: Admin-Controlled Platform Schema
-- Adds merchandising controls, listing strike-off, file upload activities, quick polls, and home banners/sections

-- 1. Extend products table with merchandising and strike-off controls
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_hot_pick BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_recommended BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_new_arrival BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_best_seller BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5,2) DEFAULT 0.00;
ALTER TABLE products ADD COLUMN IF NOT EXISTS display_order INT DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS highlight_start_date TIMESTAMPTZ;
ALTER TABLE products ADD COLUMN IF NOT EXISTS highlight_end_date TIMESTAMPTZ;
ALTER TABLE products ADD COLUMN IF NOT EXISTS strike_off_reason TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS struck_off_at TIMESTAMPTZ;

-- Allow status to include 'STRUCK_OFF'
-- If there's an existing check constraint on products.status, drop and recreate it
DO $$
BEGIN
  ALTER TABLE products DROP CONSTRAINT IF EXISTS products_status_check;
  ALTER TABLE products ADD CONSTRAINT products_status_check 
    CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED', 'STRUCK_OFF'));
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- 2. File Activities & User Submissions
CREATE TABLE IF NOT EXISTS file_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  instructions TEXT,
  document_type VARCHAR(100) NOT NULL DEFAULT 'TDS_REPORT',
  accepted_formats TEXT[] DEFAULT ARRAY['image/jpeg', 'image/png', 'application/pdf', 'image/webp'],
  max_file_size_bytes BIGINT DEFAULT 10485760, -- 10MB
  max_files INT DEFAULT 1,
  coin_reward INT NOT NULL DEFAULT 50,
  approval_required BOOLEAN DEFAULT TRUE,
  status VARCHAR(50) NOT NULL DEFAULT 'PUBLISHED' CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS file_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES file_activities(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN ('SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'REWARD_CREDITED')),
  rejection_reason TEXT,
  reviewer_notes TEXT,
  reviewed_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  reward_coins_awarded INT DEFAULT 0,
  reward_transaction_id UUID REFERENCES coin_transactions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_file_submissions_customer ON file_submissions(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_file_submissions_activity ON file_submissions(activity_id, status);

-- 3. Quick Polls & Responses
CREATE TABLE IF NOT EXISTS quick_polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  question TEXT NOT NULL,
  poll_type VARCHAR(50) NOT NULL DEFAULT 'SINGLE_CHOICE' CHECK (poll_type IN ('SINGLE_CHOICE', 'MULTIPLE_CHOICE')),
  coin_reward INT NOT NULL DEFAULT 15,
  status VARCHAR(50) NOT NULL DEFAULT 'PUBLISHED' CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quick_poll_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES quick_polls(id) ON DELETE CASCADE,
  option_text VARCHAR(255) NOT NULL,
  display_order INT DEFAULT 0,
  vote_count INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS quick_poll_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES quick_polls(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  selected_option_ids UUID[] NOT NULL,
  coins_awarded INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_customer_poll UNIQUE (poll_id, customer_id)
);

CREATE INDEX IF NOT EXISTS idx_quick_poll_responses_customer ON quick_poll_responses(customer_id);

-- 4. Home Page Dynamic Banners & Sections
CREATE TABLE IF NOT EXISTS home_banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  subtitle TEXT,
  desktop_image_url TEXT NOT NULL,
  mobile_image_url TEXT,
  link_url VARCHAR(255) DEFAULT '/store',
  display_order INT DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'PUBLISHED' CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS home_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key VARCHAR(100) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  subtitle TEXT,
  is_visible BOOLEAN DEFAULT TRUE,
  display_order INT DEFAULT 0,
  config JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Expand coin_transactions constraint to also accept FILE_ACTIVITY_REWARD and QUICK_POLL_REWARD
ALTER TABLE coin_transactions DROP CONSTRAINT IF EXISTS coin_transactions_type_check;

ALTER TABLE coin_transactions ADD CONSTRAINT coin_transactions_type_check 
  CHECK (type IN (
    'SURVEY_REWARD',
    'REFERRAL_BONUS',
    'STORE_REDEMPTION',
    'MANUAL_ADJUSTMENT',
    'WELCOME_BONUS',
    'VOUCHER_UNLOCK',
    'ORDER_PURCHASE',
    'FILE_ACTIVITY_REWARD',
    'QUICK_POLL_REWARD'
  ));

-- 6. Seed initial Admin-Managed Activities if empty
INSERT INTO file_activities (title, description, instructions, document_type, coin_reward, status)
SELECT 
  'Upload Your Water Lab / TDS Test Report',
  'Submit your municipal, borewell, or residential water lab test report to earn verified coins.',
  'Upload a clear photo or PDF document showing the test parameters and location name.',
  'TDS_REPORT',
  75,
  'PUBLISHED'
WHERE NOT EXISTS (SELECT 1 FROM file_activities LIMIT 1);

INSERT INTO file_activities (title, description, instructions, document_type, coin_reward, status)
SELECT 
  'Upload Household Appliance Invoice / Warranty Card',
  'Submit your RO purifier, water heater, or washer invoice to register for preventive maintenance reminders.',
  'Invoice or warranty bill must clearly display the brand name and date of purchase.',
  'INVOICE',
  50,
  'PUBLISHED'
WHERE (SELECT count(*) FROM file_activities) = 1;

-- Seed initial Quick Poll if empty
DO $$
DECLARE
  v_poll_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM quick_polls LIMIT 1) THEN
    INSERT INTO quick_polls (title, question, poll_type, coin_reward, status)
    VALUES (
      'Primary Water Source Poll',
      'What is the primary source of water supplied to your apartment or home?',
      'SINGLE_CHOICE',
      15,
      'PUBLISHED'
    ) RETURNING id INTO v_poll_id;

    INSERT INTO quick_poll_options (poll_id, option_text, display_order)
    VALUES 
      (v_poll_id, 'Municipal / Corporation Tap Water (Cauvery, Ganga, etc.)', 1),
      (v_poll_id, 'Deep Borewell Water', 2),
      (v_poll_id, 'Private Tanker Delivery', 3),
      (v_poll_id, 'Mixed / Dual Supply (Tanker + Borewell)', 4);
  END IF;
END $$;

-- Seed default Home Sections if empty
INSERT INTO home_sections (section_key, title, subtitle, is_visible, display_order)
VALUES 
  ('hero_banners', 'Featured Announcements', 'Exclusive platform updates and highlights', true, 1),
  ('hot_picks', 'Trending Hot Picks', 'Curated household essentials hand-picked by GharSure', true, 2),
  ('quick_polls', 'Community Quick Poll', 'Share your perspective and earn instant reward coins', true, 3),
  ('featured_products', 'Featured Equipment & Solutions', 'Lab-verified residential filtration and monitoring', true, 4),
  ('rewards_hub', 'Rewards & Activity Center', 'Earn GharSure coins with surveys and activities', true, 5)
ON CONFLICT (section_key) DO NOTHING;

-- Seed default Home Banner
INSERT INTO home_banners (title, subtitle, desktop_image_url, link_url, display_order, status)
SELECT 
  'Pure Water & Clean Living for Indian Homes',
  'Discover verified water purifiers, smart diagnostics, and trial kits delivered directly to your doorstep.',
  'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=1200&auto=format&fit=crop&q=80',
  '/store',
  1,
  'PUBLISHED'
WHERE NOT EXISTS (SELECT 1 FROM home_banners LIMIT 1);
