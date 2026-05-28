"use client";

import Link from "next/link";
import { type ReactNode } from "react";
import { AuthPanel } from "@/components/AuthPanel";
import { useAuth } from "@/hooks/useAuth";

type AuthGateProps = {
  children: ReactNode;
};

export function AuthGate({ children }: AuthGateProps) {
  const auth = useAuth();

  if (auth.loading) {
    return (
      <main className="page auth-page">
        <section className="auth-page-card">
          <p className="eyebrow">Acceso</p>
          <h1>Cargando sesion</h1>
          <p className="lead">Verificando el usuario en Supabase.</p>
        </section>
      </main>
    );
  }

  if (!auth.profile) {
    return (
      <main className="page auth-page">
        <section className="auth-page-card" aria-labelledby="login-title">
          <p className="eyebrow">Acceso requerido</p>
          <h1 id="login-title">Login</h1>
          <p className="lead">
            Inicia sesion con tu usuario. Si la cuenta no esta activa, la app no
            muestra Timings ni Historial.
          </p>

          <AuthPanel
            error={auth.error}
            isActive={auth.isActive}
            loading={auth.loading}
            mode="login"
            notice={auth.notice}
            profile={auth.profile}
            onLogin={auth.signIn}
            onLogout={auth.signOut}
            onRegister={auth.signUp}
          />

          <Link className="auth-link" href="/register">
            Crear cuenta
          </Link>
        </section>
      </main>
    );
  }

  if (!auth.isActive) {
    return (
      <main className="page auth-page">
        <section className="auth-page-card" aria-labelledby="pending-title">
          <p className="eyebrow">Cuenta pendiente</p>
          <h1 id="pending-title">Esperando aprobacion</h1>
          <p className="lead">
            El usuario {auth.profile.username} ya existe, pero todavia no fue
            habilitado desde la base de datos.
          </p>
          {auth.notice ? <p className="success-message">{auth.notice}</p> : null}
          <button
            className="secondary-button"
            type="button"
            onClick={auth.signOut}
          >
            Salir
          </button>
        </section>
      </main>
    );
  }

  return <>{children}</>;
}
