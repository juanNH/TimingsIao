import { supabase } from "@/lib/supabase";

export type UserProfile = {
  id: string;
  username: string;
  isActive: boolean;
};

type SupabaseProfile = {
  id: string;
  username: string;
  is_active: boolean;
};

function usernameToEmail(username: string) {
  return `${username.trim().toLowerCase()}@timings.local`;
}

function toProfile(profile: SupabaseProfile): UserProfile {
  return {
    id: profile.id,
    username: profile.username,
    isActive: profile.is_active
  };
}

export async function getCurrentProfile() {
  if (!supabase) return null;

  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id,username,is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw error;
  return data ? toProfile(data as SupabaseProfile) : null;
}

export async function login(input: { username: string; password: string }) {
  if (!supabase) throw new Error("Supabase no esta configurado.");

  const { error } = await supabase.auth.signInWithPassword({
    email: usernameToEmail(input.username),
    password: input.password
  });

  if (error) throw error;
  return getCurrentProfile();
}

export async function register(input: { username: string; password: string }) {
  if (!supabase) throw new Error("Supabase no esta configurado.");

  const username = input.username.trim().toLowerCase();
  const { error } = await supabase.auth.signUp({
    email: usernameToEmail(username),
    password: input.password,
    options: {
      data: { username }
    }
  });

  if (error) throw error;
}

export async function logout() {
  if (!supabase) return;
  await supabase.auth.signOut();
}
