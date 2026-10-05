const SUPABASE_URL = "https://pisiucneupokktddjhdo.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_sp_LM6NUEWPY6uemrzbmpw_s2PMh9Kn";

window.supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);