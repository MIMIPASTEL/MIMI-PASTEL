"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase, numero, soles } from "@/lib/supabase";

function restarDia(iso: string) {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export default function ProduccionDia({
  fecha,
  productos,
}: {
  fecha: string;
  productos: any[];
}) {
  const [inicial, setInicial] = useState<Record<string, number>>({});
  const [producido, setProducido] = useState<Record<string, string>>({});
  const [mermaProd, setMermaProd] = useState<Record<string, string>>({});
  const [mermaSob, setMermaSob] = useState<Record<string, number>>({});
  const [enviado, setEnviado] = useState<Record<string, number>>({});
  const [vendido, setVendido] = useState<Record<string, number>>({});
  const [costos, setCostos] = useState<Record<string, number>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [cargando, setCargando] = useState(true);

  const ayer = restarDia(fecha);

  const cargar = useCallback(async () => {
    setCargando(true);
    const [lot, mp, ms, des, vta, mue, pts, lotes] = await Promise.all([
      supabase.from("lotes_produccion").select("producto_id, cantidad_producida").eq("fecha", fecha),
      supabase.from("mermas").select("producto_id, cantidad").eq("fecha", fecha).eq("tipo", "produccion"),
      supabase.from("mermas").select("producto_id, cantidad").eq("fecha", ayer).eq("tipo", "devolucion"),
      supabase.from("despachos").select("puntos_venta!inner(tipo), despacho_items(producto_id, cantidad_enviada)").eq("fecha", fecha),
      supabase.from("ventas").select("venta_items(producto_id, cantidad), puntos_venta!inner(codigo)").eq("fecha", fecha).eq("puntos_venta.codigo", "TALLER"),
      supabase.from("mermas").select("producto_id, cantidad").eq("fecha", fecha).eq("tipo", "muestra"),
      supabase.from("puntos_venta").select("id, turno, tipo").eq("tipo", "maxiahorro"),
      supabase.from("lotes_produccion").select("producto_id, costo_insumos, costo_unitario").order("fecha", { ascending: false }).limit(200),
    ]);

    // stock inicial: sobrante reutilizable de MAXI 2 del dia anterior
    const maxTurno = ((pts.data ?? []) as any[]).reduce((a, x) => Math.max(a, Number(x.turno ?? 0)), 0);
    const ultimo = ((pts.data ?? []) as any[]).find((x) => Number(x.turno ?? 0) === maxTurno)?.id ?? null;
    const { data: sob } = await supabase
      .from("sobrantes")
      .select("producto_id, cantidad, cantidad_reutilizable, punto_venta_id")
      .eq("fecha", ayer);

    const ini: Record<string, number> = {};
    ((sob ?? []) as any[]).forEach((x) => {
      if (ultimo && x.punto_venta_id !== ultimo) return;
      const v = x.cantidad_reutilizable === null ? Number(x.cantidad) : Number(x.cantidad_reutilizable);
      ini[x.producto_id] = (ini[x.producto_id] ?? 0) + v;
    });
    setInicial(ini);

    const p: Record<string, string> = {};
    ((lot.data ?? []) as any[]).forEach((x) => (p[x.producto_id] = String(Number(x.cantidad_producida))));
    setProducido(p);

    const mpr: Record<string, string> = {};
    ((mp.data ?? []) as any[]).forEach((x) => (mpr[x.producto_id] = String(Number(x.cantidad))));
    setMermaProd(mpr);

    const mso: Record<string, number> = {};
    ((ms.data ?? []) as any[]).forEach((x) => (mso[x.producto_id] = (mso[x.producto_id] ?? 0) + Number(x.cantidad)));
    setMermaSob(mso);

    const e: Record<string, number> = {};
    ((des.data ?? []) as any[]).forEach((d: any) => {
      if (d.puntos_venta?.tipo === "pedidos") return;
      ((d.despacho_items ?? []) as any[]).forEach((it: any) => {
        e[it.producto_id] = (e[it.producto_id] ?? 0) + Number(it.cantidad_enviada);
      });
    });
    setEnviado(e);

    const v: Record<string, number> = {};
    ((vta.data ?? []) as any[]).forEach((x: any) => {
      ((x.venta_items ?? []) as any[]).forEach((it: any) => {
        v[it.producto_id] = (v[it.producto_id] ?? 0) + Number(it.cantidad);
      });
    });
    ((mue.data ?? []) as any[]).forEach((m: any) => {
      v[m.producto_id] = (v[m.producto_id] ?? 0) + Number(m.cantidad);
    });
    setVendido(v);

    const c: Record<string, number> = {};
    ((lotes.data ?? []) as any[]).forEach((l: any) => {
      if (c[l.producto_id] === undefined && l.costo_unitario) c[l.producto_id] = Number(l.costo_unitario);
    });
    setCostos(c);

    setCargando(false);
  }, [fecha, ayer]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function guardar() {
    setErr(null);
    setMsg(null);
    setGuardando(true);

    await supabase.from("lotes_produccion").delete().eq("fecha", fecha);
    const conProd = productos.filter((p) => Number(producido[p.id] || 0) > 0);
    if (conProd.length) {
      const { error } = await supabase.from("lotes_produccion").insert(
        conProd.map((p) => ({
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

    for (const p of productos) {
      await supabase.from("mermas").delete().eq("fecha", fecha).eq("producto_id", p.id).eq("tipo", "produccion");
      const v = Number(mermaProd[p.id] || 0);
      if (v > 0) {
        await supabase.from("mermas").insert({
          fecha,
          producto_id: p.id,
          cantidad: v,
          tipo: "produccion",
          nota: "Merma de producción",
        });
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

  let totalAire = 0;

  return (
    <div className="card">
      <h2>Producción del día</h2>
      <p className="sub" style={{ marginTop: -6 }}>
        Inicial + producido − mermas − enviado − vendido = stock final. Si no es 0, hay producto en el aire.
      </p>

      {err && <div className="alert err">{err}</div>}
      {msg && <div className="alert ok">{msg}</div>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Producto</th>
              <th className="num">Inicial</th>
              <th className="num">Producido</th>
              <th className="num">Merma sobr.</th>
              <th className="num">Merma prod.</th>
              <th className="num">Enviado</th>
              <th className="num">Vendido</th>
              <th className="num">Stock</th>
            </tr>
          </thead>
          <tbody>
            {productos.map((p) => {
              const ini = inicial[p.id] ?? 0;
              const prod = Number(producido[p.id] || 0);
              const ms = mermaSob[p.id] ?? 0;
              const mpv = Number(mermaProd[p.id] || 0);
              const env = enviado[p.id] ?? 0;
              const ven = vendido[p.id] ?? 0;
              const stock = ini + prod - ms - mpv - env - ven;
              if (Math.abs(stock) > 0.001) totalAire += stock;
              return (
                <tr key={p.id}>
                  <td><strong>{p.codigo ?? p.nombre}</strong></td>
                  <td className="num">{ini || "—"}</td>
                  <td className="num">
                    <input
                      className="input num"
                      type="number"
                      min="0"
                      step="1"
                      style={{ width: 78 }}
                      value={producido[p.id] ?? ""}
                      onChange={(e) => setProducido((x) => ({ ...x, [p.id]: e.target.value }))}
                    />
                  </td>
                  <td className="num">{ms || "—"}</td>
                  <td className="num">
                    <input
                      className="input num"
                      type="number"
                      min="0"
                      step="1"
                      style={{ width: 70 }}
                      value={mermaProd[p.id] ?? ""}
                      onChange={(e) => setMermaProd((x) => ({ ...x, [p.id]: e.target.value }))}
                    />
                  </td>
                  <td className="num">{env || "—"}</td>
                  <td className="num">{ven || "—"}</td>
                  <td
                    className="num"
                    style={{
                      color: Math.abs(stock) < 0.001 ? "var(--ok)" : stock < 0 ? "var(--danger)" : "var(--warn)",
                      fontWeight: 700,
                    }}
                  >
                    {stock === 0 ? "0" : numero(stock)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="row" style={{ marginTop: 10, justifyContent: "space-between" }}>
        <span className="sub">
          Producto en el aire: {numero(totalAire)} unidades
        </span>
        <button className="btn btn-sm btn-primary" onClick={guardar} disabled={guardando}>
          {guardando ? "Guardando…" : "Guardar producción"}
        </button>
      </div>

      <p className="sub" style={{ margin: "8px 4px 0", fontSize: 12 }}>
        Inicial = sobrante reutilizable de MAXI 2 del día anterior. Merma sobrante = lo descartado al revisar ayer.
      </p>
    </div>
  );
}
