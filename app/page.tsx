"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/hoy");
  }, [router]);

  return (
    <div className="login-wrap">
      <p className="sub">Cargando…</p>
    </div>
  );
}
