import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

export type PaginaClient = SupabaseClient<Database>;

export type SupabaseEnv = {
  url?: string;
  anonKey?: string;
};

export function isSupabaseConfigured(env: SupabaseEnv): boolean {
  const url = env.url?.trim() ?? "";
  const anon = env.anonKey?.trim() ?? "";
  return Boolean(
    url &&
      anon &&
      !url.includes("YOUR_PROJECT") &&
      anon !== "your_anon_key" &&
      url.startsWith("http"),
  );
}

export function createPaginaClient(env: SupabaseEnv): PaginaClient {
  const url = env.url?.trim() || "https://placeholder.supabase.co";
  const anon = env.anonKey?.trim() || "placeholder-anon-key";
  return createClient<Database>(url, anon, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}
