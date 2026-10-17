import { createClient } from '@supabase/supabase-js';

// Force the correct Supabase project if deployment environment variables still reference the old project
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.includes('lhgfzerdekwxppzjngyg')
  ? 'https://xvpebtompjcjfvuzeumo.supabase.co'
  : (import.meta.env.VITE_SUPABASE_URL || 'https://xvpebtompjcjfvuzeumo.supabase.co');

const supabaseKey = import.meta.env.VITE_SUPABASE_URL?.includes('lhgfzerdekwxppzjngyg')
  ? 'sb_publishable_DobBRciIF_Ux15lEhPpOEQ_qvm2LMHf'
  : (import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_DobBRciIF_Ux15lEhPpOEQ_qvm2LMHf');

export const supabase = createClient(supabaseUrl, supabaseKey);

