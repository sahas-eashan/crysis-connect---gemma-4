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
