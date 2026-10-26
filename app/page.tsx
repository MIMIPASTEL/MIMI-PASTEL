"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    async function ir() {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace("/login");
        return;
      }
      const { data: perfil } = await supabase
        .from("perfiles")
        .select("rol")
        .eq("id", data.session.user.id)
        .maybeSingle();

      if (perfil?.rol === "produccion") router.replace("/produccion");
      else if (perfil?.rol === "ventas") router.replace("/ventas");
      else router.replace("/hoy");
    }
    ir();
  }, [router]);

  return (
    <div className="login-wrap">
      <p className="sub">Cargando…</p>
    </div>
  );
}
