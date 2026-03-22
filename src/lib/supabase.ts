import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Using untyped client — we cast results in hooks instead
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Single user profile ID (hardcoded for now, single-user app)
export const PROFILE_ID = '00000000-0000-0000-0000-000000000001';
