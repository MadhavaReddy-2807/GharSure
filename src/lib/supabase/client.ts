import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getEnv } from "../env";
import { Database } from "./types";

let supabaseClient: SupabaseClient<Database> | null = null;

export function getSupabaseBrowserClient(): SupabaseClient<Database> {
  if (supabaseClient) return supabaseClient;

  const env = getEnv();
  supabaseClient = createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  return supabaseClient;
}
