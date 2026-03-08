// ============================================
// SUPABASE KONFIGURATION
// Byt ut värdena nedan med dina egna från:
// Supabase Dashboard → Settings → API
// ============================================

const SUPABASE_URL = 'https://ctynycmdwyiokjebplbl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN0eW55Y21kd3lpb2tqZWJwbGJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMDA2MTksImV4cCI6MjA4ODU3NjYxOX0.bNl5eolqeFb6EV-p_pUe56yC128xDmUWX6x-FU2HLyY';

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
