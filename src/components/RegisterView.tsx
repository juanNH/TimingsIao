"use client";

import Link from "next/link";
import { AuthPanel } from "@/components/AuthPanel";
import { useAuth } from "@/hooks/useAuth";

export function RegisterView() {
  const auth = useAuth();

  return (
    <main className="page auth-page">
      <section className="auth-page-card" aria-labelledby="register-title">
        <p className="eyebrow">Acceso</p>
        <h1 id="register-title">Crear cuenta</h1>
        <p className="lead">
          Registrate con usuario y contrasena. La cuenta queda pendiente hasta
          que se active desde Supabase.
        </p>

        <AuthPanel
          error={auth.error}
          isActive={auth.isActive}
          loading={auth.loading}
          mode="register"
          notice={auth.notice}
          profile={auth.profile}
          onLogin={auth.signIn}
          onLogout={auth.signOut}
          onRegister={auth.signUp}
        />

        <Link className="auth-link" href="/">
          Volver a timings
        </Link>
      </section>
    </main>
  );
}
