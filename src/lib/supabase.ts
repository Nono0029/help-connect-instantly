import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://tdymtslljytdihkblvwu.supabase.co";
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkeW10c2xsanl0ZGloa2Jsdnd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwOTQyMzgsImV4cCI6MjA5MTY3MDIzOH0.nWLKkZ8_0m3TFXPQs2VRgRpkUmM4ZP8PUPyRIVyWlis";

export const supabase = createClient(supabaseUrl, supabaseKey);
