"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/hoy");
    });
  }, [router]);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setCargando(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    setCargando(false);
    if (error) {
      setErr(
        error.message.includes("Invalid login")
          ? "Correo o contraseña incorrectos."
          : error.message,
      );
      return;
    }
    router.replace("/hoy");
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div
            className="brand-mark"
            style={{ width: 52, height: 52, borderRadius: 16, margin: "0 auto 12px", fontSize: 24 }}
          >
            M
          </div>
          <h1>Mimi Pastel</h1>
          <p className="sub">Producción, ventas y caja</p>
        </div>

        <form onSubmit={entrar} className="card">
          {err && <div className="alert err">{err}</div>}
          <div className="field">
            <label className="f">Correo</label>
            <input
              className="input"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label className="f">Contraseña</label>
            <input
              className="input"
              type="password"
              autoComplete="current-password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              required
            />
          </div>
          <button className="btn btn-primary btn-block" disabled={cargando}>
            {cargando ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
