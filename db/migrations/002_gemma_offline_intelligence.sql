CREATE TABLE IF NOT EXISTS emergency_sync_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  center GEOGRAPHY(POINT, 4326) NOT NULL,
  radius_km NUMERIC NOT NULL,
  bounds JSONB NOT NULL,
  package_json JSONB NOT NULL,
  generated_by TEXT REFERENCES profiles(id),
  generated_at TIMESTAMPTZ DEFAULT now(),
  valid_until TIMESTAMPTZ,
  checksum TEXT NOT NULL,
  version INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS device_sync_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES profiles(id),
  device_id TEXT NOT NULL,
  last_sync_at TIMESTAMPTZ,
  package_id UUID REFERENCES emergency_sync_packages(id),
  offline_capable BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, device_id)
);

CREATE INDEX IF NOT EXISTS idx_emergency_sync_packages_center ON emergency_sync_packages USING GIST (center);
CREATE INDEX IF NOT EXISTS idx_emergency_sync_packages_generated_at ON emergency_sync_packages (generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_device_sync_status_user_time ON device_sync_status (user_id, last_sync_at DESC);

CREATE TABLE IF NOT EXISTS offline_sos_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  local_id TEXT NOT NULL,
  sender_id TEXT REFERENCES profiles(id),
  payload JSONB NOT NULL,
  status TEXT DEFAULT 'queued',
  created_offline_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (sender_id, local_id)
);

CREATE TABLE IF NOT EXISTS gemma_model_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  model_name TEXT NOT NULL,
  model_version TEXT,
  adapter_version TEXT,
  runtime TEXT,
  offline_mode BOOLEAN,
  data_freshness_minutes INTEGER,
  input_hash TEXT,
  output_hash TEXT,
  status TEXT,
  confidence NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS gemma_eval_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name TEXT NOT NULL,
  adapter_version TEXT,
  eval_suite TEXT NOT NULL,
  json_valid_rate NUMERIC,
  safety_pass_rate NUMERIC,
  hallucination_rate NUMERIC,
  multilingual_score NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE ai_audit_logs
  ADD COLUMN IF NOT EXISTS gemma_model_run_id UUID REFERENCES gemma_model_runs(id);

CREATE INDEX IF NOT EXISTS idx_offline_sos_queue_sender_status ON offline_sos_queue (sender_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gemma_model_runs_action_time ON gemma_model_runs (action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gemma_eval_results_suite_time ON gemma_eval_results (eval_suite, created_at DESC);
