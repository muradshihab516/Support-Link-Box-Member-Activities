-- SQL Schema for Support Link Box - Run in Supabase SQL Editor

-- 1. Members Table
CREATE TABLE members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    display_name TEXT,
    member_number SERIAL UNIQUE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'warning', 'inactive', 'archived')),
    level TEXT DEFAULT 'Bronze' CHECK (level IN ('Bronze', 'Silver', 'Gold', 'Diamond')),
    total_points INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    total_active_days INTEGER DEFAULT 0,
    last_active_date DATE,
    consecutive_inactive_days INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Activity Logs Table
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID REFERENCES members(id) ON DELETE CASCADE,
    activity_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT false,
    points_earned INTEGER DEFAULT 0,
    submitted_by UUID, -- Supabase Auth User ID
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Admin Profiles
CREATE TABLE admin_profiles (
    id UUID PRIMARY KEY, -- Matches Supabase Auth user ID
    email TEXT,
    display_name TEXT,
    role TEXT DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Audit Trail
CREATE TABLE audit_trail (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID,
    admin_name TEXT,
    action TEXT,
    entity_type TEXT,
    description TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Badges
CREATE TABLE badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID REFERENCES members(id) ON DELETE CASCADE,
    badge_type TEXT,
    badge_name TEXT,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (Row Level Security) - Basic setup
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_trail ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;

-- Governance Policies (simplified for development)
-- Allow authenticated admins to read everything
CREATE POLICY "Admins can read all" ON members FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can read all" ON activity_logs FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can read all" ON admin_profiles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can read all" ON audit_trail FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can read all" ON badges FOR SELECT USING (auth.role() = 'authenticated');

-- Allow write operations for authenticated users (further hardening recommended for production)
CREATE POLICY "Admins can insert" ON members FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Admins can update" ON members FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can insert log" ON activity_logs FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Admins can insert audit" ON audit_trail FOR INSERT WITH CHECK (auth.role() = 'authenticated');
