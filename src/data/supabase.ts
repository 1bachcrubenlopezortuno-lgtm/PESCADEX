import { createClient } from '@supabase/supabase-js';

// La URL y la clave publicable de Supabase son públicas por diseño (viajan dentro de la app);
// la seguridad la ponen las reglas RLS de la base de datos y el código de invitación.
// Se pueden sobrescribir con VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.
const DEFAULT_URL = 'https://ejfomymerxcenppcvrai.supabase.co';
const DEFAULT_KEY = 'sb_publishable_LA1xe0Mo1Kw9YO0Y1qyZqA_Zb39NZZs';

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || DEFAULT_URL;
const key = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() || DEFAULT_KEY;

export const supabaseConfigured = Boolean(url && key);

export const supabase = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
});
