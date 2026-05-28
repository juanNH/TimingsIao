"use client";

import { FormEvent, useState } from "react";
import { type UserProfile } from "@/lib/auth";

type AuthPanelProps = {
  error: string | null;
  mode: "login" | "register";
  isActive: boolean;
  loading: boolean;
  notice: string | null;
  profile: UserProfile | null;
  onLogin: (username: string) => Promise<void>;
  onLogout: () => Promise<void>;
  onRegister: (username: string) => Promise<void>;
};

export function AuthPanel({
  error,
  mode,
  isActive,
  loading,
  notice,
  profile,
  onLogin,
  onLogout,
  onRegister
}: AuthPanelProps) {
  const [username, setUsername] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (mode === "login") {
      await onLogin(username);
    } else {
      await onRegister(username);
    }
  }

  if (profile) {
    return (
      <section className="auth-panel" aria-label="Usuario">
        <div>
          <p className="sync-title">Usuario</p>
          <p className="sync-status">{profile.username}</p>
          <p className="sync-help">
            {isActive
              ? "Cuenta activa. Puede registrar cambios."
              : "Cuenta pendiente de activacion."}
          </p>
          {notice ? <p className="success-message">{notice}</p> : null}
        </div>
        <button
          className="secondary-button"
          type="button"
          disabled={loading}
          onClick={onLogout}
        >
          Salir
        </button>
      </section>
    );
  }

  return (
    <section className="auth-panel" aria-label="Acceso">
      <form className="auth-form" onSubmit={handleSubmit}>
        <p className="sync-title">{mode === "login" ? "Login" : "Registro"}</p>

        <label>
          <span className="field-label">Usuario</span>
          <input
            className="text-input"
            minLength={3}
            required
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
        </label>

        <button className="register-button" type="submit" disabled={loading}>
          {loading
            ? "Procesando..."
            : mode === "login"
              ? "Entrar"
              : "Crear cuenta"}
        </button>

        {error ? <p className="error">{error}</p> : null}
        {notice ? <p className="success-message">{notice}</p> : null}
      </form>
    </section>
  );
}
