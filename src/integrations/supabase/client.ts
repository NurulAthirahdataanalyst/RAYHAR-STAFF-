import { createClient } from "@supabase/supabase-js";

// Force the correct Supabase project because Vercel has the wrong environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.includes("lhgfzerdekwxppzjngyg") 
  ? "https://xvpebtompjcjfvuzeumo.supabase.co" 
  : (import.meta.env.VITE_SUPABASE_URL || "https://xvpebtompjcjfvuzeumo.supabase.co");

const supabaseAnonKey = import.meta.env.VITE_SUPABASE_URL?.includes("lhgfzerdekwxppzjngyg") 
  ? "sb_publishable_DobBRciIF_Ux15lEhPpOEQ_qvm2LMHf" 
  : (import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_DobBRciIF_Ux15lEhPpOEQ_qvm2LMHf");

export const supabase = createClient(supabaseUrl, supabaseAnonKey);