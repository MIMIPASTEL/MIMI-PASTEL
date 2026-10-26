"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Shell from "@/components/Shell";
import { supabase, soles, hoyISO } from "@/lib/supabase";

type Prod = { id: string; codigo: string | null; nombre: string; orden: number | null };
type Punto = { id: string; codigo: string; nombre: string; orden: number | null };
type Fila = { producto_id: string; codigo: string; precio: string; cantidad: string };

export default function RepartosPage() {
  const [fecha, setFecha] = useState(hoyISO());
  const [puntos, setPuntos] = useState<Punto[]>([]);
  const [puntoId, setPuntoId] = useState("");
  const [productos, setProductos] = useState<Prod[]>([]);
  const [filas, setFilas] = useState<Fila[]>([]);
  const [tipoPrecio, setTipoPrecio] = useState<"directo" | "distribuidor">("directo");
  const [descuento, setDescuento] = useState("");
  const [efectivo, setEfectivo] = useState("");
  const [yape, setYape] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [saldos, setSaldos] = useState<any[]>([]);
  const [preciosMap, setPreciosMap] = useState<Record<string, any>>({});

  const cargar = useCallback(async () => {
    const [pv, pr, pc, ps] = await Promise.all([
      supabase.from("puntos_venta").select("id, codigo, nombre, orden").eq("tipo", "repartos").eq("es_fijo", true).order("orden"),
      supabase.from("productos").select("id, codigo, nombre, orden").eq("activo", true).order("orden"),
      supabase.from("precios_cliente").select("producto_id, precio, tipo_cliente, presentaciones!inner(nombre, activo)"),
      supabase.from("presentaciones").select("id, producto_id, nombre, es_default, activo").eq("activo", true),
    ]);

    setPuntos((pv.data ?? []) as Punto[]);
    if (!puntoId && pv.data?.length) setPuntoId(pv.data[0].id);

    const prods = (pr.data ?? []) as Prod[];
    setProductos(prods);

    const precios: Record<string, any> = {};
    ((pc.data ?? []) as any[]).forEach((x) => {
      if (x.presentaciones?.nombre !== "Unidad") return;
      precios[x.producto_id] = precios[x.producto_id] ?? {};
      precios[x.producto_id][x.tipo_cliente] = Number(x.precio);
    });
    setPreciosMap(precios);

    setFilas(
      prods.map((p) => ({
        producto_id: p.id,
        codigo: p.codigo ?? p.nombre,
        precio: precios[p.id]?.[tipoPrecio] ? String(precios[p.id][tipoPrecio]) : "2",
        cantidad: "",
      })),
    );

    // saldos por cobrar de repartos
    const pids = (pv.data ?? []).map((x: any) => x.id);
    if (pids.length) {
      const [vs, pgs] = await Promise.all([
        supabase.from("ventas").select("punto_venta_id, total").in("punto_venta_id", pids),
        supabase.from("pagos").select("punto_venta_id, monto").in("punto_venta_id", pids),
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
        (pv.data ?? []).map((x: any) => {
          const a = acc[x.id] ?? { total: 0, pagado: 0 };
          return { codigo: x.codigo, total: a.total, pagado: a.pagado, saldo: a.total - a.pagado };
        }),
      );
    }
  }, [puntoId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    setFilas((fs) =>
      fs.map((f) => {
        const pr = preciosMap[f.producto_id]?.[tipoPrecio];
        return pr !== undefined ? { ...f, precio: String(pr) } : f;
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipoPrecio, preciosMap]);

  const set = (i: number, campo: keyof Fila, v: string) =>
    setFilas((f) => f.map((x, j) => (j === i ? { ...x, [campo]: v } : x)));

  const bruto = useMemo(
    () =>
      filas.reduce((a, f) => {
        const c = Number(f.cantidad || 0);
        return a + c * Number(f.precio || 0);
      }, 0),
    [filas],
  );
  const desc = Number(descuento || 0);
  const total = Math.max(0, bruto - desc);
  const cobrado = Number(efectivo || 0) + Number(yape || 0);
  const credito = Math.max(0, total - cobrado);

  async function guardar() {
    setErr(null);
    setMsg(null);
    if (!puntoId) return setErr("Elige el cliente.");
    const items = filas.filter((f) => Number(f.cantidad || 0) > 0);
    if (items.length === 0) return setErr("Ingresa al menos un producto.");

    setGuardando(true);
    const { data: venta, error } = await supabase
      .from("ventas")
      .insert({
        fecha,
        punto_venta_id: puntoId,
        turno: null,
        total,
        descuento: desc,
        promociones: 0,
      })
      .select("id")
      .single();

    if (error) {
      setGuardando(false);
      return setErr(error.message);
    }

    await supabase.from("venta_items").insert(
      items.map((f) => ({
        venta_id: venta.id,
        producto_id: f.producto_id,
        cantidad: Number(f.cantidad),
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
    setMsg(`Reparto guardado · total ${soles(total)}${credito > 0 ? ` · crédito ${soles(credito)}` : ""}`);
    setFilas((f) => f.map((x) => ({ ...x, cantidad: "" })));
    setDescuento("");
    setEfectivo("");
    setYape("");
    cargar();
  }

  const punto = puntos.find((p) => p.id === puntoId);

  return (
    <Shell>
    <>
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
            <select
              className="input"
              value={tipoPrecio}
              onChange={(e) => setTipoPrecio(e.target.value as any)}
            >
              <option value="directo">Directo</option>
              <option value="distribuidor">Distribuidor</option>
            </select>
          </div>
        </div>

        {err && <div className="alert err">{err}</div>}
        {msg && <div className="alert ok">{msg}</div>}

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
              {filas.map((f, i) => {
                const c = Number(f.cantidad || 0);
                if (i > 40) return null;
                return (
                  <tr key={f.producto_id}>
                    <td><strong>{f.codigo}</strong></td>
                    <td className="num">
                      <input
                        className="input num"
                        type="number"
                        min="0"
                        step="0.0001"
                        value={f.precio}
                        onChange={(e) => set(i, "precio", e.target.value)}
                        style={{ width: 92 }}
                      />
                    </td>
                    <td className="num">
                      <input
                        className="input num"
                        type="number"
                        min="0"
                        step="1"
                        value={f.cantidad}
                        onChange={(e) => set(i, "cantidad", e.target.value)}
                        style={{ width: 84 }}
                      />
                    </td>
                    <td className="num">{soles(c * Number(f.precio || 0))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h2>Cobro</h2>
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
            <label className="f">Yape</label>
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
        <p className="sub" style={{ margin: "10px 4px 0", fontSize: 12 }}>
          El crédito queda como saldo pendiente del cliente hasta que se registre su cobro.
        </p>
      </div>
    </>
    </Shell>
  );
}
