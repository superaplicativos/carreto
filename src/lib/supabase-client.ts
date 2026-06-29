/**
 * Supabase client (browser-side) — para Realtime subscriptions.
 *
 * Em produção, definir nas env vars da Vercel:
 *   NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT_REF].supabase.co
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
 *
 * Pegar em: Supabase Dashboard → Project Settings → API
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseAnonKey) {
    if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
      console.warn(
        "Supabase não configurado. Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY. Realtime desativado — usando polling."
      );
    }
    return null;
  }
  if (!client) {
    client = createClient(supabaseUrl, supabaseAnonKey, {
      realtime: {
        params: { eventsPerSecond: 5 },
      },
    });
  }
  return client;
}

export const isRealtimeEnabled = Boolean(supabaseUrl && supabaseAnonKey);
