"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Shell from "@/components/Shell";
import { supabase, soles, hoyISO } from "@/lib/supabase";

type Punto = { id: string; codigo: string; nombre: string; orden: number | null };
type Fila = { producto_id: string; codigo: string; precio: string; cantidad: number };

export default function RepartosPage() {
  const [fecha, setFecha] = useState(hoyISO());
  const [puntos, setPuntos] = useState<Punto[]>([]);
  const [puntoId, setPuntoId] = useState("");
  const [filas, setFilas] = useState<Fila[]>([]);
  const [descuento, setDescuento] = useState("");
  const [efectivo, setEfectivo] = useState("");
  const [yape, setYape] = useState("");
  const [yaGuardado, setYaGuardado] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [saldos, setSaldos] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargarPuntos = useCallback(async () => {
    const { data } = await supabase
      .from("puntos_venta")
      .select("id, codigo, nombre, orden")
      .eq("tipo", "repartos")
      .eq("es_fijo", true)
      .order("orden");
    setPuntos((data ?? []) as Punto[]);
    if (!puntoId && data?.length) setPuntoId(data[0].id);
  }, [puntoId]);

  useEffect(() => {
    cargarPuntos();
  }, [cargarPuntos]);

  const cargarSaldos = useCallback(async () => {
    const { data: pv } = await supabase
      .from("puntos_venta")
      .select("id, codigo")
      .eq("tipo", "repartos")
      .eq("es_fijo", true)
      .order("orden");
    const lista = (pv ?? []) as any[];
    if (!lista.length) return;
    const ids = lista.map((x) => x.id);

    const [vs, pgs] = await Promise.all([
      supabase.from("ventas").select("punto_venta_id, total").in("punto_venta_id", ids),
      supabase.from("pagos").select("punto_venta_id, monto").in("punto_venta_id", ids),
    ]);

    const acc: Record<string, { total: number; pagado: number }> = {};
    (vs.data ?? []).forEach((v: any) => {
      acc[v.punto_venta_id] = acc[v.punto_venta_id] ?? { total: 0, pagado: 0 };
      acc[v.punto_venta_id].total += Number(v.total);
    });
    (pgs.data ?? []).forEach((g: any) => {
      if (!g.punto_venta_id) return;
      acc[g.punto_venta_id] = acc[g.punto_venta_id] ?? { total: 0, pagado: 0 };
      acc[g.punto_venta_id].pagado += Number(g.monto);
    });

    setSaldos(
      lista.map((x) => {
        const a = acc[x.id] ?? { total: 0, pagado: 0 };
        return { codigo: x.codigo, total: a.total, pagado: a.pagado, saldo: a.total - a.pagado };
      }),
    );
  }, []);

  useEffect(() => {
    cargarSaldos();
  }, [cargarSaldos]);

  // lo programado para este cliente en esta fecha + el cobro ya guardado
  useEffect(() => {
    async function traer() {
      if (!puntoId || !fecha) return;
      setCargando(true);
      setMsg(null);
      setErr(null);

      const { data: req } = await supabase
        .from("requerimientos")
        .select("id")
        .eq("fecha", fecha)
        .maybeSingle();

      let programado: Record<string, number> = {};
      if (req) {
        const { data: its } = await supabase
          .from("requerimiento_items")
          .select("producto_id, cantidad")
          .eq("requerimiento_id", req.id)
          .eq("destino_punto_id", puntoId);
        ((its ?? []) as any[]).forEach((x) => {
          programado[x.producto_id] = (programado[x.producto_id] ?? 0) + Number(x.cantidad);
        });
      }

      const ids = Object.keys(programado);
      if (!ids.length) {
        setFilas([]);
        setCargando(false);
        return;
      }

      const [pr, pc] = await Promise.all([
        supabase.from("productos").select("id, codigo, nombre, orden").in("id", ids),
        supabase
          .from("precios_cliente")
          .select("producto_id, precio, tipo_cliente, presentaciones!inner(nombre)"),
      ]);

      const precios: Record<string, number> = {};
      ((pc.data ?? []) as any[]).forEach((x) => {
        if (x.presentaciones?.nombre === "Unidad" && x.tipo_cliente === "distribuidor") {
          precios[x.producto_id] = Number(x.precio);
        }
      });

      const lista = ((pr.data ?? []) as any[])
        .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
        .map((p) => ({
          producto_id: p.id,
          codigo: p.codigo ?? p.nombre,
          precio: String(precios[p.id] ?? 1.6667),
          cantidad: programado[p.id] ?? 0,
        }));

      setFilas(lista);

      // cobro guardado de ese dia
      const { data: vs } = await supabase
        .from("ventas")
        .select("id, descuento")
        .eq("fecha", fecha)
        .eq("punto_venta_id", puntoId);

      if (vs?.length) {
        const vids = vs.map((v: any) => v.id);
        const { data: pgs } = await supabase.from("pagos").select("medio, monto").in("venta_id", vids);
        let ef = 0;
        let yp = 0;
        ((pgs ?? []) as any[]).forEach((g) => {
          if (g.medio === "efectivo") ef += Number(g.monto);
          if (g.medio === "yape") yp += Number(g.monto);
        });
        const desc = vs.reduce((a: number, v: any) => a + Number(v.descuento ?? 0), 0);
        setDescuento(desc ? String(desc) : "");
        setEfectivo(ef ? String(ef) : "");
        setYape(yp ? String(yp) : "");
        setYaGuardado(true);
      } else {
        setDescuento("");
        setEfectivo("");
        setYape("");
        setYaGuardado(false);
      }

      setCargando(false);
    }
    traer();
  }, [fecha, puntoId]);

  const bruto = useMemo(
    () => filas.reduce((a, f) => a + f.cantidad * Number(f.precio || 0), 0),
    [filas],
  );
  const desc = Number(descuento || 0);
  const total = Math.max(0, bruto - desc);
  const cobrado = Number(efectivo || 0) + Number(yape || 0);
  const credito = Math.max(0, total - cobrado);

  async function guardar() {
    setErr(null);
    setMsg(null);
    if (!puntoId || filas.length === 0) return setErr("No hay productos programados para este cliente.");

    setGuardando(true);

    // reemplaza el reparto de ese dia
    await supabase.from("ventas").delete().eq("fecha", fecha).eq("punto_venta_id", puntoId);

    const { data: venta, error } = await supabase
      .from("ventas")
      .insert({ fecha, punto_venta_id: puntoId, turno: null, total, descuento: desc, promociones: 0 })
      .select("id")
      .single();

    if (error) {
      setGuardando(false);
      return setErr(error.message);
    }

    await supabase.from("venta_items").insert(
      filas.map((f) => ({
        venta_id: venta.id,
        producto_id: f.producto_id,
        cantidad: f.cantidad,
        precio_unitario: Number(f.precio),
      })),
    );

    const pagos: any[] = [];
    if (Number(efectivo || 0) > 0)
      pagos.push({ venta_id: venta.id, punto_venta_id: puntoId, fecha, medio: "efectivo", monto: Number(efectivo) });
    if (Number(yape || 0) > 0)
      pagos.push({ venta_id: venta.id, punto_venta_id: puntoId, fecha, medio: "yape", monto: Number(yape) });
    if (pagos.length) await supabase.from("pagos").insert(pagos);

    setGuardando(false);
    setYaGuardado(true);
    setMsg(`Reparto guardado · total ${soles(total)}${credito > 0 ? ` · crédito ${soles(credito)}` : ""}`);
    cargarSaldos();
  }

  const punto = puntos.find((p) => p.id === puntoId);

  return (
    <Shell>
      <div className="card">
        <h2>Venta de reparto</h2>
        <div className="grid grid-3">
          <div className="field">
            <label className="f">Fecha</label>
            <input className="input" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>
          <div className="field">
            <label className="f">Cliente</label>
            <select className="input" value={puntoId} onChange={(e) => setPuntoId(e.target.value)}>
              {puntos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.codigo}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="f">Lista de precios</label>
            <div className="input num" style={{ background: "#f7f3ef" }}>Distribuidor</div>
          </div>
        </div>

        {err && <div className="alert err">{err}</div>}
        {msg && <div className="alert ok">{msg}</div>}

        {cargando ? (
          <p className="empty">Cargando lo programado…</p>
        ) : filas.length === 0 ? (
          <p className="empty">No hay productos programados para este cliente en esta fecha.</p>
        ) : (
          <div className="table-wrap" style={{ marginTop: 10 }}>
            <table>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th className="num">Precio</th>
                  <th className="num">Cantidad</th>
                  <th className="num">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((f) => (
                  <tr key={f.producto_id}>
                    <td><strong>{f.codigo}</strong></td>
                    <td className="num">{soles(Number(f.precio))}</td>
                    <td className="num"><strong>{f.cantidad}</strong></td>
                    <td className="num">{soles(f.cantidad * Number(f.precio))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {filas.length > 0 && (
        <div className="card">
          <h2>Cobro{yaGuardado ? " · guardado" : ""}</h2>
          <div className="grid grid-3">
            <div className="field">
              <label className="f">Descuento (S/)</label>
              <input className="input num" type="number" min="0" step="0.1" value={descuento} onChange={(e) => setDescuento(e.target.value)} placeholder="0.00" />
            </div>
            <div className="field">
              <label className="f">Efectivo</label>
              <input className="input num" type="number" min="0" step="0.1" value={efectivo} onChange={(e) => setEfectivo(e.target.value)} placeholder="0.00" />
            </div>
            <div className="field">
              <label className="f">Yape / Plin</label>
              <input className="input num" type="number" min="0" step="0.1" value={yape} onChange={(e) => setYape(e.target.value)} placeholder="0.00" />
            </div>
          </div>

          <div className="grid grid-4" style={{ marginTop: 6 }}>
            <div className="kpi">
              <div className="label">Venta bruta</div>
              <div className="value" style={{ fontSize: 17 }}>{soles(bruto)}</div>
            </div>
            <div className="kpi">
              <div className="label">Descuento</div>
              <div className="value" style={{ fontSize: 17 }}>−{soles(desc)}</div>
            </div>
            <div className="kpi">
              <div className="label">Total</div>
              <div className="value" style={{ fontSize: 17 }}>{soles(total)}</div>
            </div>
            <div className="kpi accent">
              <div className="label">Crédito</div>
              <div className="value" style={{ fontSize: 17, color: credito > 0 ? "var(--danger)" : "var(--ok)" }}>
                {soles(credito)}
              </div>
              <div className="hint">total − efectivo − yape</div>
            </div>
          </div>

          <button className="btn btn-primary btn-block" onClick={guardar} disabled={guardando} style={{ marginTop: 10 }}>
            {guardando ? "Guardando…" : `Guardar reparto${punto ? " · " + punto.codigo : ""}`}
          </button>
        </div>
      )}

      <div className="card">
        <h2>Saldos por cobrar</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th className="num">Vendido</th>
                <th className="num">Pagado</th>
                <th className="num">Por cobrar</th>
              </tr>
            </thead>
            <tbody>
              {saldos.map((s) => (
                <tr key={s.codigo}>
                  <td><strong>{s.codigo}</strong></td>
                  <td className="num">{soles(s.total)}</td>
                  <td className="num">{soles(s.pagado)}</td>
                  <td className="num" style={{ color: s.saldo > 0 ? "var(--danger)" : "var(--ok)" }}>
                    {soles(s.saldo)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Shell>
  );
}
