"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Shell, { usePerfil } from "@/components/Shell";
import { supabase, hoyISO, numero, fechaCorta } from "@/lib/supabase";
import PedidoDetalle from "@/components/PedidoDetalle";
import { borrarBorrador, guardarBorrador, leerBorrador } from "@/lib/draft";

type Prod = { id: string; codigo: string | null; nombre: string };
type Punto = { id: string; codigo: string; nombre: string; tipo: string; es_fijo: boolean };

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
  const [omitidos, setOmitidos] = useState<Set<string>>(new Set());
  const [celdas, setCeldas] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const [verEventuales, setVerEventuales] = useState(false);
  const [abrirNuevo, setAbrirNuevo] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [pedidosDia, setPedidosDia] = useState<any[]>([]);
  const [draftDisponible, setDraftDisponible] = useState(false);
  const [listo, setListo] = useState(false);
  const [snapshot, setSnapshot] = useState("");

  const clave = (puntoId: string, prodId: string) => `${puntoId}|${prodId}`;

  const visibles = useMemo(
    () =>
      puntos.filter(
        (p) => (verEventuales || p.es_fijo) && !omitidos.has(p.id),
      ),
    [puntos, verEventuales, omitidos],
  );

  const cargarBase = useCallback(async () => {
    const [p, pv] = await Promise.all([
      supabase.from("productos").select("id, codigo, nombre").eq("activo", true).order("orden", { ascending: true }).order("codigo"),
      supabase
        .from("puntos_venta")
        .select("id, codigo, nombre, tipo, es_fijo")
        .eq("activo", true)
        .in("tipo", ["maxiahorro", "repartos"])
        .order("orden", { ascending: true })
        .order("codigo"),
    ]);
    setProductos((p.data ?? []) as Prod[]);
    setPuntos((pv.data ?? []) as Punto[]);
  }, []);

  const cargarDia = useCallback(async () => {
    setListo(false);
    const [req, om, pe] = await Promise.all([
      supabase.from("requerimientos").select("id").eq("fecha", fecha).maybeSingle(),
      supabase.from("puntos_omitidos").select("punto_venta_id").eq("fecha", fecha),
      supabase
        .from("pedidos")
        .select("id, cliente, telefono, notas, hora_entrega, estado, adelanto, pedido_items(producto_id, cantidad, precio_unitario, nota, productos(nombre))")
        .eq("fecha_entrega", fecha)
        .neq("estado", "cancelado")
        .order("hora_entrega"),
    ]);

    setOmitidos(new Set(((om.data ?? []) as any[]).map((x) => x.punto_venta_id)));
    setPedidosDia((pe.data ?? []) as any[]);

    const m: Record<string, string> = {};
    if (req.data) {
      const { data: its } = await supabase
        .from("requerimiento_items")
        .select("producto_id, destino_punto_id, cantidad")
        .eq("requerimiento_id", req.data.id)
        .not("destino_punto_id", "is", null);
      (its ?? []).forEach((i: any) => {
        m[`${i.destino_punto_id}|${i.producto_id}`] = String(Number(i.cantidad));
      });
    }

    const borrador = leerBorrador<Record<string, string>>(`mip:prog:${fecha}`);
    if (borrador && Object.keys(borrador).length > 0) {
      setCeldas({ ...m, ...borrador });
      setDraftDisponible(true);
    } else {
      setCeldas(m);
      setDraftDisponible(false);
    }
    setSnapshot(JSON.stringify(m));
    setListo(true);
  }, [fecha]);

  useEffect(() => {
    cargarBase();
  }, [cargarBase]);

  useEffect(() => {
    cargarDia();
  }, [cargarDia]);

  // guarda lo digitado aunque no se haya pulsado "Guardar"
  useEffect(() => {
    if (!listo) return;
    const actual = JSON.stringify(celdas);
    if (actual === snapshot) return;
    const t = setTimeout(() => {
      guardarBorrador(`mip:prog:${fecha}`, celdas);
      setDraftDisponible(true);
    }, 600);
    return () => clearTimeout(t);
  }, [celdas, listo, fecha, snapshot]);

  function setCelda(puntoId: string, prodId: string, v: string) {
    setCeldas((c) => ({ ...c, [clave(puntoId, prodId)]: v }));
  }

  const totalFila = (puntoId: string) =>
    productos.reduce((a, p) => a + Number(celdas[clave(puntoId, p.id)] || 0), 0);

  const totalPedido = (p: any) =>
    (p.pedido_items ?? []).reduce((a: number, it: any) => a + Number(it.cantidad), 0);

  const cantidadPedido = (p: any, prodId: string) =>
    (p.pedido_items ?? [])
      .filter((it: any) => it.producto_id === prodId)
      .reduce((a: number, it: any) => a + Number(it.cantidad), 0);

  const totalCol = (prodId: string) =>
    visibles.reduce((a, pv) => a + Number(celdas[clave(pv.id, prodId)] || 0), 0) +
    pedidosDia.reduce((a, p) => a + cantidadPedido(p, prodId), 0);

  const granTotal = useMemo(
    () =>
      visibles.reduce((a, pv) => a + totalFila(pv.id), 0) +
      pedidosDia.reduce((a, p) => a + totalPedido(p), 0),
    [visibles, productos, celdas, pedidosDia],
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
      if (omitidos.has(i.destino_punto_id)) return;
      m[`${i.destino_punto_id}|${i.producto_id}`] = String(Number(i.cantidad));
    });
    setCeldas(m);
    setMsg(`Copiado desde ${fechaCorta(prev.fecha)}. Revisa y ajusta antes de guardar.`);
  }

  async function marcarNoPidio(p: Punto) {
    setErr(null);
    setMsg(null);
    const { error } = await supabase
      .from("puntos_omitidos")
      .upsert({ fecha, punto_venta_id: p.id, creado_por: perfil?.id }, { onConflict: "fecha,punto_venta_id" });
    if (error) {
      setErr(error.message);
      return;
    }
    setOmitidos((s) => new Set([...s, p.id]));
    setCeldas((c) => {
      const n = { ...c };
      productos.forEach((pr) => delete n[clave(p.id, pr.id)]);
      return n;
    });
    setMsg(`${p.codigo}: marcado como «hoy no pidió».`);
  }

  async function restaurar(p: Punto) {
    setErr(null);
    await supabase.from("puntos_omitidos").delete().eq("fecha", fecha).eq("punto_venta_id", p.id);
    setOmitidos((s) => {
      const n = new Set(s);
      n.delete(p.id);
      return n;
    });
    setMsg(`${p.codigo}: vuelve a la parrilla.`);
  }

  async function crearEventual() {
    setErr(null);
    setMsg(null);
    const nombre = nuevoNombre.trim();
    if (!nombre) return;

    const ya = puntos.find(
      (p) => p.codigo.toUpperCase() === nombre.toUpperCase() || (p.nombre ?? "").toUpperCase() === nombre.toUpperCase(),
    );
    if (ya) {
      setVerEventuales(true);
      setNuevoNombre("");
      setAbrirNuevo(false);
      setMsg(`${ya.codigo} ya existe: lo muestro en la parrilla.`);
      return;
    }

    const codigo = nombre
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 20);

    const { data, error } = await supabase
      .from("puntos_venta")
      .insert({ codigo, nombre, tipo: "repartos", es_fijo: false })
      .select("id, codigo, nombre, tipo, es_fijo")
      .single();

    if (error) {
      setErr(error.message);
      return;
    }
    setPuntos((ps) => [...ps, data as Punto]);
    setVerEventuales(true);
    setNuevoNombre("");
    setAbrirNuevo(false);
    setMsg(`Cliente eventual ${codigo} agregado.`);
  }

  async function descartarBorrador() {
    borrarBorrador(`mip:prog:${fecha}`);
    setDraftDisponible(false);
    setListo(false);
    await cargarDia();
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

    const { error: e1 } = await supabase
      .from("requerimiento_items")
      .delete()
      .eq("requerimiento_id", reqId)
      .is("destino_pedido_id", null);
    if (e1) {
      setErr(e1.message);
      setGuardando(false);
      return;
    }

    const filas: any[] = [];
    for (const pv of puntos) {
      if (omitidos.has(pv.id)) continue;
      for (const p of productos) {
        const v = Number(celdas[clave(pv.id, p.id)] || 0);
        if (v > 0) {
          filas.push({
            requerimiento_id: reqId,
            producto_id: p.id,
            cantidad: v,
            destino_punto_id: pv.id,
            origen: pv.es_fijo ? "estimado" : "ajuste",
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
    borrarBorrador(`mip:prog:${fecha}`);
    setDraftDisponible(false);
    setSnapshot(JSON.stringify(celdas));
    setGuardando(false);
    setMsg(
      `Programación guardada: ${filas.length} destinos · ${numero(granTotal)} unidades` +
        (omitidos.size > 0 ? ` · ${omitidos.size} cliente(s) sin pedido` : ""),
    );
  }

  const listaOmitidos = puntos.filter((p) => omitidos.has(p.id));

  const nombres: Record<string, string> = {};
  productos.forEach((p) => {
    nombres[p.id] = p.codigo ?? p.nombre;
  });

  const resumenPedidos = useMemo(() => {
    const m: Record<string, number> = {};
    pedidosDia.forEach((p) =>
      (p.pedido_items ?? []).forEach((it: any) => {
        m[it.producto_id] = (m[it.producto_id] ?? 0) + Number(it.cantidad);
      }),
    );
    return m;
  }, [pedidosDia]);

  const totalPedidos = Object.values(resumenPedidos).reduce((a, b) => a + b, 0);

  return (
    <>
      <h1>Programación</h1>
      <p className="sub">Una fila por cliente o canal, una columna por producto</p>

      {err && <div className="alert err">{err}</div>}
      {msg && <div className="alert ok">{msg}</div>}

      {draftDisponible && (
        <div className="alert" style={{ background: "var(--warn-soft)", color: "var(--warn)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <span>Recuperé lo que estabas digitando. Guárdalo para fijarlo.</span>
          <button className="btn btn-sm" type="button" onClick={descartarBorrador}>
            Descartar
          </button>
        </div>
      )}

      <div className="card">
        <div className="grid grid-2">
          <div className="field" style={{ marginBottom: 0 }}>
            <label className="f">Fecha de producción</label>
            <input className="input" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label className="f">Acciones</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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

      <div className="card" style={{ padding: "12px 14px" }}>
        <div className="row" style={{ flexWrap: "wrap", gap: 10 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600 }}>
            <input
              type="checkbox"
              checked={verEventuales}
              onChange={(e) => setVerEventuales(e.target.checked)}
              style={{ width: 16, height: 16 }}
            />
            Mostrar eventuales ({puntos.filter((p) => !p.es_fijo).length})
          </label>

          <button className="btn btn-sm" type="button" onClick={() => setAbrirNuevo((v) => !v)}>
            {abrirNuevo ? "Cancelar" : "+ Añadir cliente eventual"}
          </button>
        </div>

        {abrirNuevo && (
          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            <input
              className="input"
              style={{ flex: 1, minWidth: 180 }}
              placeholder="Nombre del cliente (ej. Rosa Chimbote)"
              value={nuevoNombre}
              onChange={(e) => setNuevoNombre(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  crearEventual();
                }
              }}
            />
            <button className="btn btn-primary" type="button" onClick={crearEventual}>
              Agregar
            </button>
          </div>
        )}

        {abrirNuevo && (
          <p className="sub" style={{ margin: "8px 0 0" }}>
            Se crea como cliente eventual y aparece en la parrilla para esta fecha.
            Si vuelve otro día, ya queda guardado.
          </p>
        )}
      </div>

      <div className="card" style={{ padding: 10 }}>
        <div className="table-wrap">
          <table className="grid-prog">
            <thead>
              <tr>
                <th className="sticky" style={{ minWidth: 118 }}>Cliente</th>
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
                  <td className="sticky">
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      {pv.codigo}
                      <button
                        type="button"
                        title="Hoy no pidió"
                        onClick={() => marcarNoPidio(pv)}
                        style={{
                          border: "1px solid var(--line)",
                          background: "#fff",
                          color: "var(--muted)",
                          borderRadius: 6,
                          width: 20,
                          height: 20,
                          lineHeight: 1,
                          fontSize: 12,
                          cursor: "pointer",
                          padding: 0,
                        }}
                      >
                        ×
                      </button>
                    </span>
                  </td>
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
                      />
                    </td>
                  ))}
                  <td className="num"><strong>{totalFila(pv.id) || ""}</strong></td>
                </tr>
              ))}
              {pedidosDia.map((p) => (
                <tr key={`ped-${p.id}`} style={{ background: "#fdf4f7" }}>
                  <td className="sticky" title="Pedido del día">
                    🎂 {p.cliente}
                  </td>
                  {productos.map((pr) => {
                    const q = cantidadPedido(p, pr.id);
                    return (
                      <td key={pr.id} className="num">
                        {q > 0 ? q : ""}
                      </td>
                    );
                  })}
                  <td className="num">
                    <strong>{totalPedido(p)}</strong>
                  </td>
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

        {visibles.length === 0 && (
          <p className="empty">
            No hay clientes para mostrar. Activa «Mostrar eventuales» o agrega uno nuevo.
          </p>
        )}

        <p className="sub" style={{ margin: "10px 4px 0" }}>
          Toca la <strong>×</strong> de un cliente cuando hoy no pidió. Las filas con 🎂 son pedidos: se editan en la pestaña Pedidos.
        </p>
      </div>

      {pedidosDia.length > 0 && (
        <div className="card">
          <div className="row" style={{ marginBottom: 10 }}>
            <h2 style={{ margin: 0 }}>Pedidos de este día</h2>
            <span className="badge ok">{numero(totalPedidos)} unid. en producción</span>
          </div>
          {pedidosDia.map((p) => (
            <PedidoDetalle key={p.id} pedido={p} nombres={nombres} />
          ))}
          <p className="sub" style={{ margin: "10px 0 0" }}>
            Toca un pedido para ver las indicaciones del cliente. Se agregan solos al requerimiento.
          </p>
        </div>
      )}

      {listaOmitidos.length > 0 && (
        <div className="card">
          <h2>Hoy no pidieron ({listaOmitidos.length})</h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {listaOmitidos.map((p) => (
              <button
                key={p.id}
                className="btn btn-sm"
                type="button"
                onClick={() => restaurar(p)}
                title="Volver a la parrilla"
              >
                ↺ {p.codigo}
              </button>
            ))}
          </div>
          <p className="sub" style={{ margin: "10px 0 0" }}>
            Toca un nombre para devolverlo a la parrilla de esta fecha.
          </p>
        </div>
      )}
    </>
  );
}
