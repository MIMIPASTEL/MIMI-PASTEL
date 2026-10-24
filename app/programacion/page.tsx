"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Shell, { usePerfil } from "@/components/Shell";
import { supabase, hoyISO, numero, fechaCorta } from "@/lib/supabase";

type Prod = { id: string; codigo: string | null; nombre: string };
type Punto = { id: string; codigo: string; tipo: string; es_fijo: boolean };

export default function ProgramacionPage() {
  return (
    <Shell>
      <Contenido />
    </Shell>
  );
}

function Contenido() {
  const perfil = usePerfil();
  const [fecha, setFecha] = useState(hoyISO());
  const [productos, setProductos] = useState<Prod[]>([]);
  const [puntos, setPuntos] = useState<Punto[]>([]);
  const [celdas, setCeldas] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [verEventuales, setVerEventuales] = useState(false);

  const clave = (puntoId: string, prodId: string) => `${puntoId}|${prodId}`;

  const visibles = useMemo(
    () => (verEventuales ? puntos : puntos.filter((p) => p.es_fijo)),
    [puntos, verEventuales],
  );

  const cargarBase = useCallback(async () => {
    const [p, pv] = await Promise.all([
      supabase.from("productos").select("id, codigo, nombre").eq("activo", true).order("codigo"),
      supabase
        .from("puntos_venta")
        .select("id, codigo, tipo, es_fijo")
        .eq("activo", true)
        .in("tipo", ["maxiahorro", "repartos"])
        .order("codigo"),
    ]);
    setProductos((p.data ?? []) as Prod[]);
    setPuntos((pv.data ?? []) as Punto[]);
  }, []);

  const cargarDia = useCallback(async () => {
    const { data: req } = await supabase
      .from("requerimientos")
      .select("id")
      .eq("fecha", fecha)
      .maybeSingle();
    if (!req) {
      setCeldas({});
      return;
    }
    const { data: its } = await supabase
      .from("requerimiento_items")
      .select("producto_id, destino_punto_id, cantidad")
      .eq("requerimiento_id", req.id)
      .not("destino_punto_id", "is", null);
    const m: Record<string, string> = {};
    (its ?? []).forEach((i: any) => {
      m[`${i.destino_punto_id}|${i.producto_id}`] = String(Number(i.cantidad));
    });
    setCeldas(m);
  }, [fecha]);

  useEffect(() => {
    cargarBase();
  }, [cargarBase]);

  useEffect(() => {
    cargarDia();
  }, [cargarDia]);

  function setCelda(puntoId: string, prodId: string, v: string) {
    setCeldas((c) => ({ ...c, [clave(puntoId, prodId)]: v }));
  }

  const totalFila = (puntoId: string) =>
    productos.reduce((a, p) => a + Number(celdas[clave(puntoId, p.id)] || 0), 0);

  const totalCol = (prodId: string) =>
    visibles.reduce((a, pv) => a + Number(celdas[clave(pv.id, prodId)] || 0), 0);

  const granTotal = useMemo(
    () => visibles.reduce((a, pv) => a + totalFila(pv.id), 0),
    [puntos, productos, celdas],
  );

  async function copiarAnterior() {
    setErr(null);
    setMsg(null);
    const { data: prev } = await supabase
      .from("requerimientos")
      .select("id, fecha")
      .lt("fecha", fecha)
      .order("fecha", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!prev) {
      setErr("No hay una programación anterior para copiar.");
      return;
    }
    const { data: its } = await supabase
      .from("requerimiento_items")
      .select("producto_id, destino_punto_id, cantidad")
      .eq("requerimiento_id", prev.id)
      .not("destino_punto_id", "is", null);
    const m: Record<string, string> = {};
    (its ?? []).forEach((i: any) => {
      m[`${i.destino_punto_id}|${i.producto_id}`] = String(Number(i.cantidad));
    });
    setCeldas(m);
    setMsg(`Copiado desde ${fechaCorta(prev.fecha)}. Revisa y ajusta antes de guardar.`);
  }

  async function guardar() {
    setErr(null);
    setMsg(null);
    setGuardando(true);

    let reqId: string | null = null;
    const { data: req } = await supabase.from("requerimientos").select("id").eq("fecha", fecha).maybeSingle();
    if (req) {
      reqId = req.id;
    } else {
      const { data: nuevo, error } = await supabase
        .from("requerimientos")
        .insert({ fecha, estado: "publicado", creado_por: perfil?.id })
        .select("id")
        .single();
      if (error) {
        setErr(error.message);
        setGuardando(false);
        return;
      }
      reqId = nuevo.id;
    }

    const { error: e1 } = await supabase.from("requerimiento_items").delete().eq("requerimiento_id", reqId);
    if (e1) {
      setErr(e1.message);
      setGuardando(false);
      return;
    }

    const filas: any[] = [];
    for (const pv of puntos) {
      for (const p of productos) {
        const v = Number(celdas[clave(pv.id, p.id)] || 0);
        if (v > 0) {
          filas.push({
            requerimiento_id: reqId,
            producto_id: p.id,
            cantidad: v,
            destino_punto_id: pv.id,
            origen: "estimado",
          });
        }
      }
    }

    if (filas.length > 0) {
      const { error: e2 } = await supabase.from("requerimiento_items").insert(filas);
      if (e2) {
        setErr(e2.message);
        setGuardando(false);
        return;
      }
    }

    await supabase.from("requerimientos").update({ estado: "publicado" }).eq("id", reqId);
    setGuardando(false);
    setMsg(`Programación guardada: ${filas.length} destinos · ${numero(granTotal)} unidades.`);
  }

  return (
    <>
      <h1>Programación</h1>
      <p className="sub">Una fila por cliente o canal, una columna por producto</p>

      {err && <div className="alert err">{err}</div>}
      {msg && <div className="alert ok">{msg}</div>}

      <div className="card">
        <div className="grid grid-2">
          <div className="field" style={{ marginBottom: 0 }}>
            <label className="f">Fecha de producción</label>
            <input className="input" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label className="f">Acciones</label>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn" onClick={copiarAnterior} type="button">
                Copiar día anterior
              </button>
              <button className="btn btn-primary" onClick={guardar} disabled={guardando} type="button">
                {guardando ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: "10px 14px" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600 }}>
          <input
            type="checkbox"
            checked={verEventuales}
            onChange={(e) => setVerEventuales(e.target.checked)}
            style={{ width: 16, height: 16 }}
          />
          Mostrar clientes eventuales ({puntos.filter((p) => !p.es_fijo).length})
        </label>
      </div>

      <div className="card" style={{ padding: 10 }}>
        <div className="table-wrap">
          <table className="grid-prog">
            <thead>
              <tr>
                <th className="sticky" style={{ minWidth: 96 }}>Cliente</th>
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
                  {productos.map((p) => (
                    <td key={p.id} style={{ padding: 2 }}>
                      <input
                        className="num"
                        type="number"
                        min="0"
                        step="1"
                        inputMode="numeric"
                        value={celdas[clave(pv.id, p.id)] ?? ""}
                        onChange={(e) => setCelda(pv.id, p.id, e.target.value)}
                        placeholder=""
                      />
                    </td>
                  ))}
                  <td className="num"><strong>{totalFila(pv.id) || ""}</strong></td>
                </tr>
              ))}
              <tr>
                <td className="sticky"><strong>Total</strong></td>
                {productos.map((p) => (
                  <td key={p.id} className="num"><strong>{totalCol(p.id) || ""}</strong></td>
                ))}
                <td className="num"><strong>{numero(granTotal)}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="sub" style={{ margin: "10px 4px 0" }}>
          Pasa el dedo hacia el lado para ver todos los productos. Los ceros no se guardan.
        </p>
      </div>
    </>
  );
}
