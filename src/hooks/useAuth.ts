"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getCurrentProfile,
  login,
  logout,
  register,
  type UserProfile
} from "@/lib/auth";
import { supabase } from "@/lib/supabase";

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function useAuth() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const refreshProfile = useCallback(async () => {
    const currentProfile = await getCurrentProfile();
    setProfile(currentProfile);
  }, []);

  useEffect(() => {
    let active = true;

    getCurrentProfile()
      .then((currentProfile) => {
        if (!active) return;
        setProfile(currentProfile);
      })
      .catch((authError) => {
        if (!active) return;
        setError(errorMessage(authError, "No se pudo cargar la sesion."));
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    if (!supabase) {
      return () => {
        active = false;
      };
    }

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(() => {
      void refreshProfile();
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [refreshProfile]);

  const signIn = useCallback(async (username: string, password: string) => {
    setError(null);
    setLoading(true);

    try {
      const nextProfile = await login({ username, password });
      setProfile(nextProfile);
    } catch (authError) {
      setError(errorMessage(authError, "No se pudo iniciar sesion."));
    } finally {
      setLoading(false);
    }
  }, []);

  const signUp = useCallback(async (username: string, password: string) => {
    setError(null);
    setLoading(true);

    try {
      await register({ username, password });
      await login({ username, password }).catch(() => null);
      await refreshProfile();
    } catch (authError) {
      setError(errorMessage(authError, "No se pudo registrar la cuenta."));
    } finally {
      setLoading(false);
    }
  }, [refreshProfile]);

  const signOut = useCallback(async () => {
    setError(null);
    setLoading(true);

    try {
      await logout();
      setProfile(null);
    } catch (authError) {
      setError(errorMessage(authError, "No se pudo cerrar sesion."));
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    error,
    isActive: Boolean(profile?.isActive),
    loading,
    profile,
    signIn,
    signOut,
    signUp
  };
}
