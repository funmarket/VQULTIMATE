import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://avdfessrhbsqwlfmbdau.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2ZGZlc3NyaGJzcXdsZm1iZGF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEwMDQzMTUsImV4cCI6MjA1NjU4MDMxNX0.mock_anon_key_placeholder';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});
