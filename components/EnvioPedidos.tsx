"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase, numero } from "@/lib/supabase";

type Prod = { id: string; codigo: string | null; nombre: string; [k: string]: any };

export default function EnvioPedidos({
  fecha,
  productos,
}: {
  fecha: string;
  productos: any[];
}) {
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [celdas, setCeldas] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    const [ped, env] = await Promise.all([
      supabase
        .from("pedidos")
        .select("id, cliente, hora_entrega, lugar, pedido_items(producto_id, cantidad)")
        .eq("fecha_entrega", fecha)
        .neq("estado", "cancelado")
        .order("cliente"),
      supabase
        .from("despacho_items")
        .select("pedido_id, producto_id, cantidad_enviada, despachos!inner(fecha, puntos_venta!inner(codigo))")
        .eq("despachos.fecha", fecha)
        .eq("despachos.puntos_venta.codigo", "PEDIDOS"),
    ]);

    const guardado: Record<string, string> = {};
    ((env.data ?? []) as any[]).forEach((x) => {
      if (x.pedido_id) guardado[`${x.pedido_id}|${x.producto_id}`] = String(Number(x.cantidad_enviada));
    });

    const lista = ((ped.data ?? []) as any[]).map((p) => ({
      ...p,
      items: (p.pedido_items ?? []) as any[],
    }));

    const c: Record<string, string> = {};
    lista.forEach((p) => {
      p.items.forEach((it: any) => {
        const k = `${p.id}|${it.producto_id}`;
        c[k] = guardado[k] ?? String(Number(it.cantidad));
      });
    });

    setPedidos(lista);
    setCeldas(c);
    setCargando(false);
  }, [fecha]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const nombreProd = (id: string) =>
    productos.find((p) => p.id === id)?.codigo ?? productos.find((p) => p.id === id)?.nombre ?? "";

  async function guardar() {
    setErr(null);
    setMsg(null);
    setGuardando(true);

    const { data: pv } = await supabase
      .from("puntos_venta")
      .select("id")
      .eq("codigo", "PEDIDOS")
      .maybeSingle();
    if (!pv) {
      setGuardando(false);
      return setErr("No existe el punto PEDIDOS.");
    }

    const { data: desp, error } = await supabase
      .from("despachos")
      .upsert(
        { fecha, punto_venta_id: pv.id, turno: 0, estado: "enviado", enviado_en: new Date().toISOString() },
        { onConflict: "fecha,punto_venta_id,turno" },
      )
      .select("id")
      .single();
    if (error || !desp) {
      setGuardando(false);
      return setErr(error?.message ?? "No se pudo guardar.");
    }

    const ids = pedidos.map((p) => p.id);
    if (ids.length) {
      await supabase.from("despacho_items").delete().eq("despacho_id", desp.id).in("pedido_id", ids);
    }

    const filas: any[] = [];
    pedidos.forEach((p) => {
      p.items.forEach((it: any) => {
        const v = Number(celdas[`${p.id}|${it.producto_id}`] || 0);
        if (v > 0)
          filas.push({
            despacho_id: desp.id,
            producto_id: it.producto_id,
            pedido_id: p.id,
            cantidad_enviada: v,
            cantidad_stock: 0,
          });
      });
    });

    if (filas.length) {
      const { error: e2 } = await supabase.from("despacho_items").insert(filas);
      if (e2) {
        setGuardando(false);
        return setErr(e2.message);
      }
    }

    setGuardando(false);
    setMsg("Envío de pedidos guardado.");
    cargar();
  }

  if (cargando) {
    return (
      <div className="card">
        <h2>Envío de pedidos</h2>
        <p className="empty">Cargando…</p>
      </div>
    );
  }

  if (pedidos.length === 0) {
    return (
      <div className="card">
        <h2>Envío de pedidos</h2>
        <p className="empty">No hay pedidos para esta fecha.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="row" style={{ marginBottom: 10 }}>
        <h2 style={{ margin: 0 }}>Envío de pedidos</h2>
      </div>
      <p className="sub" style={{ marginTop: -6 }}>
        Confirma lo que realmente sale para cada pedido. Puede diferir de lo solicitado.
      </p>

      {err && <div className="alert err">{err}</div>}
      {msg && <div className="alert ok">{msg}</div>}

      {pedidos.map((p) => (
        <div key={p.id} style={{ borderTop: "1px solid var(--line)", padding: "10px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
            <strong>{p.cliente}</strong>
            <span className="sub">
              {p.hora_entrega ? String(p.hora_entrega).slice(0, 5) : ""} {p.lugar ? "· " + p.lugar : ""}
            </span>
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 6 }}>
            {p.items.map((it: any) => {
              const k = `${p.id}|${it.producto_id}`;
              return (
                <label key={k} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                  <span>{nombreProd(it.producto_id)}</span>
                  <input
                    className="input num"
                    type="number"
                    min="0"
                    step="1"
                    style={{ width: 70 }}
                    value={celdas[k] ?? ""}
                    onChange={(e) => setCeldas((c) => ({ ...c, [k]: e.target.value }))}
                  />
                  <span className="sub">de {numero(it.cantidad)}</span>
                </label>
              );
            })}
          </div>
        </div>
      ))}

      <button className="btn btn-primary btn-block" onClick={guardar} disabled={guardando} style={{ marginTop: 10 }}>
        {guardando ? "Guardando…" : "Guardar envío de pedidos"}
      </button>
    </div>
  );
}
