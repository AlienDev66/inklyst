import type { PaginaClient } from "./client";
import type { Profile } from "./types";

export async function signInWithPassword(
  client: PaginaClient,
  email: string,
  password: string,
) {
  const { data, error } = await client.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  return { session: data.session, user: data.user, error: error?.message ?? null };
}

export async function signUpWithPassword(
  client: PaginaClient,
  email: string,
  password: string,
  displayName = "",
) {
  const { data, error } = await client.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: { display_name: displayName.trim() },
    },
  });
  return { session: data.session, user: data.user, error: error?.message ?? null };
}

export async function signOut(client: PaginaClient) {
  const { error } = await client.auth.signOut();
  return { error: error?.message ?? null };
}

export async function getSession(client: PaginaClient) {
  const { data, error } = await client.auth.getSession();
  return { session: data.session, error: error?.message ?? null };
}

export async function fetchProfile(
  client: PaginaClient,
  userId: string,
): Promise<Profile | null> {
  const { data, error } = await client
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) return null;
  return data;
}

export async function updateProfileName(
  client: PaginaClient,
  userId: string,
  displayName: string,
): Promise<{ profile: Profile | null; error: string | null }> {
  const name = displayName.trim();
  if (!name) return { profile: null, error: "O nome não pode ficar vazio." };
  const { data, error } = await client
    .from("profiles")
    .upsert({ id: userId, display_name: name })
    .select("*")
    .single();
  if (error) return { profile: null, error: error.message };
  await client.auth.updateUser({ data: { display_name: name } });
  return { profile: data, error: null };
}

export type OnboardingIntent = "read" | "write" | "both";
export type PreferredSpace = "reader" | "studio";

export async function updateOnboardingIntent(
  client: PaginaClient,
  userId: string,
  intent: OnboardingIntent,
): Promise<{ profile: Profile | null; error: string | null }> {
  const preferred_space: PreferredSpace = intent === "write" ? "studio" : "reader";
  const { data, error } = await client
    .from("profiles")
    .update({ onboarding_intent: intent, preferred_space })
    .eq("id", userId)
    .select("*")
    .single();
  if (error) return { profile: null, error: error.message };
  return { profile: data, error: null };
}

export async function updatePreferredSpace(
  client: PaginaClient,
  userId: string,
  space: PreferredSpace,
): Promise<{ profile: Profile | null; error: string | null }> {
  const { data, error } = await client
    .from("profiles")
    .update({ preferred_space: space })
    .eq("id", userId)
    .select("*")
    .single();
  if (error) return { profile: null, error: error.message };
  return { profile: data, error: null };
}
