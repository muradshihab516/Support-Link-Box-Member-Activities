-- Suggested SQL Schema for Supabase
-- Run this in your Supabase SQL Editor

-- 1. Members Table
CREATE TABLE IF NOT EXISTS members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  member_number INTEGER NOT NULL UNIQUE,
  total_points INTEGER DEFAULT 0,
  last_activity_date DATE,
  current_streak INTEGER DEFAULT 0,
  max_streak INTEGER DEFAULT 0,
  total_syncs INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Audit Trail Table
CREATE TABLE IF NOT EXISTS audit_trail (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL,
  description TEXT,
  admin_name TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Enable RLS (Optional but recommended)
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_trail ENABLE ROW LEVEL SECURITY;

-- Allow public access for now (if you aren't using Supabase Auth yet for rules)
CREATE POLICY "Public Full Access Members" ON members FOR ALL USING (true);
CREATE POLICY "Public Full Access Audit" ON audit_trail FOR ALL USING (true);
