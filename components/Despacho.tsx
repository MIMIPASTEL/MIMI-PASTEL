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
  const [puntoId, setPuntoId] = useState(puntos[0]?.id ?? "");
  const [nuevo, setNuevo] = useState<Record<string, string>>({});
  const [stock, setStock] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (!puntoId && puntos.length > 0) setPuntoId(puntos[0].id);
  }, [puntos, puntoId]);

  const cargar = useCallback(async () => {
    if (!puntoId) return;
    setCargando(true);
    setErr(null);
    const turno = puntos.find((p) => p.id === puntoId)?.turno ?? 0;

    const { data: desp } = await supabase
      .from("despachos")
      .select("id")
      .eq("fecha", fecha)
      .eq("punto_venta_id", puntoId)
      .eq("turno", turno)
      .maybeSingle();

    if (!desp) {
      setNuevo({});
      setStock({});
      setCargando(false);
      return;
    }

    const { data: its } = await supabase
      .from("despacho_items")
      .select("producto_id, cantidad_enviada, cantidad_stock")
      .eq("despacho_id", desp.id);

    const n: Record<string, string> = {};
    const s: Record<string, string> = {};
    (its ?? []).forEach((i: any) => {
      const enviado = Number(i.cantidad_enviada);
      const st = Number(i.cantidad_stock ?? 0);
      if (st > 0) s[i.producto_id] = String(st);
      const producido = enviado - st;
      if (producido > 0) n[i.producto_id] = String(producido);
    });
    setNuevo(n);
    setStock(s);
    setCargando(false);
  }, [fecha, puntoId, puntos]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const totalNuevo = productos.reduce((a, p) => a + Number(nuevo[p.id] || 0), 0);
  const totalStock = productos.reduce((a, p) => a + Number(stock[p.id] || 0), 0);

  async function guardar() {
    setErr(null);
    setMsg(null);
    if (!puntoId) return setErr("Elige el punto de venta.");
    setGuardando(true);

    const turno = puntos.find((p) => p.id === puntoId)?.turno ?? 0;

    const { data: desp, error } = await supabase
      .from("despachos")
      .upsert(
        { fecha, punto_venta_id: puntoId, turno, estado: "enviado", enviado_en: new Date().toISOString() },
        { onConflict: "fecha,punto_venta_id,turno" },
      )
      .select("id")
      .single();

    if (error || !desp) {
      setErr(error?.message ?? "No se pudo crear el despacho");
      setGuardando(false);
      return;
    }

    const filas = productos
      .map((p) => {
        const st = Number(stock[p.id] || 0);
        const nu = Number(nuevo[p.id] || 0);
        return { p, st, nu, total: st + nu };
      })
      .filter((x) => x.total > 0)
      .map((x) => ({
        despacho_id: desp.id,
        producto_id: x.p.id,
        cantidad_enviada: x.total,
        cantidad_stock: x.st,
      }));

    const { error: e2 } = await supabase
      .from("despacho_items")
      .upsert(filas, { onConflict: "despacho_id,producto_id" });

    setGuardando(false);
    if (e2) return setErr(e2.message);
    setMsg(`Envío registrado: ${numero(totalNuevo)} del día + ${numero(totalStock)} de stock anterior.`);
  }

  return (
    <div className="card">
      <h2>Enviar a punto de venta</h2>
      <p className="sub" style={{ marginTop: -6 }}>
        Separa lo que es producción de hoy y lo que es sobrante del día anterior. El sobrante solo
        se envía a MAXI 1, que abre la venta.
      </p>

      {err && <div className="alert err">{err}</div>}
      {msg && <div className="alert ok">{msg}</div>}

      <div className="field">
        <label className="f">Punto de venta</label>
        <select className="input" value={puntoId} onChange={(e) => setPuntoId(e.target.value)}>
          {puntos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.codigo}
            </option>
          ))}
        </select>
      </div>

      {cargando ? (
        <p className="empty">Cargando…</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th className="num">Stock anterior</th>
                <th className="num">Producción del día</th>
                <th className="num">Total</th>
              </tr>
            </thead>
            <tbody>
              {productos.map((p) => {
                const st = Number(stock[p.id] || 0);
                const nu = Number(nuevo[p.id] || 0);
                return (
                  <tr key={p.id}>
                    <td>{p.codigo ?? p.nombre}</td>
                    <td className="num">
                      <input
                        className="input num"
                        type="number"
                        min="0"
                        step="1"
                        value={stock[p.id] ?? ""}
                        onChange={(e) => setStock((c) => ({ ...c, [p.id]: e.target.value }))}
                        style={{ width: 74, padding: "6px 8px" }}
                      />
                    </td>
                    <td className="num">
                      <input
                        className="input num"
                        type="number"
                        min="0"
                        step="1"
                        value={nuevo[p.id] ?? ""}
                        onChange={(e) => setNuevo((c) => ({ ...c, [p.id]: e.target.value }))}
                        style={{ width: 74, padding: "6px 8px" }}
                      />
                    </td>
                    <td className="num"><strong>{st + nu || ""}</strong></td>
                  </tr>
                );
              })}
              <tr>
                <td><strong>Total</strong></td>
                <td className="num"><strong>{numero(totalStock)}</strong></td>
                <td className="num"><strong>{numero(totalNuevo)}</strong></td>
                <td className="num"><strong>{numero(totalStock + totalNuevo)}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={guardar} disabled={guardando}>
        {guardando ? "Guardando…" : "Registrar envío"}
      </button>
    </div>
  );
}
