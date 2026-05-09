import { createClient } from '@supabase/supabase-js';

// MAIN APP SUPABASE (Configurable via ENV) - MUST set these in environment variables for the main project
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

// NOTICE BOX SUPABASE (Dedicated project - ALWAYS hardcoded as per user instructions)
const NOTICE_BOX_URL = "https://xzgozwylnfpcicdipjhw.supabase.co";
const NOTICE_BOX_KEY = "sb_publishable_mjndYPAxtmjjulEtV3brkA_CPhU4BA_";

export const noticeBoxSupabase = createClient(NOTICE_BOX_URL, NOTICE_BOX_KEY);
