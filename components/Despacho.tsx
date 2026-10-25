"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase, numero } from "@/lib/supabase";

type Prod = { id: string; codigo?: string | null; nombre: string };
type Punto = { id: string; codigo: string; turno?: number | null };

export default function Despacho({
  fecha,
  productos,
  puntos,
}: {
  fecha: string;
  productos: Prod[];
  puntos: Punto[];
}) {
  const [celdas, setCeldas] = useState<Record<string, string>>({});
  const [bloqueado, setBloqueado] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const clave = (puntoId: string, prodId: string) => `${puntoId}|${prodId}`;

  const cargar = useCallback(async () => {
    setCargando(true);
    setErr(null);

    const [req, des] = await Promise.all([
      supabase
        .from("requerimientos")
        .select("id, requerimiento_items(producto_id, destino_punto_id, cantidad)")
        .eq("fecha", fecha)
        .maybeSingle(),
      supabase.from("despachos").select("id, punto_venta_id, despacho_items(producto_id, cantidad_enviada)").eq("fecha", fecha),
    ]);

    const despachos = (des.data ?? []) as any[];
    const c: Record<string, string> = {};

    if (despachos.length > 0) {
      despachos.forEach((d) => {
        (d.despacho_items ?? []).forEach((i: any) => {
          if (Number(i.cantidad_enviada) > 0) {
            c[`${d.punto_venta_id}|${i.producto_id}`] = String(Number(i.cantidad_enviada));
          }
        });
      });
      setBloqueado(true);
    } else {
      ((req.data?.requerimiento_items ?? []) as any[]).forEach((i) => {
        if (!i.destino_punto_id) return;
        c[`${i.destino_punto_id}|${i.producto_id}`] = String(Number(i.cantidad));
      });
      setBloqueado(false);
    }
    setCeldas(c);

    setCargando(false);
  }, [fecha]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // solo se muestran los puntos que tienen algo que enviar
  const filas = puntos.filter((p) =>
    productos.some((pr) => Number(celdas[clave(p.id, pr.id)] || 0) > 0),
  );

  const totalFila = (puntoId: string) =>
    productos.reduce((a, p) => a + Number(celdas[clave(puntoId, p.id)] || 0), 0);

  const totalCol = (prodId: string) =>
    filas.reduce((a, p) => a + Number(celdas[clave(p.id, prodId)] || 0), 0);

  const granTotal = productos.reduce((a, p) => a + totalCol(p.id), 0);

  function setCelda(puntoId: string, prodId: string, v: string) {
    setCeldas((c) => ({ ...c, [clave(puntoId, prodId)]: v }));
  }

  async function guardar() {
    setErr(null);
    setMsg(null);
    setGuardando(true);

    for (const pv of filas) {
      const items = productos
        .map((p) => ({ p, v: Number(celdas[clave(pv.id, p.id)] || 0) }))
        .filter((x) => x.v > 0);

      if (items.length === 0) continue;

      const turno = pv.turno ?? 0;
      const { data: desp, error } = await supabase
        .from("despachos")
        .upsert(
          { fecha, punto_venta_id: pv.id, turno, estado: "enviado", enviado_en: new Date().toISOString() },
          { onConflict: "fecha,punto_venta_id,turno" },
        )
        .select("id")
        .single();

      if (error || !desp) {
        setErr(error?.message ?? "No se pudo guardar el envío de " + pv.codigo);
        setGuardando(false);
        return;
      }

      const { error: e2 } = await supabase.from("despacho_items").upsert(
        items.map((x) => ({
          despacho_id: desp.id,
          producto_id: x.p.id,
          cantidad_enviada: x.v,
          cantidad_stock: 0,
        })),
        { onConflict: "despacho_id,producto_id" },
      );
      if (e2) {
        setErr(e2.message);
        setGuardando(false);
        return;
      }
    }

    setGuardando(false);
    setBloqueado(true);
    setMsg("Envío guardado. Para corregirlo usa el botón Editar.");
    cargar();
  }

  if (cargando) {
    return (
      <div className="card">
        <h2>Enviar a punto de venta</h2>
        <p className="empty">Cargando…</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="row" style={{ marginBottom: 10 }}>
        <h2 style={{ margin: 0 }}>Enviar a punto de venta</h2>
        {bloqueado ? (
          <button className="btn btn-sm" onClick={() => setBloqueado(false)} type="button">
            Editar
          </button>
        ) : (
          <span className="badge warn">editando</span>
        )}
      </div>
      <p className="sub" style={{ marginTop: -6 }}>
        Cantidades reales que salen para cada cliente. Pueden diferir de la programación.
      </p>

      {err && <div className="alert err">{err}</div>}
      {msg && <div className="alert ok">{msg}</div>}

      {filas.length === 0 ? (
        <p className="empty">No hay programación para enviar en esta fecha.</p>
      ) : (
        <div className="table-wrap">
          <table className="grid-prog">
            <thead>
              <tr>
                <th className="sticky" style={{ minWidth: 118 }}>Cliente</th>
                {productos.map((p) => (
                  <th key={p.id} className="prod" title={p.nombre}>
                    {p.codigo ?? p.nombre}
                  </th>
                ))}
                <th className="num">Tot</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((pv) => (
                <tr key={pv.id}>
                  <td className="sticky">{pv.codigo}</td>
                  {productos.map((p) => (
                    <td key={p.id} style={{ padding: 2 }}>
                      <input
                        className="num"
                        type="number"
                        min="0"
                        step="1"
                        value={celdas[clave(pv.id, p.id)] ?? ""}
                        onChange={(e) => setCelda(pv.id, p.id, e.target.value)}
                        disabled={bloqueado}
                      />
                    </td>
                  ))}
                  <td className="num"><strong>{totalFila(pv.id) || ""}</strong></td>
                </tr>
              ))}

                            <tr>
                <td className="sticky"><strong>Total enviado</strong></td>
                {productos.map((p) => (
                  <td key={p.id} className="num"><strong>{totalCol(p.id) || ""}</strong></td>
                ))}
                <td className="num"><strong>{numero(granTotal)}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {!bloqueado && filas.length > 0 && (
        <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={guardar} disabled={guardando}>
          {guardando ? "Guardando…" : "Guardar envío"}
        </button>
      )}
    </div>
  );
}
