"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase, numero } from "@/lib/supabase";

type Prod = { id: string; codigo?: string | null; nombre: string };
type Punto = { id: string; codigo: string; es_fijo?: boolean };

function restarDia(iso: string) {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() - 1);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export default function ParrillaPrograma({
  fecha,
  productos,
  puntos,
}: {
  fecha: string;
  productos: Prod[];
  puntos: Punto[];
}) {
  const [celdas, setCeldas] = useState<Record<string, number>>({});
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [sobrante, setSobrante] = useState<Record<string, number>>({});
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    const [req, ped, sug, om] = await Promise.all([
      supabase.from("requerimientos").select("id").eq("fecha", fecha).maybeSingle(),
      supabase
        .from("pedidos")
        .select("id, cliente, pedido_items(producto_id, cantidad)")
        .eq("fecha_entrega", fecha)
        .neq("estado", "cancelado"),
      supabase.from("sobrantes").select("producto_id, punto_venta_id, cantidad, cantidad_reutilizable").eq("fecha", restarDia(fecha)),
      supabase.from("puntos_omitidos").select("punto_venta_id").eq("fecha", fecha),
    ]);

    const omitidos = new Set(((om.data ?? []) as any[]).map((x) => x.punto_venta_id));
    const m: Record<string, number> = {};

    if (req.data) {
      const { data: its } = await supabase
        .from("requerimiento_items")
        .select("producto_id, destino_punto_id, cantidad")
        .eq("requerimiento_id", req.data.id)
        .not("destino_punto_id", "is", null);
      (its ?? []).forEach((i: any) => {
        if (omitidos.has(i.destino_punto_id)) return;
        m[`${i.destino_punto_id}|${i.producto_id}`] = Number(i.cantidad);
      });
    }
    setCeldas(m);
    setPedidos((ped.data ?? []) as any[]);

    const { data: pts } = await supabase
      .from("puntos_venta")
      .select("id, turno, tipo")
      .eq("tipo", "maxiahorro");
    const maxTurno = ((pts ?? []) as any[]).reduce((a, x) => Math.max(a, Number(x.turno ?? 0)), 0);
    const ultimo = ((pts ?? []) as any[]).find((x) => Number(x.turno ?? 0) === maxTurno)?.id ?? null;

    const sm: Record<string, number> = {};
    ((sug.data ?? []) as any[]).forEach((x) => {
      if (ultimo && x.punto_venta_id !== ultimo) return;
      const util = x.cantidad_reutilizable === null ? Number(x.cantidad) : Number(x.cantidad_reutilizable);
      sm[x.producto_id] = (sm[x.producto_id] ?? 0) + util;
    });
    setSobrante(sm);
    setCargando(false);
  }, [fecha]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const visibles = useMemo(() => {
    const conDato = new Set(
      Object.entries(celdas)
        .filter(([, v]) => Number(v) > 0)
        .map(([k]) => k.split("|")[0]),
    );
    const con = puntos.filter((p) => conDato.has(p.id));
    return con.length > 0 ? con : puntos.filter((p) => p.es_fijo !== false);
  }, [puntos, celdas]);

  const totalCol = (prodId: string) =>
    visibles.reduce((a, p) => a + Number(celdas[`${p.id}|${prodId}`] || 0), 0) +
    pedidos.reduce(
      (a, p) =>
        a +
        (p.pedido_items ?? [])
          .filter((i: any) => i.producto_id === prodId)
          .reduce((b: number, i: any) => b + Number(i.cantidad), 0),
      0,
    );

  const totalPedido = (p: any) =>
    (p.pedido_items ?? []).reduce((a: number, i: any) => a + Number(i.cantidad), 0);

  const totalSobrante = Object.values(sobrante).reduce((a, b) => a + Number(b), 0);
  const granTotal = productos.reduce((a, p) => a + totalCol(p.id), 0);
  const granProducir = productos.reduce(
    (a, p) => a + Math.max(0, totalCol(p.id) - (sobrante[p.id] ?? 0)),
    0,
  );

  if (cargando) {
    return (
      <div className="card">
        <h2>Programación del día</h2>
        <p className="empty">Cargando…</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="row" style={{ marginBottom: 10 }}>
        <h2 style={{ margin: 0 }}>2 · Programación del día</h2>
        <button className="btn btn-sm" onClick={cargar} type="button">
          Actualizar
        </button>
      </div>
      <p className="sub" style={{ marginTop: -6 }}>
        El mismo formato de la pestaña Programar. Aquí solo se consulta.
      </p>

      {visibles.length === 0 ? (
        <p className="empty">No hay programación para esta fecha.</p>
      ) : (
        <div className="table-wrap">
          <table className="grid-prog">
            <thead>
              <tr>
                <th className="sticky" style={{ minWidth: 110 }}>Cliente</th>
                {productos.map((p) => (
                  <th key={p.id} className="prod" title={p.nombre}>
                    {p.codigo ?? p.nombre}
                  </th>
                ))}
                <th className="num">Tot</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((pv) => (
                <tr key={pv.id}>
                  <td className="sticky">{pv.codigo}</td>
                  {productos.map((p) => {
                    const v = Number(celdas[`${pv.id}|${p.id}`] || 0);
                    return (
                      <td key={p.id} className="num">
                        {v > 0 ? v : ""}
                      </td>
                    );
                  })}
                  <td className="num">
                    <strong>
                      {numero(productos.reduce((a, p) => a + Number(celdas[`${pv.id}|${p.id}`] || 0), 0)) || ""}
                    </strong>
                  </td>
                </tr>
              ))}

              {pedidos.map((p) => (
                <tr key={`ped-${p.id}`} style={{ background: "#fdf4f7" }}>
                  <td className="sticky">🎂 {p.cliente}</td>
                  {productos.map((pr) => {
                    const q = (p.pedido_items ?? [])
                      .filter((i: any) => i.producto_id === pr.id)
                      .reduce((a: number, i: any) => a + Number(i.cantidad), 0);
                    return (
                      <td key={pr.id} className="num">
                        {q > 0 ? q : ""}
                      </td>
                    );
                  })}
                  <td className="num"><strong>{totalPedido(p)}</strong></td>
                </tr>
              ))}

              <tr>
                <td className="sticky"><strong>Total</strong></td>
                {productos.map((p) => (
                  <td key={p.id} className="num"><strong>{totalCol(p.id) || ""}</strong></td>
                ))}
                <td className="num"><strong>{numero(granTotal)}</strong></td>
              </tr>

              {totalSobrante > 0 && (
                <>
                  <tr style={{ background: "#f7fbf8" }}>
                    <td className="sticky" style={{ fontSize: 12.5 }}>− Sobrante útil</td>
                    {productos.map((p) => (
                      <td key={p.id} className="num" style={{ fontSize: 12.5 }}>
                        {sobrante[p.id] ? numero(sobrante[p.id]) : ""}
                      </td>
                    ))}
                    <td className="num" style={{ fontSize: 12.5 }}>{numero(totalSobrante)}</td>
                  </tr>
                  <tr style={{ background: "#fdf8ec" }}>
                    <td className="sticky"><strong>A producir</strong></td>
                    {productos.map((p) => {
                      const es = Math.max(0, totalCol(p.id) - (sobrante[p.id] ?? 0));
                      return (
                        <td key={p.id} className="num">
                          <strong>{es > 0 ? numero(es) : ""}</strong>
                        </td>
                      );
                    })}
                    <td className="num"><strong>{numero(granProducir)}</strong></td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
