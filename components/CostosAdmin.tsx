"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase, soles } from "@/lib/supabase";

type Fila = {
  producto_id: string;
  codigo: string;
  nombre: string;
  costo_insumos: number;
  costo_fijo_unitario: number;
  costo_unitario: number;
};

export default function CostosAdmin() {
  const [params, setParams] = useState<any>(null);
  const [filas, setFilas] = useState<Fila[]>([]);
  const [precios, setPrecios] = useState<Record<string, number>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    const [pa, co, pr] = await Promise.all([
      supabase.from("parametros_costeo").select("*").eq("id", 1).maybeSingle(),
      supabase.from("v_costo_unitario").select("*"),
      supabase.from("precios").select("producto_id, precio, punto_venta_id"),
    ]);
    setParams(pa.data ?? null);
    setFilas(((co.data ?? []) as any[]).sort((a, b) => a.codigo.localeCompare(b.codigo)));

    const map: Record<string, number> = {};
    (pr.data ?? []).forEach((p: any) => {
      if (!p.punto_venta_id) map[p.producto_id] = Number(p.precio);
    });
    setPrecios(map);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  function set(k: string, v: string) {
    setParams((p: any) => ({ ...p, [k]: v }));
  }

  const num = (k: string) => Number(params?.[k] ?? 0);

  async function guardar() {
    setErr(null);
    setMsg(null);
    setGuardando(true);
    const { error } = await supabase
      .from("parametros_costeo")
      .update({
        mano_obra_dia: num("mano_obra_dia"),
        gas_dia: num("gas_dia"),
        luz_dia: num("luz_dia"),
        otros_dia: num("otros_dia"),
        ventas_dia: num("ventas_dia"),
        chofer_dia: num("chofer_dia"),
        unidades_dia: Math.max(1, num("unidades_dia")),
        actualizado_en: new Date().toISOString(),
      })
      .eq("id", 1);
    setGuardando(false);
    if (error) return setErr(error.message);
    setMsg("Parámetros actualizados. Los costos se recalcularon.");
    cargar();
  }

  const totalFijo = num("mano_obra_dia") + num("gas_dia") + num("luz_dia") + num("otros_dia");
  const fijoUnitario = totalFijo / Math.max(1, num("unidades_dia"));

  return (
    <div className="card">
      <h2>Costos y márgenes</h2>
      <p className="sub" style={{ marginTop: -6 }}>
        Costo unitario = insumos de la receta + (mano de obra + gas + luz) ÷ unidades del día.
      </p>

      {err && <div className="alert err">{err}</div>}
      {msg && <div className="alert ok">{msg}</div>}

      <div className="grid grid-3">
        <div className="field">
          <label className="f">Mano de obra (S/ por día)</label>
          <input className="input num" type="number" min="0" step="0.5" value={params?.mano_obra_dia ?? ""} onChange={(e) => set("mano_obra_dia", e.target.value)} />
        </div>
        <div className="field">
          <label className="f">Gas (S/ por día)</label>
          <input className="input num" type="number" min="0" step="0.5" value={params?.gas_dia ?? ""} onChange={(e) => set("gas_dia", e.target.value)} />
        </div>
        <div className="field">
          <label className="f">Luz (S/ por día)</label>
          <input className="input num" type="number" min="0" step="0.5" value={params?.luz_dia ?? ""} onChange={(e) => set("luz_dia", e.target.value)} />
        </div>
      </div>

      <div className="grid grid-3">
        <div className="field">
          <label className="f">Otros (S/ por día)</label>
          <input className="input num" type="number" min="0" step="0.5" value={params?.otros_dia ?? ""} onChange={(e) => set("otros_dia", e.target.value)} />
        </div>
        <div className="field">
          <label className="f">Unidades producidas por día</label>
          <input className="input num" type="number" min="1" step="1" value={params?.unidades_dia ?? ""} onChange={(e) => set("unidades_dia", e.target.value)} />
        </div>
        <div className="field">
          <label className="f">Costo fijo por unidad</label>
          <div className="input num" style={{ background: "#f7f3ef" }}>{soles(fijoUnitario)}</div>
        </div>
      </div>

      <button className="btn btn-sm" onClick={guardar} disabled={guardando}>
        {guardando ? "Guardando…" : "Guardar parámetros"}
      </button>

      <h2 style={{ marginTop: 18 }}>Gastos operativos (van al resultado del día)</h2>
      <p className="sub" style={{ marginTop: -6 }}>
        No entran al costo unitario: se restan de la utilidad del día.
      </p>
      <div className="grid grid-3">
        <div className="field">
          <label className="f">Vendedoras (S/ por día)</label>
          <input className="input num" type="number" min="0" step="0.5" value={params?.ventas_dia ?? ""} onChange={(e) => set("ventas_dia", e.target.value)} />
        </div>
        <div className="field">
          <label className="f">Chofer (S/ por día)</label>
          <input className="input num" type="number" min="0" step="0.5" value={params?.chofer_dia ?? ""} onChange={(e) => set("chofer_dia", e.target.value)} />
        </div>
        <div className="field">
          <label className="f">Total operativo por día</label>
          <div className="input num" style={{ background: "#f7f3ef" }}>
            {soles(num("ventas_dia") + num("chofer_dia"))}
          </div>
        </div>
      </div>

      <button className="btn btn-sm" onClick={guardar} disabled={guardando}>
        {guardando ? "Guardando…" : "Guardar parámetros"}
      </button>

      <div className="table-wrap" style={{ marginTop: 14 }}>
        <table>
          <thead>
            <tr>
              <th>Producto</th>
              <th className="num">Insumos</th>
              <th className="num">Fijo</th>
              <th className="num">Costo total</th>
              <th className="num">Precio</th>
              <th className="num">Margen</th>
              <th className="num">%</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => {
              const precio = precios[f.producto_id] ?? (Number(f.codigo?.startsWith("T") || false) ? 2 : 2);
              const costo = Number(f.costo_unitario);
              const margen = precio - costo;
              const pct = precio > 0 ? (margen / precio) * 100 : 0;
              return (
                <tr key={f.producto_id}>
                  <td><strong>{f.codigo ?? f.nombre}</strong></td>
                  <td className="num">{soles(f.costo_insumos)}</td>
                  <td className="num">{soles(f.costo_fijo_unitario)}</td>
                  <td className="num"><strong>{soles(costo)}</strong></td>
                  <td className="num">{soles(precio)}</td>
                  <td className="num">{soles(margen)}</td>
                  <td className="num">
                    <span className={`badge ${pct >= 50 ? "ok" : pct >= 30 ? "warn" : "danger"}`}>
                      {pct.toFixed(0)}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="sub" style={{ margin: "10px 4px 0", fontSize: 12 }}>
        Solo aparecen productos con receta cargada. El precio viene de Ajustes → Precios (S/ 2 por defecto).
      </p>
    </div>
  );
}
