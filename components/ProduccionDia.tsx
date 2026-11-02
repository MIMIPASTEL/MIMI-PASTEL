"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase, numero, soles } from "@/lib/supabase";

type Prod = { id: string; codigo: string | null; nombre: string };

export default function ProduccionDia({
  fecha,
  productos,
}: {
  fecha: string;
  productos: any[];
}) {
  const [producido, setProducido] = useState<Record<string, string>>({});
  const [merma, setMerma] = useState<Record<string, string>>({});
  const [enviado, setEnviado] = useState<Record<string, number>>({});
  const [salidas, setSalidas] = useState<Record<string, number>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    const [lot, mer, des, vta, mue] = await Promise.all([
      supabase.from("lotes_produccion").select("producto_id, cantidad_producida").eq("fecha", fecha),
      supabase.from("mermas").select("producto_id, cantidad, tipo").eq("fecha", fecha).eq("tipo", "produccion"),
      supabase.from("despachos").select("punto_venta_id, turno, puntos_venta(tipo), despacho_items(producto_id, cantidad_enviada)").eq("fecha", fecha),
      supabase.from("ventas").select("venta_items(producto_id, cantidad), puntos_venta!inner(codigo)").eq("fecha", fecha).eq("puntos_venta.codigo", "TALLER"),
      supabase.from("mermas").select("producto_id, cantidad").eq("fecha", fecha).eq("tipo", "muestra"),
    ]);

    const p: Record<string, string> = {};
    ((lot.data ?? []) as any[]).forEach((x) => (p[x.producto_id] = String(Number(x.cantidad_producida))));
    setProducido(p);

    const m: Record<string, string> = {};
    ((mer.data ?? []) as any[]).forEach((x) => (m[x.producto_id] = String(Number(x.cantidad))));
    setMerma(m);

    const e: Record<string, number> = {};
    ((des.data ?? []) as any[]).forEach((d: any) => {
      if (d.puntos_venta?.tipo === "pedidos") return;
      ((d.despacho_items ?? []) as any[]).forEach((it: any) => {
        e[it.producto_id] = (e[it.producto_id] ?? 0) + Number(it.cantidad_enviada);
      });
    });
    setEnviado(e);

    const sa: Record<string, number> = {};
    ((vta.data ?? []) as any[]).forEach((v: any) => {
      ((v.venta_items ?? []) as any[]).forEach((it: any) => {
        sa[it.producto_id] = (sa[it.producto_id] ?? 0) + Number(it.cantidad);
      });
    });
    ((mue.data ?? []) as any[]).forEach((m: any) => {
      sa[m.producto_id] = (sa[m.producto_id] ?? 0) + Number(m.cantidad);
    });
    setSalidas(sa);

    setCargando(false);
  }, [fecha]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function guardar() {
    setErr(null);
    setMsg(null);
    setGuardando(true);

    const conProducido = productos.filter((p) => Number(producido[p.id] || 0) > 0);

    await supabase.from("lotes_produccion").delete().eq("fecha", fecha);

    if (conProducido.length) {
      const { error } = await supabase.from("lotes_produccion").insert(
        conProducido.map((p) => ({
          fecha,
          producto_id: p.id,
          cantidad_producida: Number(producido[p.id]),
        })),
      );
      if (error) {
        setGuardando(false);
        return setErr(error.message);
      }
    }

    setGuardando(false);
    setMsg("Producción del día guardada.");
    cargar();
  }

  if (cargando) {
    return (
      <div className="card">
        <h2>Producción del día</h2>
        <p className="empty">Cargando…</p>
      </div>
    );
  }

  const totalProducido = productos.reduce((a, p) => a + Number(producido[p.id] || 0), 0);
  const totalMerma = productos.reduce((a, p) => a + Number(merma[p.id] || 0), 0);

  return (
    <div className="card">
      <h2>Producción del día</h2>
      <p className="sub" style={{ marginTop: -6 }}>
        Lo que realmente salió del horno. La merma se registra en \u00abMermas del día\u00bb.
      </p>

      {err && <div className="alert err">{err}</div>}
      {msg && <div className="alert ok">{msg}</div>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Producto</th>
              <th className="num">Producido</th>
              <th className="num">Merma</th>
              <th className="num">Enviado</th>
              <th className="num">Taller</th>
              <th className="num">Stock</th>
            </tr>
          </thead>
          <tbody>
            {productos.map((p) => {
              const prod = Number(producido[p.id] || 0);
              const mer = Number(merma[p.id] || 0);
              const env = enviado[p.id] ?? 0;
              const sal = salidas[p.id] ?? 0;
              const stock = prod - mer - env - sal;
              return (
                <tr key={p.id}>
                  <td><strong>{p.codigo ?? p.nombre}</strong></td>
                  <td className="num">
                    <input
                      className="input num"
                      type="number"
                      min="0"
                      step="1"
                      style={{ width: 80 }}
                      value={producido[p.id] ?? ""}
                      onChange={(e) => setProducido((x) => ({ ...x, [p.id]: e.target.value }))}
                    />
                  </td>
                  <td className="num">{mer || "—"}</td>
                  <td className="num">{env || "—"}</td>
                  <td className="num">{sal || "—"}</td>
                  <td className="num" style={{ color: stock < 0 ? "var(--danger)" : stock > 0 ? "var(--warn)" : "var(--ok)" }}>
                    {prod > 0 || env > 0 ? numero(stock) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="row" style={{ marginTop: 10, justifyContent: "space-between" }}>
        <span className="sub">
          Producido {numero(totalProducido)} · Merma {numero(totalMerma)}
        </span>
        <button className="btn btn-sm btn-primary" onClick={guardar} disabled={guardando}>
          {guardando ? "Guardando…" : "Guardar producción"}
        </button>
      </div>

      <p className="sub" style={{ margin: "10px 4px 0", fontSize: 12 }}>
        Stock positivo = quedó producto en el taller. Negativo = se envió más de lo producido.
      </p>
    </div>
  );
}
