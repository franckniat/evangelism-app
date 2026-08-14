/**
 * Client Supabase de l'application mobile.
 *
 * La clé utilisée ici est publique par nature : la protection des données
 * repose entièrement sur les politiques RLS définies dans
 * `supabase/migrations/`. Ne jamais utiliser la clé secrète côté client.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Configuration Supabase manquante : copiez `.env.example` vers `.env` et renseignez EXPO_PUBLIC_SUPABASE_URL et EXPO_PUBLIC_SUPABASE_ANON_KEY."
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // Pas de session dans l'URL sur mobile (uniquement pertinent sur le web).
    detectSessionInUrl: false,
  },
});
