import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://xvpebtompjcjfvuzeumo.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_DobBRciIF_Ux15lEhPpOEQ_qvm2LMHf';

export const supabase = createClient(supabaseUrl, supabaseKey);
