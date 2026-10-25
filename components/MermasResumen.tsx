"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase, numero, soles } from "@/lib/supabase";

type Prod = { id: string; codigo?: string | null; nombre: string };

function restarDia(iso: string) {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() - 1);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export default function MermasResumen({
  fecha,
  productos,
}: {
  fecha: string;
  productos: Prod[];
}) {
  const ayer = restarDia(fecha);
  const [prod, setProd] = useState<Record<string, number>>({});
  const [sob, setSob] = useState<Record<string, number>>({});
  const [costos, setCostos] = useState<Record<string, number>>({});
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    const [hoy, ayerQ, lot] = await Promise.all([
      supabase.from("mermas").select("producto_id, cantidad").eq("fecha", fecha).eq("tipo", "produccion"),
      supabase.from("mermas").select("producto_id, cantidad").eq("fecha", ayer).eq("tipo", "devolucion"),
      supabase.from("lotes_produccion").select("producto_id, costo_unitario").order("fecha", { ascending: false }),
    ]);

    const p: Record<string, number> = {};
    ((hoy.data ?? []) as any[]).forEach((x) => {
      p[x.producto_id] = (p[x.producto_id] ?? 0) + Number(x.cantidad);
    });
    const s: Record<string, number> = {};
    ((ayerQ.data ?? []) as any[]).forEach((x) => {
      s[x.producto_id] = (s[x.producto_id] ?? 0) + Number(x.cantidad);
    });
    const c: Record<string, number> = {};
    ((lot.data ?? []) as any[]).forEach((x) => {
      if (c[x.producto_id] === undefined) c[x.producto_id] = Number(x.costo_unitario ?? 0);
    });

    setProd(p);
    setSob(s);
    setCostos(c);
    setCargando(false);
  }, [fecha, ayer]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const filas = productos.filter((p) => (prod[p.id] ?? 0) > 0 || (sob[p.id] ?? 0) > 0);
  const totalUnid = filas.reduce((a, p) => a + (prod[p.id] ?? 0) + (sob[p.id] ?? 0), 0);
  const totalSoles = filas.reduce(
    (a, p) => a + ((prod[p.id] ?? 0) + (sob[p.id] ?? 0)) * (costos[p.id] ?? 0),
    0,
  );

  return (
    <div className="card">
      <h2>Mermas del día</h2>
      <p className="sub" style={{ marginTop: -6 }}>
        Lo que se produjo pero no se puede vender, con su costo estimado.
      </p>

      {cargando ? (
        <p className="empty">Cargando…</p>
      ) : filas.length === 0 ? (
        <p className="empty">Sin mermas registradas.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th className="num">Merma de sobrante</th>
                <th className="num">Merma de producción</th>
                <th className="num">Total unid.</th>
                <th className="num">Costo unit.</th>
                <th className="num">Pérdida</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((p) => {
                const a = prod[p.id] ?? 0;
                const b = sob[p.id] ?? 0;
                const cu = costos[p.id] ?? 0;
                return (
                  <tr key={p.id}>
                    <td><strong>{p.codigo ?? p.nombre}</strong></td>
                    <td className="num">{b ? numero(b) : ""}</td>
                    <td className="num">{a ? numero(a) : ""}</td>
                    <td className="num">{numero(a + b)}</td>
                    <td className="num">{cu ? soles(cu) : "—"}</td>
                    <td className="num">{cu ? soles((a + b) * cu) : "—"}</td>
                  </tr>
                );
              })}
              <tr>
                <td colSpan={3}><strong>Total</strong></td>
                <td className="num"><strong>{numero(totalUnid)}</strong></td>
                <td className="num"></td>
                <td className="num"><strong>{soles(totalSoles)}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <p className="sub" style={{ margin: "10px 4px 0", fontSize: 12 }}>
        La merma de sobrante corresponde a ayer (cuando se horneó); la de producción, a hoy.
      </p>
    </div>
  );
}
