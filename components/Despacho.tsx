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
  const [cant, setCant] = useState<Record<string, string>>({});
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
    const punto = puntos.find((p) => p.id === puntoId);
    const turno = punto?.turno ?? 0;

    const { data: desp } = await supabase
      .from("despachos")
      .select("id")
      .eq("fecha", fecha)
      .eq("punto_venta_id", puntoId)
      .eq("turno", turno)
      .maybeSingle();

    if (!desp) {
      setCant({});
      setCargando(false);
      return;
    }
    const { data: its } = await supabase
      .from("despacho_items")
      .select("producto_id, cantidad_enviada")
      .eq("despacho_id", desp.id);

    const m: Record<string, string> = {};
    (its ?? []).forEach((i: any) => {
      if (Number(i.cantidad_enviada) > 0) m[i.producto_id] = String(Number(i.cantidad_enviada));
    });
    setCant(m);
    setCargando(false);
  }, [fecha, puntoId, puntos]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const total = productos.reduce((a, p) => a + Number(cant[p.id] || 0), 0);

  async function guardar() {
    setErr(null);
    setMsg(null);
    if (!puntoId) return setErr("Elige el punto de venta.");
    setGuardando(true);

    const punto = puntos.find((p) => p.id === puntoId);
    const turno = punto?.turno ?? 0;

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
      .filter((p) => Number(cant[p.id] || 0) > 0)
      .map((p) => ({
        despacho_id: desp.id,
        producto_id: p.id,
        cantidad_enviada: Number(cant[p.id]),
      }));

    const { error: e2 } = await supabase
      .from("despacho_items")
      .upsert(filas, { onConflict: "despacho_id,producto_id" });

    setGuardando(false);
    if (e2) return setErr(e2.message);
    setMsg(`Envío registrado: ${numero(total)} unidades para ${punto?.codigo}.`);
  }

  return (
    <div className="card">
      <h2>Enviar a punto de venta</h2>
      <p className="sub" style={{ marginTop: -6 }}>
        Lo que producción entrega al turno. La vendedora después cuenta lo que recibió.
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
                <th className="num">Enviado</th>
              </tr>
            </thead>
            <tbody>
              {productos.map((p) => (
                <tr key={p.id}>
                  <td>{p.codigo ?? p.nombre}</td>
                  <td className="num">
                    <input
                      className="input num"
                      type="number"
                      min="0"
                      step="1"
                      value={cant[p.id] ?? ""}
                      onChange={(e) => setCant((c) => ({ ...c, [p.id]: e.target.value }))}
                      style={{ width: 80, padding: "6px 8px" }}
                    />
                  </td>
                </tr>
              ))}
              <tr>
                <td><strong>Total</strong></td>
                <td className="num"><strong>{numero(total)}</strong></td>
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
