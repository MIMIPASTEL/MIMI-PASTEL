"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase, numero } from "@/lib/supabase";

type Prod = { id: string; nombre: string; codigo?: string | null };
type Insumo = { id: string; nombre: string; unidad_base: string };
type Preparacion = { id: string; nombre: string; rendimiento: number; unidad: string };

export default function RecetasAdmin({ productos }: { productos: Prod[] }) {
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [preparaciones, setPreparaciones] = useState<Preparacion[]>([]);
  const [prodId, setProdId] = useState("");
  const [rendimiento, setRendimiento] = useState("1");
  const [cant, setCant] = useState<Record<string, string>>({});
  const [recetaId, setRecetaId] = useState<string | null>(null);
  const [version, setVersion] = useState(1);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    (async () => {
      const [ins, pre] = await Promise.all([
        supabase.from("insumos").select("id, nombre, unidad_base").eq("activo", true).order("nombre"),
        supabase.from("preparaciones").select("id, nombre, rendimiento, unidad").eq("activo", true).order("nombre"),
      ]);
      setInsumos((ins.data ?? []) as Insumo[]);
      setPreparaciones((pre.data ?? []) as Preparacion[]);
    })();
  }, []);

  const cargarReceta = useCallback(async () => {
    setMsg(null);
    setErr(null);
    if (!prodId) return;
    const { data: rec } = await supabase
      .from("recetas")
      .select("id, version, rendimiento")
      .eq("producto_id", prodId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!rec) {
      setRecetaId(null);
      setVersion(1);
      setRendimiento("1");
      setCant({});
      return;
    }
    setRecetaId(rec.id);
    setVersion(rec.version);
    setRendimiento(String(Number(rec.rendimiento)));

    const { data: items } = await supabase
      .from("receta_items")
      .select("insumo_id, preparacion_id, cantidad")
      .eq("receta_id", rec.id);

    const m: Record<string, string> = {};
    (items ?? []).forEach((i: any) => {
      if (i.insumo_id) m[`i:${i.insumo_id}`] = String(Number(i.cantidad));
      if (i.preparacion_id) m[`p:${i.preparacion_id}`] = String(Number(i.cantidad));
    });
    setCant(m);
  }, [prodId]);

  useEffect(() => {
    cargarReceta();
  }, [cargarReceta]);

  async function guardar() {
    setErr(null);
    setMsg(null);
    if (!prodId) return setErr("Elige el producto.");
    const deInsumos = insumos.filter((i) => Number(cant[`i:${i.id}`] || 0) > 0);
    const dePreps = preparaciones.filter((p) => Number(cant[`p:${p.id}`] || 0) > 0);
    if (deInsumos.length === 0 && dePreps.length === 0) return setErr("Agrega al menos un ingrediente.");

    setGuardando(true);
    let id = recetaId;
    if (!id) {
      const { data, error } = await supabase
        .from("recetas")
        .insert({ producto_id: prodId, version: 1, rendimiento: Number(rendimiento || 1) })
        .select("id")
        .single();
      if (error || !data) {
        setErr(error?.message ?? "No se pudo crear la receta");
        setGuardando(false);
        return;
      }
      id = data.id;
      setRecetaId(id);
    } else {
      await supabase.from("recetas").update({ rendimiento: Number(rendimiento || 1) }).eq("id", id);
    }

    await supabase.from("receta_items").delete().eq("receta_id", id);
    const filas = [
      ...deInsumos.map((i) => ({ receta_id: id, insumo_id: i.id, cantidad: Number(cant[`i:${i.id}`]) })),
      ...dePreps.map((p) => ({ receta_id: id, preparacion_id: p.id, cantidad: Number(cant[`p:${p.id}`]) })),
    ];
    const { error: e2 } = await supabase.from("receta_items").insert(filas);
    setGuardando(false);
    if (e2) return setErr(e2.message);
    setMsg("Receta guardada.");
  }

  return (
    <div className="card">
      <h2>Recetas</h2>
      <p className="sub" style={{ marginTop: -6 }}>
        Qué lleva cada producto por tanda. Puedes usar insumos directos o preparaciones base.
      </p>

      {err && <div className="alert err">{err}</div>}
      {msg && <div className="alert ok">{msg}</div>}

      <div className="grid grid-2">
        <div className="field">
          <label className="f">Producto</label>
          <select className="input" value={prodId} onChange={(e) => setProdId(e.target.value)}>
            <option value="">—</option>
            {productos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="f">Rinde (unidades por tanda)</label>
          <input className="input num" type="number" min="1" step="1" value={rendimiento} onChange={(e) => setRendimiento(e.target.value)} />
        </div>
      </div>

      {prodId && (
        <>
          <p className="sub" style={{ fontSize: 12 }}>
            {recetaId ? `Versión ${version} de la receta` : "Este producto aún no tiene receta"}
          </p>

          <h2 style={{ marginTop: 10 }}>Preparaciones base</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Preparación</th>
                  <th>Rinde</th>
                  <th className="num">Cantidad por tanda</th>
                </tr>
              </thead>
              <tbody>
                {preparaciones.map((p) => (
                  <tr key={p.id}>
                    <td>{p.nombre}</td>
                    <td style={{ color: "var(--muted)", fontSize: 12 }}>
                      {numero(p.rendimiento, 2)} {p.unidad}
                    </td>
                    <td className="num">
                      <input
                        className="input num"
                        type="number"
                        min="0"
                        step="0.01"
                        value={cant[`p:${p.id}`] ?? ""}
                        onChange={(e) => setCant((c) => ({ ...c, [`p:${p.id}`]: e.target.value }))}
                        style={{ width: 90, padding: "6px 8px" }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 style={{ marginTop: 16 }}>Insumos directos</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Insumo</th>
                  <th>Unidad</th>
                  <th className="num">Cantidad por tanda</th>
                </tr>
              </thead>
              <tbody>
                {insumos.map((i) => (
                  <tr key={i.id}>
                    <td>{i.nombre}</td>
                    <td>{i.unidad_base}</td>
                    <td className="num">
                      <input
                        className="input num"
                        type="number"
                        min="0"
                        step="0.01"
                        value={cant[`i:${i.id}`] ?? ""}
                        onChange={(e) => setCant((c) => ({ ...c, [`i:${i.id}`]: e.target.value }))}
                        style={{ width: 90, padding: "6px 8px" }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={guardar} disabled={guardando}>
            {guardando ? "Guardando…" : "Guardar receta"}
          </button>
        </>
      )}
    </div>
  );
}
