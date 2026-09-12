import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface SupabaseCredentials {
  url: string;
  anonKey: string;
}

let supabaseClient: SupabaseClient | null = null;
let supabaseCredentials: SupabaseCredentials | null = null;

/**
 * Initialize and return the Supabase client
 * This should be called once the config is fetched from /api/config
 */
export const initializeSupabase = (supabaseUrl: string, supabaseAnonKey: string): SupabaseClient => {
  if (!supabaseClient) {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    });
    supabaseCredentials = { url: supabaseUrl, anonKey: supabaseAnonKey };
  }
  return supabaseClient;
};

/**
 * Raw REST credentials, needed for the `keepalive` save issued while the page
 * is unloading (the supabase-js client cannot express that fetch option).
 */
export const getSupabaseCredentials = (): SupabaseCredentials | null => {
  return supabaseCredentials;
};

/**
 * Get the existing Supabase client
 * Throws error if not initialized
 */
export const getSupabase = (): SupabaseClient => {
  if (!supabaseClient) {
    throw new Error('Supabase client not initialized. Call initializeSupabase first.');
  }
  return supabaseClient;
};

/**
 * Check if Supabase is initialized
 */
export const isSupabaseInitialized = (): boolean => {
  return supabaseClient !== null;
};

