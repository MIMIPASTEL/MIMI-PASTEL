"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase, soles, numero } from "@/lib/supabase";

export default function SalidasTaller({
  fecha,
  productos,
}: {
  fecha: string;
  productos: any[];
}) {
  const [productoId, setProductoId] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [tipo, setTipo] = useState<"venta" | "muestra">("venta");
  const [medio, setMedio] = useState("efectivo");
  const [precios, setPrecios] = useState<Record<string, number>>({});
  const [lista, setLista] = useState<any[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    const [pr, pv, mer, vts] = await Promise.all([
      supabase
        .from("precios_cliente")
        .select("producto_id, precio, tipo_cliente, presentaciones!inner(nombre)"),
      supabase.from("puntos_venta").select("id").eq("codigo", "TALLER").maybeSingle(),
      supabase.from("mermas").select("id, producto_id, cantidad, tipo").eq("fecha", fecha).eq("tipo", "muestra"),
      supabase
        .from("ventas")
        .select("id, total, venta_items(producto_id, cantidad), puntos_venta!inner(codigo)")
        .eq("fecha", fecha)
        .eq("puntos_venta.codigo", "TALLER"),
    ]);

    const map: Record<string, number> = {};
    ((pr.data ?? []) as any[]).forEach((x) => {
      if (x.presentaciones?.nombre === "Unidad" && x.tipo_cliente === "directo") {
        map[x.producto_id] = Number(x.precio);
      }
    });
    setPrecios(map);

    const filas: any[] = [];
    ((mer.data ?? []) as any[]).forEach((m: any) => {
      filas.push({ tipo: "muestra", producto_id: m.producto_id, cantidad: Number(m.cantidad), monto: 0 });
    });
    ((vts.data ?? []) as any[]).forEach((v: any) => {
      ((v.venta_items ?? []) as any[]).forEach((it: any) => {
        filas.push({
          tipo: "venta",
          producto_id: it.producto_id,
          cantidad: Number(it.cantidad),
          monto: Number(v.total),
        });
      });
    });
    setLista(filas);
  }, [fecha]);

  useEffect(() => {
    cargar();
  }, [fecha]);

  const nombreProd = (id: string) =>
    productos.find((p) => p.id === id)?.codigo ?? productos.find((p) => p.id === id)?.nombre ?? "";

  const precio = precios[productoId] ?? 2;
  const total = Number(cantidad || 0) * precio;

  async function registrar() {
    setErr(null);
    setMsg(null);
    const cant = Number(cantidad || 0);
    if (!productoId || cant <= 0) return setErr("Elige producto y cantidad.");
    setGuardando(true);

    if (tipo === "muestra") {
      const { error } = await supabase.from("mermas").insert({
        fecha,
        producto_id: productoId,
        cantidad: cant,
        tipo: "muestra",
        nota: "Muestra gratis",
      });
      setGuardando(false);
      if (error) return setErr(error.message);
      setMsg("Muestra registrada.");
    } else {
      const { data: pv } = await supabase
        .from("puntos_venta")
        .select("id")
        .eq("codigo", "TALLER")
        .maybeSingle();
      if (!pv) {
        setGuardando(false);
        return setErr("No existe el punto TALLER.");
      }

      const { data: venta, error } = await supabase
        .from("ventas")
        .insert({
          fecha,
          punto_venta_id: pv.id,
          turno: null,
          total,
          descuento: 0,
          promociones: 0,
        })
        .select("id")
        .single();
      if (error || !venta) {
        setGuardando(false);
        return setErr(error?.message ?? "No se pudo registrar.");
      }

      await supabase.from("venta_items").insert({
        venta_id: venta.id,
        producto_id: productoId,
        cantidad: cant,
        precio_unitario: precio,
      });

      await supabase.from("pagos").insert({
        venta_id: venta.id,
        punto_venta_id: pv.id,
        fecha,
        medio,
        monto: total,
      });

      await supabase.from("movimientos_caja").insert({
        fecha,
        punto_venta_id: pv.id,
        tipo: "ingreso",
        categoria_codigo: "venta",
        medio,
        monto: total,
        concepto: "Venta en taller",
        referencia: `taller:${venta.id}`,
        aprobado: false,
      });

      setGuardando(false);
      setMsg(`Venta en taller registrada · ${soles(total)}`);
    }

    setCantidad("");
    cargar();
  }

  return (
    <div className="card">
      <h2>Salidas del taller</h2>
      <p className="sub" style={{ marginTop: -6 }}>
        Ventas antes del despacho y muestras gratis. Descuentan del stock del día.
      </p>

      {err && <div className="alert err">{err}</div>}
      {msg && <div className="alert ok">{msg}</div>}

      <div className="grid grid-3">
        <div className="field">
          <label className="f">Producto</label>
          <select className="input" value={productoId} onChange={(e) => setProductoId(e.target.value)}>
            <option value="">—</option>
            {productos.map((p) => (
              <option key={p.id} value={p.id}>{p.codigo ?? p.nombre}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="f">Cantidad</label>
          <input className="input num" type="number" min="0" step="1" value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
        </div>
        <div className="field">
          <label className="f">Tipo</label>
          <select className="input" value={tipo} onChange={(e) => setTipo(e.target.value as any)}>
            <option value="venta">Venta</option>
            <option value="muestra">Muestra gratis</option>
          </select>
        </div>
      </div>

      {tipo === "venta" && (
        <div className="grid grid-2">
          <div className="field">
            <label className="f">Medio</label>
            <select className="input" value={medio} onChange={(e) => setMedio(e.target.value)}>
              <option value="efectivo">Efectivo</option>
              <option value="yape">Yape / Plin</option>
            </select>
          </div>
          <div className="field">
            <label className="f">Total</label>
            <div className="input num" style={{ background: "#f7f3ef" }}>{soles(total)}</div>
          </div>
        </div>
      )}

      <button className="btn btn-primary btn-block" onClick={registrar} disabled={guardando}>
        {guardando ? "Guardando…" : tipo === "venta" ? "Registrar venta" : "Registrar muestra"}
      </button>

      {lista.length > 0 && (
        <div className="table-wrap" style={{ marginTop: 12 }}>
          <table>
            <thead>
              <tr><th>Producto</th><th>Tipo</th><th className="num">Cantidad</th><th className="num">Monto</th></tr>
            </thead>
            <tbody>
              {lista.map((x, i) => (
                <tr key={i}>
                  <td>{nombreProd(x.producto_id)}</td>
                  <td>{x.tipo === "venta" ? "Venta" : "Muestra"}</td>
                  <td className="num">{numero(x.cantidad)}</td>
                  <td className="num">{x.tipo === "venta" ? soles(x.monto) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
