import { createClient } from '@supabase/supabase-js';

// Retrieve environment variables if available, with provided fallback defaults
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://bfjpsgkbpwvrqmuxhhue.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_MthoV1lDWLb0qqGY8EMi0g_nfP5OlR3';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl.startsWith('https://') &&
  supabaseAnonKey.length > 10
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
