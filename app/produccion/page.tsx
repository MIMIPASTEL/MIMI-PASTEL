"use client";

import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { supabase, hoyISO, fechaCorta } from "@/lib/supabase";
import SobrantesRevision from "@/components/SobrantesRevision";
import ParrillaPrograma from "@/components/ParrillaPrograma";
import Despacho from "@/components/Despacho";
import MermasResumen from "@/components/MermasResumen";
import InsumosProduccion from "@/components/InsumosProduccion";

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
  const [v, setV] = useState(0);

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
      <div className="row" style={{ alignItems: "flex-start", marginBottom: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ marginBottom: 2 }}>Producción</h1>
          <p className="sub" style={{ margin: 0 }}>{fechaCorta(fecha)} · producir y enviar</p>
        </div>
        <input
          className="input"
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          style={{ maxWidth: 170 }}
        />
      </div>

      <SobrantesRevision
        fecha={fecha}
        productos={productos}
        puntos={puntos}
        onSaved={() => setV((x) => x + 1)}
      />

      <ParrillaPrograma key={v} fecha={fecha} productos={productos} puntos={puntos} />

      <Despacho fecha={fecha} productos={productos} puntos={puntos} />

      <MermasResumen fecha={fecha} productos={productos} />

        <InsumosProduccion fecha={fecha} />
    </>
  );
}
