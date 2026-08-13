import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";

/**
 * Returns a read-only public Supabase client when local/deployment credentials exist.
 * Only the publishable key is used here; collector writes run in an Edge Function.
 */
export function getSupabaseClient(): SupabaseClient<Database> | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !publishableKey) {
    return null;
  }

  return createClient<Database>(url, publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export function getDataSourceStatus() {
  return getSupabaseClient()
    ? { source: "supabase" as const, configured: true }
    : { source: "mock" as const, configured: false };
}

export async function checkDataSourceHealth() {
  const client = getSupabaseClient();

  if (!client) {
    return { ok: false, source: "mock" as const, configured: false };
  }

  const { error } = await client.from("morphs").select("id", {
    head: true,
    count: "exact",
  });

  return {
    ok: !error,
    source: "supabase" as const,
    configured: true,
    error: error?.message,
  };
}
