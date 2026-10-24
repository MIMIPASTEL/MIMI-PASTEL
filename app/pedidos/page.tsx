"use client";

import { useCallback, useEffect, useState } from "react";
import Shell, { usePerfil } from "@/components/Shell";
import { supabase, hoyISO, soles, numero, fechaCorta } from "@/lib/supabase";
import { sincronizarPedido } from "@/lib/pedidos";
import PedidoDetalle from "@/components/PedidoDetalle";
import { borrarBorrador, guardarBorrador, leerBorrador } from "@/lib/draft";
import EditarPedido from "@/components/EditarPedido";

type Prod = { id: string; nombre: string };
type Punto = { id: string; codigo: string };
type Linea = { producto_id: string; cantidad: string; precio: string; nota: string };
type Pedido = {
  id: string;
  cliente: string;
  fecha_entrega: string;
  hora_entrega: string | null;
  estado: string;
  adelanto: number;
  pedido_items: {
    producto_id: string;
    cantidad: number;
    precio_unitario: number;
    productos: { nombre: string } | null;
  }[];
};

export default function PedidosPage() {
  return (
    <Shell>
      <Contenido />
    </Shell>
  );
}

function Contenido() {
  const perfil = usePerfil();
  const [productos, setProductos] = useState<Prod[]>([]);
  const [puntos, setPuntos] = useState<Punto[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [cliente, setCliente] = useState("");
  const [telefono, setTelefono] = useState("");
  const [fecha, setFecha] = useState(hoyISO());
  const [hora, setHora] = useState("");
  const [puntoId, setPuntoId] = useState("");
  const [adelanto, setAdelanto] = useState("");
  const [lineas, setLineas] = useState<Linea[]>([{ producto_id: "", cantidad: "", precio: "", nota: "" }]);
  const [draftListo, setDraftListo] = useState(false);
  const [editando, setEditando] = useState<any>(null);

  const cargar = useCallback(async () => {
    const [p, pv, pe] = await Promise.all([
      supabase.from("productos").select("id, nombre").eq("activo", true).order("orden", { ascending: true }),
      supabase.from("puntos_venta").select("id, codigo").eq("activo", true).order("codigo"),
      supabase
        .from("pedidos")
        .select("id, cliente, telefono, notas, fecha_entrega, hora_entrega, estado, adelanto, pedido_items(producto_id, cantidad, precio_unitario, tamano, nota, productos(nombre))")
        .order("fecha_entrega", { ascending: false })
        .limit(40),
    ]);
    setProductos((p.data ?? []) as Prod[]);
    setPuntos((pv.data ?? []) as Punto[]);
    setPedidos((pe.data ?? []) as unknown as Pedido[]);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // recupera el formulario a medio llenar
  useEffect(() => {
    const d = leerBorrador<any>("mip:pedido:nuevo");
    if (d) {
      if (typeof d.cliente === "string") setCliente(d.cliente);
      if (typeof d.telefono === "string") setTelefono(d.telefono);
      if (typeof d.fecha === "string") setFecha(d.fecha);
      if (typeof d.hora === "string") setHora(d.hora);
      if (typeof d.puntoId === "string") setPuntoId(d.puntoId);
      if (typeof d.adelanto === "string") setAdelanto(d.adelanto);
      if (Array.isArray(d.lineas) && d.lineas.length > 0) setLineas(d.lineas);
    }
    setDraftListo(true);
  }, []);

  // autoguardado del formulario
  useEffect(() => {
    if (!draftListo) return;
    const t = setTimeout(
      () => guardarBorrador("mip:pedido:nuevo", { cliente, telefono, fecha, hora, puntoId, adelanto, lineas }),
      600,
    );
    return () => clearTimeout(t);
  }, [draftListo, cliente, telefono, fecha, hora, puntoId, adelanto, lineas]);

  function setLinea(i: number, campo: keyof Linea, v: string) {
    setLineas((l) => l.map((x, j) => (j === i ? { ...x, [campo]: v } : x)));
  }

  const total = lineas.reduce((a, l) => a + Number(l.cantidad || 0) * Number(l.precio || 0), 0);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    if (!cliente.trim()) return setErr("Falta el nombre del cliente.");
    const validas = lineas.filter((l) => l.producto_id && Number(l.cantidad) > 0);
    if (validas.length === 0) return setErr("Agrega al menos un producto con cantidad.");

    const { data: ped, error } = await supabase
      .from("pedidos")
      .insert({
        cliente: cliente.trim(),
        telefono: telefono || null,
        fecha_entrega: fecha,
        hora_entrega: hora || null,
        punto_venta_id: puntoId || null,
        adelanto: Number(adelanto || 0),
        estado: "confirmado",
        creado_por: perfil?.id,
      })
      .select("id")
      .single();

    if (error) return setErr(error.message);

    const { error: e2 } = await supabase.from("pedido_items").insert(
      validas.map((l) => ({
        pedido_id: ped.id,
        producto_id: l.producto_id,
        cantidad: Number(l.cantidad),
        precio_unitario: Number(l.precio || 0),
        nota: l.nota?.trim() ? l.nota.trim() : null,
      })),
    );
    if (e2) return setErr(e2.message);

    const sync = await sincronizarPedido(ped.id, perfil?.id);
    if (sync.error) setErr("Pedido guardado, pero no se pudo programar: " + sync.error);

    setCliente("");
    setTelefono("");
    setHora("");
    setAdelanto("");
    setLineas([{ producto_id: "", cantidad: "", precio: "", nota: "" }]);
    borrarBorrador("mip:pedido:nuevo");
    if (!sync.error) setMsg("Pedido registrado y agregado a Programar.");
    cargar();
  }

  async function pasarAProduccion(p: Pedido) {
    setErr(null);
    setMsg(null);
    const r = await sincronizarPedido(p.id, perfil?.id);
    if (r.error) setErr(r.error);
    else setMsg("Pedido sincronizado con el requerimiento de produccion.");
  }

  const nombres: Record<string, string> = {};
  productos.forEach((p) => {
    nombres[p.id] = p.nombre;
  });

  return (
    <>
      <h1>Pedidos</h1>
      <p className="sub">Pedidos con cliente, fecha de entrega y precio propio</p>

      {err && <div className="alert err">{err}</div>}
      {msg && <div className="alert ok">{msg}</div>}

      <form className="card" onSubmit={guardar}>
        <h2>Nuevo pedido</h2>
        <div className="grid grid-2">
          <div className="field">
            <label className="f">Cliente</label>
            <input className="input" value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Nombre" />
          </div>
          <div className="field">
            <label className="f">Teléfono</label>
            <input className="input" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Opcional" />
          </div>
        </div>
        <div className="grid grid-3">
          <div className="field">
            <label className="f">Fecha de entrega</label>
            <input className="input" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>
          <div className="field">
            <label className="f">Hora</label>
            <input className="input" type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
          </div>
          <div className="field">
            <label className="f">Canal</label>
            <select className="input" value={puntoId} onChange={(e) => setPuntoId(e.target.value)}>
              <option value="">—</option>
              {puntos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.codigo}
                </option>
              ))}
            </select>
          </div>
        </div>

        <h2 style={{ marginTop: 8 }}>Productos</h2>
        {lineas.map((l, i) => (
          <div
            key={i}
            style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 10, marginBottom: 8 }}
          >
            <div className="grid grid-3">
              <select className="input" value={l.producto_id} onChange={(e) => setLinea(i, "producto_id", e.target.value)}>
                <option value="">Producto…</option>
                {productos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
              <input
                className="input num"
                type="number"
                min="0"
                step="1"
                placeholder="Cantidad"
                value={l.cantidad}
                onChange={(e) => setLinea(i, "cantidad", e.target.value)}
              />
              <input
                className="input num"
                type="number"
                min="0"
                step="0.1"
                placeholder="Precio unit."
                value={l.precio}
                onChange={(e) => setLinea(i, "precio", e.target.value)}
              />
            </div>
            <input
              className="input"
              style={{ marginTop: 8 }}
              placeholder="Indicaciones: bañada en chantilly, rellena de fudge, dedicatoria…"
              value={l.nota}
              onChange={(e) => setLinea(i, "nota", e.target.value)}
            />
          </div>
        ))}

        <div className="row" style={{ marginTop: 8 }}>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setLineas((l) => [...l, { producto_id: "", cantidad: "", precio: "", nota: "" }])}
          >
            + Agregar producto
          </button>
          <strong>{soles(total)}</strong>
        </div>

        <div className="field" style={{ marginTop: 12 }}>
          <label className="f">Adelanto recibido (S/)</label>
          <input className="input num" type="number" min="0" step="0.1" value={adelanto} onChange={(e) => setAdelanto(e.target.value)} placeholder="0.00" />
        </div>

        <button className="btn btn-primary btn-block">Registrar pedido</button>
      </form>

      <div className="card">
        <h2>Últimos pedidos</h2>
        {pedidos.length === 0 ? (
          <p className="empty">Todavía no hay pedidos.</p>
        ) : (
          pedidos.map((p) => (
            <PedidoDetalle
              key={p.id}
              pedido={p}
              nombres={nombres}
              accion={
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button className="btn btn-sm" onClick={() => setEditando(p)}>
                    Editar pedido
                  </button>
                  {p.estado !== "entregado" && p.estado !== "cancelado" && (
                    <button className="btn btn-sm" onClick={() => pasarAProduccion(p)}>
                      Sincronizar con producción
                    </button>
                  )}
                </div>
              }
            />
          ))
        )}
      </div>
      {editando && (
        <EditarPedido
          pedido={editando}
          productos={productos}
          onClose={() => setEditando(null)}
          onSaved={() => {
            setEditando(null);
            setMsg("Pedido actualizado y sincronizado con producción.");
            cargar();
          }}
        />
      )}
    </>
  );
}
