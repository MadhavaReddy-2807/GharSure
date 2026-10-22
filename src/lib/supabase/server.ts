import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getEnv } from "../env";
import { Database } from "./types";

let supabaseServerClient: SupabaseClient<Database> | null = null;

export function getSupabaseServerClient(): SupabaseClient<Database> {
  if (supabaseServerClient) return supabaseServerClient;

  const env = getEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-gharsure.supabase.co";
  const key = env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-service-role-key";

  supabaseServerClient = createClient<Database>(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  return supabaseServerClient;
}
