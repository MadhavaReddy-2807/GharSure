import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getEnv } from "../env";
import { Database } from "./types";

let supabaseClient: SupabaseClient<Database> | null = null;

export function getSupabaseBrowserClient(): SupabaseClient<Database> {
  if (supabaseClient) return supabaseClient;

  const env = getEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-gharsure.supabase.co";
  const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

  supabaseClient = createClient<Database>(url, key);
  return supabaseClient;
}
