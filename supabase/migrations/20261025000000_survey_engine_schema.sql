-- Migration: 20261025000000_survey_engine_schema.sql
-- Description: Advanced Survey Engine Schema (Static & Decision-Based Surveys, Version Snapshots, 11+ Question Types, Autosave/Resume, Branching Rules, and Atomic Coin Rewards)

-- 1. Enhance Surveys Table
ALTER TABLE surveys ADD COLUMN IF NOT EXISTS survey_type VARCHAR(30) NOT NULL DEFAULT 'STATIC' CHECK (survey_type IN ('STATIC', 'DECISION_BASED'));
ALTER TABLE surveys ADD COLUMN IF NOT EXISTS allow_resume BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE surveys ADD COLUMN IF NOT EXISTS allow_review BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE surveys ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ;
ALTER TABLE surveys ADD COLUMN IF NOT EXISTS end_date TIMESTAMPTZ;
ALTER TABLE surveys ADD COLUMN IF NOT EXISTS eligibility_rules JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_surveys_type ON surveys(survey_type);

-- 2. Create Survey Versions Table (Immutable Snapshots on Publish)
CREATE TABLE IF NOT EXISTS survey_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  version_num INT NOT NULL,
  snapshot JSONB NOT NULL,
  reward_coins INT NOT NULL DEFAULT 50,
  published_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_survey_version UNIQUE (survey_id, version_num)
);

CREATE INDEX IF NOT EXISTS idx_survey_versions_survey ON survey_versions(survey_id, version_num DESC);
ALTER TABLE survey_versions ENABLE ROW LEVEL SECURITY;

-- 3. Enhance Survey Questions Table
ALTER TABLE survey_questions ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE survey_questions ADD COLUMN IF NOT EXISTS validation_rules JSONB DEFAULT '{}'::jsonb;
ALTER TABLE survey_questions ADD COLUMN IF NOT EXISTS branching_rules JSONB DEFAULT '[]'::jsonb;
ALTER TABLE survey_questions ADD COLUMN IF NOT EXISTS section_name VARCHAR(100);

-- Update check constraint on question_type to support all 11+ required types
ALTER TABLE survey_questions DROP CONSTRAINT IF EXISTS survey_questions_question_type_check;
ALTER TABLE survey_questions ADD CONSTRAINT survey_questions_question_type_check CHECK (
  question_type IN (
    'SINGLE_CHOICE',
    'MULTIPLE_CHOICE',
    'DROPDOWN',
    'SHORT_TEXT',
    'LONG_TEXT',
    'TEXT',
    'NUMBER',
    'YES_NO',
    'BOOLEAN',
    'RATING_SCALE',
    'STAR_RATING',
    'RATING',
    'DATE',
    'MATRIX'
  )
);

-- 4. Enhance Survey Responses / Attempts Table
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS survey_version_id UUID REFERENCES survey_versions(id) ON DELETE SET NULL;
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS current_question_id TEXT;
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS question_path JSONB DEFAULT '[]'::jsonb;
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS last_saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS disqualification_reason TEXT;
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS reward_coins INT NOT NULL DEFAULT 0;
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(128);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'survey_responses_idempotency_key_key'
  ) THEN
    ALTER TABLE survey_responses ADD CONSTRAINT survey_responses_idempotency_key_key UNIQUE (idempotency_key);
  END IF;
END $$;

-- Update check constraint on survey_responses.status
ALTER TABLE survey_responses DROP CONSTRAINT IF EXISTS survey_responses_status_check;
ALTER TABLE survey_responses ADD CONSTRAINT survey_responses_status_check CHECK (
  status IN ('STARTED', 'IN_PROGRESS', 'COMPLETED', 'DISQUALIFIED', 'SCREENED_OUT', 'ABANDONED')
);

CREATE INDEX IF NOT EXISTS idx_survey_responses_status ON survey_responses(status);
CREATE INDEX IF NOT EXISTS idx_survey_responses_idempotency ON survey_responses(idempotency_key);
