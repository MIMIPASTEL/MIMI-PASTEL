"use client";

import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { supabase, hoyISO, fechaCorta } from "@/lib/supabase";
import SobrantesRevision from "@/components/SobrantesRevision";
import ParrillaPrograma from "@/components/ParrillaPrograma";
import Despacho from "@/components/Despacho";
import MermasResumen from "@/components/MermasResumen";

type Prod = { id: string; codigo?: string | null; nombre: string };
type Punto = { id: string; codigo: string; nombre: string; es_fijo: boolean; turno: number | null };

export default function ProduccionPage() {
  return (
    <Shell>
      <Contenido />
    </Shell>
  );
}

function Contenido() {
  const [fecha, setFecha] = useState(hoyISO());
  const [productos, setProductos] = useState<Prod[]>([]);
  const [puntos, setPuntos] = useState<Punto[]>([]);

  useEffect(() => {
    (async () => {
      const [p, pv] = await Promise.all([
        supabase
          .from("productos")
          .select("id, codigo, nombre")
          .eq("activo", true)
          .order("orden", { ascending: true })
          .order("codigo"),
        supabase
          .from("puntos_venta")
          .select("id, codigo, nombre, es_fijo, turno")
          .eq("activo", true)
          .in("tipo", ["maxiahorro", "repartos"])
          .order("orden", { ascending: true })
          .order("codigo"),
      ]);
      setProductos((p.data ?? []) as Prod[]);
      setPuntos((pv.data ?? []) as Punto[]);
    })();
  }, []);

  return (
    <>
      <h1>Producción</h1>
      <p className="sub">{fechaCorta(fecha)} · lo que hay que producir y enviar</p>

      <div className="card">
        <label className="f">Fecha</label>
        <input
          className="input"
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          style={{ maxWidth: 200 }}
        />
      </div>

      <SobrantesRevision fecha={fecha} productos={productos} puntos={puntos} />

      <ParrillaPrograma fecha={fecha} productos={productos} puntos={puntos} />

      <Despacho fecha={fecha} productos={productos} puntos={puntos} />

      <MermasResumen fecha={fecha} productos={productos} />
    </>
  );
}
