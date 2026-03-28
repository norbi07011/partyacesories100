import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

if (!hasSupabaseConfig) {
  console.warn('Missing Supabase environment variables. Running in local-only mode.');
}

export const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl, supabaseAnonKey)
  : (null as unknown as ReturnType<typeof createClient>);

// Track if Supabase is reachable to avoid spamming console with errors
let isSupabaseReachable: boolean | null = null;
let lastCheck = 0;
const CHECK_INTERVAL = 60000; // Re-check every 60 seconds

export const checkSupabaseConnection = async (): Promise<boolean> => {
  if (!hasSupabaseConfig) {
    isSupabaseReachable = false;
    return false;
  }

  const now = Date.now();
  if (isSupabaseReachable !== null && now - lastCheck < CHECK_INTERVAL) {
    return isSupabaseReachable;
  }
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'apikey': supabaseAnonKey,
      }
    });
    
    clearTimeout(timeoutId);
    isSupabaseReachable = response.ok || response.status === 400; // 400 is expected without table
    lastCheck = now;
    
    if (!isSupabaseReachable) {
      console.warn('Supabase is not reachable. Using local data.');
    }
    
    return isSupabaseReachable;
  } catch {
    isSupabaseReachable = false;
    lastCheck = now;
    console.warn('Supabase connection failed. Using local data.');
    return false;
  }
};

export const isSupabaseAvailable = () => isSupabaseReachable;
