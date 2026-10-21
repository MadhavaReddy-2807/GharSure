import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getEnv } from "../env";
import { Database } from "./types";

let supabaseServerClient: SupabaseClient<Database> | null = null;

export function getSupabaseServerClient(): SupabaseClient<Database> {
  if (supabaseServerClient) return supabaseServerClient;

  const env = getEnv();
  supabaseServerClient = createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
  return supabaseServerClient;
}
