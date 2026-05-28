"use client";

import { FormEvent, useState } from "react";
import { type UserProfile } from "@/lib/auth";

type AuthPanelProps = {
  error: string | null;
  initialMode?: "login" | "register";
  isActive: boolean;
  loading: boolean;
  profile: UserProfile | null;
  onLogin: (username: string, password: string) => Promise<void>;
  onLogout: () => Promise<void>;
  onRegister: (username: string, password: string) => Promise<void>;
};

export function AuthPanel({
  error,
  initialMode = "login",
  isActive,
  loading,
  profile,
  onLogin,
  onLogout,
  onRegister
}: AuthPanelProps) {
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (mode === "login") {
      await onLogin(username, password);
    } else {
      await onRegister(username, password);
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
        <div className="auth-mode">
          <button
            className={`tab-button ${mode === "login" ? "active" : ""}`}
            type="button"
            onClick={() => setMode("login")}
          >
            Login
          </button>
          <button
            className={`tab-button ${mode === "register" ? "active" : ""}`}
            type="button"
            onClick={() => setMode("register")}
          >
            Registro
          </button>
        </div>

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

        <label>
          <span className="field-label">Contrasena</span>
          <input
            className="text-input"
            minLength={6}
            required
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
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
      </form>
    </section>
  );
}
