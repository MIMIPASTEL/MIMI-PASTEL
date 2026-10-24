"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase, numero } from "@/lib/supabase";

type Prod = { id: string; nombre: string; codigo?: string | null };
type Insumo = { id: string; nombre: string; unidad_base: string };

export default function RecetasAdmin({ productos }: { productos: Prod[] }) {
  const [insumos, setInsumos] = useState<Insumo[]>([]);
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
      const { data } = await supabase.from("insumos").select("id, nombre, unidad_base").eq("activo", true).order("nombre");
      setInsumos((data ?? []) as Insumo[]);
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
      .select("insumo_id, cantidad")
      .eq("receta_id", rec.id);

    const m: Record<string, string> = {};
    (items ?? []).forEach((i: any) => {
      m[i.insumo_id] = String(Number(i.cantidad));
    });
    setCant(m);
  }, [prodId]);

  useEffect(() => {
    cargarReceta();
  }, [cargarReceta]);

  const lineas = useMemo(
    () => insumos.filter((i) => Number(cant[i.id] || 0) > 0),
    [insumos, cant],
  );

  async function guardar() {
    setErr(null);
    setMsg(null);
    if (!prodId) return setErr("Elige el producto.");
    if (lineas.length === 0) return setErr("Agrega al menos un insumo.");

    setGuardando(true);

    let id = recetaId;
    if (!id) {
      const { data, error } = await supabase
        .from("recetas")
        .insert({
          producto_id: prodId,
          version: 1,
          rendimiento: Number(rendimiento || 1),
        })
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

    const { error: e2 } = await supabase.from("receta_items").insert(
      lineas.map((i) => ({
        receta_id: id,
        insumo_id: i.id,
        cantidad: Number(cant[i.id]),
      })),
    );

    setGuardando(false);
    if (e2) return setErr(e2.message);
    setMsg("Receta guardada.");
  }

  return (
    <div className="card">
      <h2>Recetas</h2>
      <p className="sub" style={{ marginTop: -6 }}>
        Cuánto insumo lleva una tanda de cada producto. Con esto el sistema calcula lo que se necesita
        al producir.
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
          <input
            className="input num"
            type="number"
            min="1"
            step="1"
            value={rendimiento}
            onChange={(e) => setRendimiento(e.target.value)}
          />
        </div>
      </div>

      {prodId && (
        <>
          <p className="sub" style={{ fontSize: 12 }}>
            {recetaId ? `Versión ${version} de la receta` : "Este producto aún no tiene receta"}
          </p>

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
                        value={cant[i.id] ?? ""}
                        onChange={(e) => setCant((c) => ({ ...c, [i.id]: e.target.value }))}
                        style={{ width: 90, padding: "6px 8px" }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="sub" style={{ marginTop: 8 }}>
            Ejemplo: si rinde 12 y usas 2 kg de harina por tanda, producir 36 necesita{" "}
            <strong>{numero((36 / Number(rendimiento || 1)) * Number(cant[insumos[0]?.id ?? ""] || 0), 2)}</strong>{" "}
            {insumos[0]?.unidad_base ?? ""} de {insumos[0]?.nombre ?? "insumo"}.
          </p>

          <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={guardar} disabled={guardando}>
            {guardando ? "Guardando…" : "Guardar receta"}
          </button>
        </>
      )}
    </div>
  );
}
