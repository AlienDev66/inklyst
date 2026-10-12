import { useState } from "react";
import { useAuth } from "./auth";

export function AuthScreen({
  onBack,
  initialMode = "in",
}: {
  onBack?: () => void;
  initialMode?: "in" | "up";
}) {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"in" | "up">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result =
      mode === "in"
        ? await signIn(email, password)
        : await signUp(email, password, name);
    if (result) setError(result);
    setBusy(false);
  }

  return (
    <main className="auth-screen">
      <form className="auth-card" onSubmit={(event) => void submit(event)}>
        {onBack ? (
          <button type="button" className="text-btn auth-back" onClick={onBack}>
            ← Voltar à página
          </button>
        ) : null}
        <img src="/logo.png" alt="" width={48} height={48} draggable={false} />
        <p className="auth-brand">Inklyst</p>
        <h1>{mode === "in" ? "Entra no Inklyst" : "Cria a tua conta"}</h1>
        <p className="fine">Uma conta para Reader e Studio. Sem tipos permanentes.</p>

        {mode === "up" ? (
          <label>
            <span>Nome</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
              placeholder="Como te chamamos"
            />
          </label>
        ) : null}

        <label>
          <span>Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            placeholder="tu@email.com"
          />
        </label>

        <label>
          <span>Password</span>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete={mode === "in" ? "current-password" : "new-password"}
            placeholder="Mínimo 6 caracteres"
          />
        </label>

        {error ? <p className="auth-error">{error}</p> : null}

        <button type="submit" className="add" disabled={busy}>
          {busy ? "Aguarde…" : mode === "in" ? "Entrar" : "Criar conta"}
        </button>

        <button
          type="button"
          className="text-btn"
          onClick={() => {
            setMode((value) => (value === "in" ? "up" : "in"));
            setError(null);
          }}
        >
          {mode === "in" ? "Ainda não tens conta? Regista-te" : "Já tens conta? Entra"}
        </button>
      </form>
    </main>
  );
}
