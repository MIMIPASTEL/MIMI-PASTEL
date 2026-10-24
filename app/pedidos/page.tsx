"use client";

import { useCallback, useEffect, useState } from "react";
import Shell, { usePerfil } from "@/components/Shell";
import { supabase, hoyISO, soles, numero, fechaCorta } from "@/lib/supabase";

type Prod = { id: string; nombre: string };
type Punto = { id: string; codigo: string };
type Linea = { producto_id: string; cantidad: string; precio: string };
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
  const [lineas, setLineas] = useState<Linea[]>([{ producto_id: "", cantidad: "", precio: "" }]);

  const cargar = useCallback(async () => {
    const [p, pv, pe] = await Promise.all([
      supabase.from("productos").select("id, nombre").eq("activo", true).order("nombre"),
      supabase.from("puntos_venta").select("id, codigo").eq("activo", true).order("codigo"),
      supabase
        .from("pedidos")
        .select("id, cliente, fecha_entrega, hora_entrega, estado, adelanto, pedido_items(producto_id, cantidad, precio_unitario, productos(nombre))")
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
      })),
    );
    if (e2) return setErr(e2.message);

    setCliente("");
    setTelefono("");
    setHora("");
    setAdelanto("");
    setLineas([{ producto_id: "", cantidad: "", precio: "" }]);
    setMsg("Pedido registrado.");
    cargar();
  }

  async function pasarAProduccion(p: Pedido) {
    setErr(null);
    setMsg(null);
    const fechaEntrega = p.fecha_entrega;

    const { data: req } = await supabase
      .from("requerimientos")
      .select("id")
      .eq("fecha", fechaEntrega)
      .maybeSingle();

    let reqId = req?.id;
    if (!reqId) {
      const { data: nuevo, error } = await supabase
        .from("requerimientos")
        .insert({ fecha: fechaEntrega, notas: "Generado desde pedidos", creado_por: perfil?.id })
        .select("id")
        .single();
      if (error) return setErr(error.message);
      reqId = nuevo.id;
    }

    const { error } = await supabase.from("requerimiento_items").insert(
      (p.pedido_items ?? []).map((it) => ({
        requerimiento_id: reqId,
        producto_id: it.producto_id,
        cantidad: it.cantidad,
        destino_pedido_id: p.id,
        origen: "pedido",
      })),
    );

    if (error) {
      setErr(error.message);
      return;
    }
    setMsg("Pedido enviado al requerimiento de producción.");
  }

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
          <div key={i} className="grid grid-3" style={{ marginBottom: 8 }}>
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
        ))}

        <div className="row" style={{ marginTop: 8 }}>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setLineas((l) => [...l, { producto_id: "", cantidad: "", precio: "" }])}
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
            <div key={p.id} style={{ padding: "10px 0", borderBottom: "1px solid #f3ebe5" }}>
              <div className="row">
                <div>
                  <strong>{p.cliente}</strong>
                  <div className="sub" style={{ margin: 0 }}>
                    {fechaCorta(p.fecha_entrega)}
                    {p.hora_entrega ? ` · ${p.hora_entrega.slice(0, 5)}` : ""} ·{" "}
                    <span className="badge neutral">{p.estado}</span>
                  </div>
                </div>
                <div className="num" style={{ textAlign: "right" }}>
                  <div>{(p.pedido_items ?? []).map((it) => `${it.cantidad}× ${it.productos?.nombre ?? ""}`).join(" · ")}</div>
                  <div className="sub" style={{ margin: 0 }}>
                    {soles((p.pedido_items ?? []).reduce((a, it) => a + it.cantidad * it.precio_unitario, 0))}
                    {Number(p.adelanto) > 0 ? ` · adelanto ${soles(p.adelanto)}` : ""}
                  </div>
                </div>
              </div>
              {p.estado !== "entregado" && p.estado !== "cancelado" && (
                <div style={{ marginTop: 8 }}>
                  <button className="btn btn-sm" onClick={() => pasarAProduccion(p)}>
                    Pasar al requerimiento
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </>
  );
}
