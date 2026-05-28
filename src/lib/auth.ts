import { supabase } from "@/lib/supabase";

export type UserProfile = {
  id: string;
  username: string;
  isActive: boolean;
};

type SupabaseAppUser = {
  username: string;
  is_active: boolean;
};

const sessionKey = "timings-iao-user";

function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

function toProfile(user: SupabaseAppUser): UserProfile {
  return {
    id: user.username,
    username: user.username,
    isActive: user.is_active
  };
}

function readStoredUsername() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(sessionKey);
}

function writeStoredUsername(username: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(sessionKey, username);
}

function clearStoredUsername() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(sessionKey);
}

export function getSessionUsername() {
  return readStoredUsername();
}

export async function getUserByUsername(username: string) {
  if (!supabase) throw new Error("Supabase no esta configurado.");

  const { data, error } = await supabase.rpc("get_app_user", {
    p_username: normalizeUsername(username)
  });

  if (error) throw error;
  const user = Array.isArray(data) ? data[0] : data;
  return user ? toProfile(user as SupabaseAppUser) : null;
}

export async function getCurrentProfile() {
  const username = readStoredUsername();
  if (!username) return null;

  try {
    return await getUserByUsername(username);
  } catch {
    clearStoredUsername();
    return null;
  }
}

export async function login(input: { username: string }) {
  const username = normalizeUsername(input.username);
  const profile = await getUserByUsername(username);

  if (!profile) {
    throw new Error("El usuario no existe. Primero registralo.");
  }

  writeStoredUsername(username);
  return profile;
}

export async function register(input: { username: string }) {
  if (!supabase) throw new Error("Supabase no esta configurado.");

  const username = normalizeUsername(input.username);
  const { error } = await supabase.from("app_users").insert({ username });

  if (error) {
    if (error.code === "23505") {
      throw new Error("Ese usuario ya esta registrado.");
    }

    throw error;
  }

  writeStoredUsername(username);
  return getUserByUsername(username);
}

export async function logout() {
  clearStoredUsername();
  await supabase?.auth.signOut();
}
