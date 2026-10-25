"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase, numero, soles } from "@/lib/supabase";

type Prod = { id: string; codigo?: string | null; nombre: string };
type Punto = { id: string; codigo: string; es_fijo?: boolean };

function restarDia(iso: string) {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() - 1);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export default function HojaProduccion({
  fecha,
  productos,
  puntos,
}: {
  fecha: string;
  productos: Prod[];
  puntos: Punto[];
}) {
  const ayer = restarDia(fecha);

  const [celdas, setCeldas] = useState<Record<string, number>>({});
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [omitidos, setOmitidos] = useState<Set<string>>(new Set());
  const [sobr, setSobr] = useState<Record<string, { id: string; total: number; reutiliza: string }>>({});
  const [mermaProd, setMermaProd] = useState<Record<string, string>>({});
  const [costos, setCostos] = useState<Record<string, number>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setErr(null);

    const [req, ped, om, sob, mpr, lot] = await Promise.all([
      supabase.from("requerimientos").select("id").eq("fecha", fecha).maybeSingle(),
      supabase
        .from("pedidos")
        .select("id, cliente, hora_entrega, pedido_items(producto_id, cantidad)")
        .eq("fecha_entrega", fecha)
        .neq("estado", "cancelado"),
      supabase.from("puntos_omitidos").select("punto_venta_id").eq("fecha", fecha),
      supabase
        .from("sobrantes")
        .select("id, producto_id, cantidad, cantidad_reutilizable")
        .eq("fecha", ayer)
        .order("cantidad", { ascending: false }),
      supabase.from("mermas").select("producto_id, cantidad").eq("fecha", fecha).eq("tipo", "produccion"),
      supabase.from("lotes_produccion").select("producto_id, costo_unitario").order("fecha", { ascending: false }),
    ]);

    const omit = new Set(((om.data ?? []) as any[]).map((x) => x.punto_venta_id));
    setOmitidos(omit);

    const m: Record<string, number> = {};
    if (req.data) {
      const { data: its } = await supabase
        .from("requerimiento_items")
        .select("producto_id, destino_punto_id, cantidad")
        .eq("requerimiento_id", req.data.id)
        .not("destino_punto_id", "is", null);
      (its ?? []).forEach((i: any) => {
        if (omit.has(i.destino_punto_id)) return;
        m[`${i.destino_punto_id}|${i.producto_id}`] = Number(i.cantidad);
      });
    }
    setCeldas(m);
    setPedidos((ped.data ?? []) as any[]);

    // sobrante de ayer: se agrupa por producto y se guarda la fila más grande
    const s: Record<string, { id: string; total: number; reutiliza: string }> = {};
    ((sob.data ?? []) as any[]).forEach((x) => {
      const prod = x.producto_id;
      if (!s[prod]) {
        s[prod] = {
          id: x.id,
          total: Number(x.cantidad),
          reutiliza:
            x.cantidad_reutilizable === null ? String(Number(x.cantidad)) : String(Number(x.cantidad_reutilizable)),
        };
      } else {
        s[prod].total += Number(x.cantidad);
      }
    });
    setSobr(s);

    const mp: Record<string, string> = {};
    ((mpr.data ?? []) as any[]).forEach((x) => {
      mp[x.producto_id] = String(Number(x.cantidad));
    });
    setMermaProd(mp);

    const c: Record<string, number> = {};
    ((lot.data ?? []) as any[]).forEach((x) => {
      if (c[x.producto_id] === undefined) c[x.producto_id] = Number(x.costo_unitario ?? 0);
    });
    setCostos(c);

    setCargando(false);
  }, [fecha, ayer]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const fijos = puntos.filter((p) => p.es_fijo);
  const eventuales = puntos.filter((p) => !p.es_fijo);

  const conDato = (p: Punto) =>
    productos.some((pr) => Number(celdas[`${p.id}|${pr.id}`] || 0) > 0);

  const filasFijas = fijos.filter((p) => !omitidos.has(p.id) && conDato(p));
  const filasEventuales = eventuales.filter((p) => !omitidos.has(p.id) && conDato(p));

  const totalCol = (prodId: string) =>
    [...filasFijas, ...filasEventuales].reduce(
      (a, p) => a + Number(celdas[`${p.id}|${prodId}`] || 0),
      0,
    ) +
    pedidos.reduce(
      (a, p) =>
        a +
        (p.pedido_items ?? [])
          .filter((i: any) => i.producto_id === prodId)
          .reduce((b: number, i: any) => b + Number(i.cantidad), 0),
      0,
    );

  const sobranteDe = (prodId: string) => Number(sobr[prodId]?.reutiliza || 0);
  const mermaSobrante = (prodId: string) =>
    Math.max(0, Number(sobr[prodId]?.total || 0) - sobranteDe(prodId));
  const aProducir = (prodId: string) => Math.max(0, totalCol(prodId) - sobranteDe(prodId));
  const mermaProdDe = (prodId: string) => Number(mermaProd[prodId] || 0);
  const aHornear = (prodId: string) => aProducir(prodId) + mermaProdDe(prodId);

  const conMovimiento = productos.filter(
    (p) => totalCol(p.id) > 0 || sobranteDe(p.id) > 0 || Number(sobr[p.id]?.total || 0) > 0 || mermaProdDe(p.id) > 0,
  );

  const sum = (fn: (id: string) => number) => conMovimiento.reduce((a, p) => a + fn(p.id), 0);
  const valorMerma = useMemo(
    () =>
      conMovimiento.reduce(
        (a, p) => a + (mermaSobrante(p.id) + mermaProdDe(p.id)) * (costos[p.id] ?? 0),
        0,
      ),
    [conMovimiento, sobr, mermaProd, costos],
  );

  async function guardarTodo() {
    setErr(null);
    setMsg(null);
    setGuardando(true);

    // 1. sobrantes reutilizables + su merma
    for (const p of conMovimiento) {
      const reg = sobr[p.id];
      if (!reg) continue;
      const reutiliza = Math.min(Math.max(Number(reg.reutiliza || 0), 0), reg.total);
      const merma = Math.max(0, reg.total - reutiliza);

      await supabase.from("sobrantes").update({ cantidad_reutilizable: reutiliza }).eq("id", reg.id);

      await supabase
        .from("mermas")
        .delete()
        .eq("fecha", ayer)
        .eq("producto_id", p.id)
        .eq("tipo", "devolucion");

      if (merma > 0) {
        await supabase.from("mermas").insert({
          fecha: ayer,
          producto_id: p.id,
          cantidad: merma,
          tipo: "devolucion",
          motivo: "roto",
          nota: "Merma de sobrante no apto",
        });
      }
    }

    // 2. merma de producción del día
    for (const p of conMovimiento) {
      await supabase.from("mermas").delete().eq("fecha", fecha).eq("producto_id", p.id).eq("tipo", "produccion");
      const q = Number(mermaProd[p.id] || 0);
      if (q > 0) {
        await supabase.from("mermas").insert({
          fecha,
          producto_id: p.id,
          cantidad: q,
          tipo: "produccion",
          motivo: "otro",
          nota: "Merma registrada en producción",
        });
      }
    }

    setGuardando(false);
    setMsg("Registro guardado. La producción del día ya está actualizada.");
    cargar();
  }

  if (cargando) {
    return (
      <div className="card">
        <h2>Hoja de producción del día</h2>
        <p className="empty">Cargando…</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="row" style={{ marginBottom: 10 }}>
        <h2 style={{ margin: 0 }}>Hoja de producción del día</h2>
        <button className="btn btn-sm" onClick={cargar} type="button">
          Actualizar
        </button>
      </div>

      {err && <div className="alert err">{err}</div>}
      {msg && <div className="alert ok">{msg}</div>}

      {conMovimiento.length === 0 ? (
        <p className="empty">No hay programación ni sobrantes para esta fecha.</p>
      ) : (
        <div className="table-wrap">
          <table className="grid-prog">
            <thead>
              <tr>
                <th className="sticky" style={{ minWidth: 132 }}>Cliente</th>
                {conMovimiento.map((p) => (
                  <th key={p.id} className="prod" title={p.nombre}>
                    {p.codigo ?? p.nombre}
                  </th>
                ))}
                <th className="num">Tot</th>
              </tr>
            </thead>
            <tbody>
              {filasFijas.map((pv) => (
                <tr key={pv.id}>
                  <td className="sticky">{pv.codigo}</td>
                  {conMovimiento.map((p) => {
                    const v = Number(celdas[`${pv.id}|${p.id}`] || 0);
                    return <td key={p.id} className="num">{v > 0 ? v : ""}</td>;
                  })}
                  <td className="num">
                    <strong>
                      {numero(conMovimiento.reduce((a, p) => a + Number(celdas[`${pv.id}|${p.id}`] || 0), 0)) || ""}
                    </strong>
                  </td>
                </tr>
              ))}

              {(filasEventuales.length > 0 || pedidos.length > 0) && (
                <tr>
                  <td colSpan={conMovimiento.length + 2} style={{ background: "#fdf4f7", fontWeight: 700, fontSize: 12 }}>
                    EVENTUALES / PEDIDOS
                  </td>
                </tr>
              )}

              {filasEventuales.map((pv) => (
                <tr key={pv.id} style={{ background: "#fffafc" }}>
                  <td className="sticky">{pv.codigo}</td>
                  {conMovimiento.map((p) => {
                    const v = Number(celdas[`${pv.id}|${p.id}`] || 0);
                    return <td key={p.id} className="num">{v > 0 ? v : ""}</td>;
                  })}
                  <td className="num">
                    <strong>
                      {numero(conMovimiento.reduce((a, p) => a + Number(celdas[`${pv.id}|${p.id}`] || 0), 0)) || ""}
                    </strong>
                  </td>
                </tr>
              ))}

              {pedidos.map((p) => (
                <tr key={`ped-${p.id}`} style={{ background: "#fffafc" }}>
                  <td className="sticky">🎂 {p.cliente}</td>
                  {conMovimiento.map((pr) => {
                    const q = (p.pedido_items ?? [])
                      .filter((i: any) => i.producto_id === pr.id)
                      .reduce((a: number, i: any) => a + Number(i.cantidad), 0);
                    return <td key={pr.id} className="num">{q > 0 ? q : ""}</td>;
                  })}
                  <td className="num">
                    <strong>
                      {(p.pedido_items ?? []).reduce((a: number, i: any) => a + Number(i.cantidad), 0)}
                    </strong>
                  </td>
                </tr>
              ))}

              <tr>
                <td className="sticky"><strong>Total programado</strong></td>
                {conMovimiento.map((p) => (
                  <td key={p.id} className="num"><strong>{totalCol(p.id) || ""}</strong></td>
                ))}
                <td className="num"><strong>{numero(sum(totalCol))}</strong></td>
              </tr>

              <tr style={{ background: "#f7fbf8" }}>
                <td className="sticky" style={{ fontSize: 12.5 }}>Sobrante de ayer (útil)</td>
                {conMovimiento.map((p) => (
                  <td key={p.id} style={{ padding: 2 }}>
                    <input
                      className="num"
                      type="number"
                      min="0"
                      max={sobr[p.id]?.total ?? 0}
                      step="1"
                      value={sobr[p.id]?.reutiliza ?? ""}
                      onChange={(e) =>
                        setSobr((s) => ({
                          ...s,
                          [p.id]: {
                            id: s[p.id]?.id ?? "",
                            total: s[p.id]?.total ?? 0,
                            reutiliza: e.target.value,
                          },
                        }))
                      }
                      disabled={!sobr[p.id]}
                      title={sobr[p.id] ? `Sobrante total: ${numero(sobr[p.id].total)}` : "Sin sobrante"}
                    />
                  </td>
                ))}
                <td className="num">{numero(sum(sobranteDe))}</td>
              </tr>

              <tr style={{ background: "#fff7f5" }}>
                <td className="sticky" style={{ fontSize: 12.5 }}>Merma de sobrante</td>
                {conMovimiento.map((p) => (
                  <td key={p.id} className="num" style={{ fontSize: 12.5 }}>
                    {mermaSobrante(p.id) ? (
                      <span className="badge danger">{numero(mermaSobrante(p.id))}</span>
                    ) : (
                      ""
                    )}
                  </td>
                ))}
                <td className="num">{numero(sum(mermaSobrante))}</td>
              </tr>

              <tr style={{ background: "#fdf8ec" }}>
                <td className="sticky"><strong>A producir</strong></td>
                {conMovimiento.map((p) => (
                  <td key={p.id} className="num"><strong>{aProducir(p.id) || ""}</strong></td>
                ))}
                <td className="num"><strong>{numero(sum(aProducir))}</strong></td>
              </tr>

              <tr style={{ background: "#fff7f5" }}>
                <td className="sticky" style={{ fontSize: 12.5 }}>Merma de producción</td>
                {conMovimiento.map((p) => (
                  <td key={p.id} style={{ padding: 2 }}>
                    <input
                      className="num"
                      type="number"
                      min="0"
                      step="1"
                      value={mermaProd[p.id] ?? ""}
                      onChange={(e) => setMermaProd((m) => ({ ...m, [p.id]: e.target.value }))}
                      placeholder="0"
                    />
                  </td>
                ))}
                <td className="num">{numero(sum(mermaProdDe))}</td>
              </tr>

              <tr style={{ background: "#eef7f1" }}>
                <td className="sticky"><strong>Total a hornear</strong></td>
                {conMovimiento.map((p) => (
                  <td key={p.id} className="num"><strong>{aHornear(p.id) || ""}</strong></td>
                ))}
                <td className="num"><strong>{numero(sum(aHornear))}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 12, flexWrap: "wrap" }}>
        <button className="btn btn-primary" onClick={guardarTodo} disabled={guardando}>
          {guardando ? "Guardando…" : "Guardar hoja"}
        </button>
        <span className="sub" style={{ margin: 0 }}>
          Merma valorizada del día: <strong>{soles(valorMerma)}</strong>
        </span>
      </div>

      <p className="sub" style={{ margin: "8px 4px 0", fontSize: 12 }}>
        El sobrante de ayer se edita en la fila verde: lo que no sirva se registra como merma.
        El total a hornear = (programado − sobrante útil) + merma de producción.
      </p>
    </div>
  );
}
