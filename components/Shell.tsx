"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, type Perfil } from "@/lib/supabase";

const NAV = [
  { href: "/hoy", label: "Hoy", ico: "☀️", roles: ["admin", "produccion", "ventas"] },
  { href: "/programacion", label: "Programar", ico: "🗓️", roles: ["admin", "produccion"] },
  { href: "/produccion", label: "Producción", ico: "🥣", roles: ["admin", "produccion"] },
  { href: "/ventas", label: "Ventas", ico: "🧾", roles: ["admin", "ventas"] },
  { href: "/pedidos", label: "Pedidos", ico: "🎂", roles: ["admin", "ventas"] },
  { href: "/cierre", label: "Cierre", ico: "📊", roles: ["admin"] },
  { href: "/admin", label: "Ajustes", ico: "⚙️", roles: ["admin"] },
];

const PerfilCtx = createContext<Perfil | null>(null);
export function usePerfil() {
  return useContext(PerfilCtx);
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [estado, setEstado] = useState<"cargando" | "listo" | "sin-sesion">("cargando");

  useEffect(() => {
    let vivo = true;

    async function cargar() {
      const { data } = await supabase.auth.getSession();
      if (!vivo) return;
      if (!data.session) {
        setEstado("sin-sesion");
        router.replace("/login");
        return;
      }
      const { data: p } = await supabase
        .from("perfiles")
        .select("id, nombre, rol")
        .eq("id", data.session.user.id)
        .maybeSingle();

      if (!vivo) return;
      setPerfil(
        p ?? { id: data.session.user.id, nombre: data.session.user.email ?? "Usuario", rol: "ventas" },
      );
      setEstado("listo");
    }

    cargar();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (!s) router.replace("/login");
    });
    return () => {
      vivo = false;
      sub.subscription.unsubscribe();
    };
  }, [router]);

  if (estado !== "listo") {
    return (
      <div className="login-wrap">
        <p className="sub">Cargando…</p>
      </div>
    );
  }

  const rol = perfil?.rol ?? "ventas";
  const visible = NAV.filter((n) => n.roles.includes(rol));

  return (
    <>
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">M</div>
          <div>
            Mimi Pastel
            <small>{perfil?.nombre ?? ""}</small>
          </div>
        </div>
        <button
          className="btn btn-sm"
          onClick={async () => {
            await supabase.auth.signOut();
            router.replace("/login");
          }}
        >
          Salir
        </button>
      </header>

      <nav className="nav">
        {visible.map((n) => (
          <Link key={n.href} href={n.href} className={path === n.href ? "active" : ""}>
            <span className="ico">{n.ico}</span>
            {n.label}
          </Link>
        ))}
      </nav>

      <main className="main">
        <PerfilCtx.Provider value={perfil}>{children}</PerfilCtx.Provider>
      </main>
    </>
  );
}
