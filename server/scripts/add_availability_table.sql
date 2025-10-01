-- Add to schema.sql
CREATE TABLE IF NOT EXISTS member_availability (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('available', 'unavailable', 'undecided')),
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, effective_date)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_member_availability_user_id ON member_availability(user_id);
CREATE INDEX IF NOT EXISTS idx_member_availability_effective_date ON member_availability(effective_date);
