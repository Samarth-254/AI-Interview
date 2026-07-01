-- AI Mock Interview Platform — Initial Schema
-- Run: psql -d mock_interview_db -f migrations/001_init.sql

DO $$ BEGIN
  CREATE TYPE interview_type AS ENUM ('behavioral', 'technical', 'system_design', 'hr_culture_fit');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE session_status AS ENUM ('active', 'completed', 'abandoned');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE speaker_role AS ENUM ('ai', 'candidate');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  job_role VARCHAR(120),
  experience_level VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS interview_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  interview_type interview_type NOT NULL,
  status session_status NOT NULL DEFAULT 'active',
  voice_call_id VARCHAR(255),
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS transcript_entries (
  id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES interview_sessions(id) ON DELETE CASCADE,
  speaker speaker_role NOT NULL,
  content TEXT NOT NULL,
  sequence_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS feedback_reports (
  id SERIAL PRIMARY KEY,
  session_id INTEGER UNIQUE REFERENCES interview_sessions(id) ON DELETE CASCADE,
  overall_score NUMERIC(4,1),
  strengths JSONB,
  weaknesses JSONB,
  detailed_feedback JSONB,
  generated_at TIMESTAMPTZ DEFAULT now()
);

-- LangGraph checkpoint storage keyed by thread_id = sessionId
CREATE TABLE IF NOT EXISTS graph_checkpoints (
  thread_id VARCHAR(255) PRIMARY KEY,
  state JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);
