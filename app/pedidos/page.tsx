"use client";

import { useCallback, useEffect, useState } from "react";
import Shell, { usePerfil } from "@/components/Shell";
import { supabase, hoyISO, soles, numero, fechaCorta } from "@/lib/supabase";
import { quitarPedidoDeProduccion, sincronizarPedido } from "@/lib/pedidos";
import PedidoDetalle from "@/components/PedidoDetalle";
import CobroPedido from "@/components/CobroPedido";
import { borrarBorrador, guardarBorrador, leerBorrador } from "@/lib/draft";
import EditarPedido from "@/components/EditarPedido";

type Prod = { id: string; nombre: string };
type Punto = { id: string; codigo: string };
type Linea = { producto_id: string; presentacion_id: string; cantidad: string; precio: string; nota: string; empaque: string };
type Pedido = {
  id: string;
  cliente: string;
  fecha_entrega: string;
  hora_entrega: string | null;
  estado: string;
  adelanto: number;
  telefono?: string | null;
  lugar?: string | null;
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
  const [lugar, setLugar] = useState("");
  const [tipoCliente, setTipoCliente] = useState("directo");
  const [presentaciones, setPresentaciones] = useState<any[]>([]);
  const [preciosCli, setPreciosCli] = useState<any[]>([]);
  const [nuevoProducto, setNuevoProducto] = useState("");
  const [creandoProd, setCreandoProd] = useState(false);
  const [fecha, setFecha] = useState(hoyISO());
  const [hora, setHora] = useState("");
  const [puntoId, setPuntoId] = useState("");
  const [adelanto, setAdelanto] = useState("");
  const [lineas, setLineas] = useState<Linea[]>([{ producto_id: "", presentacion_id: "", cantidad: "", precio: "", nota: "", empaque: "" }]);
  const [draftListo, setDraftListo] = useState(false);
  const [editando, setEditando] = useState<any>(null);

  const cargar = useCallback(async () => {
    const [p, pv, pe] = await Promise.all([
      supabase.from("productos").select("id, nombre").eq("activo", true).order("orden", { ascending: true }),
      supabase.from("puntos_venta").select("id, codigo").eq("activo", true).order("orden", { ascending: true }).order("codigo"),
      supabase
        .from("pedidos")
        .select("id, cliente, telefono, lugar, notas, fecha_entrega, hora_entrega, estado, adelanto, pedido_items(producto_id, cantidad, precio_unitario, tamano, nota, empaque, productos(nombre))")
        .order("fecha_entrega", { ascending: false })
        .limit(40),
    ]);
    setProductos((p.data ?? []) as Prod[]);
    setPuntos((pv.data ?? []) as Punto[]);

    const [pes, prc] = await Promise.all([
      supabase.from("presentaciones").select("id, producto_id, nombre, es_default, orden").eq("activo", true).order("orden"),
      supabase.from("precios_cliente").select("presentacion_id, tipo_cliente, precio"),
    ]);
    setPresentaciones((pes.data ?? []) as any[]);
    setPreciosCli((prc.data ?? []) as any[]);
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
      if (typeof d.lugar === "string") setLugar(d.lugar);
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
      () => guardarBorrador("mip:pedido:nuevo", { cliente, telefono, lugar, fecha, hora, puntoId, adelanto, lineas }),
      600,
    );
    return () => clearTimeout(t);
  }, [draftListo, cliente, telefono, lugar, fecha, hora, puntoId, adelanto, lineas]);

  const presentacionesDe = (prodId: string) =>
    presentaciones.filter((x) => x.producto_id === prodId);

  const precioDe = (presentacionId: string, tipo: string) => {
    const row = preciosCli.find(
      (x) => x.presentacion_id === presentacionId && x.tipo_cliente === tipo,
    );
    return row ? Number(row.precio) : 0;
  };

  function elegirProducto(i: number, prodId: string) {
    const lista = presentacionesDe(prodId);
    const def = lista.find((x) => x.es_default) ?? lista[0];
    setLineas((l) =>
      l.map((x, j) =>
        j === i
          ? {
              ...x,
              producto_id: prodId,
              presentacion_id: def?.id ?? "",
              precio: def ? String(precioDe(def.id, tipoCliente)) : "",
            }
          : x,
      ),
    );
  }

  function elegirPresentacion(i: number, presId: string) {
    setLineas((l) =>
      l.map((x, j) =>
        j === i ? { ...x, presentacion_id: presId, precio: String(precioDe(presId, tipoCliente)) } : x,
      ),
    );
  }

  useEffect(() => {
    setLineas((ls) =>
      ls.map((l) =>
        l.presentacion_id
          ? { ...l, precio: String(precioDe(l.presentacion_id, tipoCliente)) }
          : l,
      ),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipoCliente]);

  function setLinea(i: number, campo: keyof Linea, v: string) {
    setLineas((l) => l.map((x, j) => (j === i ? { ...x, [campo]: v } : x)));
  }

  const total = lineas.reduce((a, l) => a + Number(l.cantidad || 0) * Number(l.precio || 0), 0);

  async function crearProductoRapido() {
    setErr(null);
    setMsg(null);
    const nombre = nuevoProducto.trim();
    if (!nombre) return;
    setCreandoProd(true);
    const { error } = await supabase.from("productos").insert({ nombre, unidad: "unidad" });
    setCreandoProd(false);
    if (error) return setErr(error.message);
    setNuevoProducto("");
    setMsg(`Producto "${nombre}" creado. Ya puedes elegirlo en la lista.`);
    cargar();
  }

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
        lugar: lugar || null,
        tipo_cliente: tipoCliente,
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
        presentacion_id: l.presentacion_id || null,
        cantidad: Number(l.cantidad),
        precio_unitario: Number(l.precio || 0),
        nota: l.nota?.trim() ? l.nota.trim() : null,
        empaque: l.empaque || null,
      })),
    );
    if (e2) return setErr(e2.message);

    const sync = await sincronizarPedido(ped.id, perfil?.id);
    if (sync.error) setErr("Pedido guardado, pero no se pudo programar: " + sync.error);

    setCliente("");
    setTelefono("");
    setLugar("");
    setTipoCliente("directo");
    setHora("");
    setAdelanto("");
    setLineas([{ producto_id: "", presentacion_id: "", cantidad: "", precio: "", nota: "", empaque: "" }]);
    borrarBorrador("mip:pedido:nuevo");
    if (!sync.error) setMsg("Pedido registrado y agregado a Programar.");
    cargar();
  }

  function enviarWhatsapp(p: Pedido) {
    const items = (p.pedido_items ?? []) as any[];

    const total = items.reduce((a, it) => a + Number(it.cantidad) * Number(it.precio_unitario ?? 0), 0);
    const adelanto = Number(p.adelanto ?? 0);
    const saldo = Math.max(0, total - adelanto);

    const [y, m, d] = String(p.fecha_entrega).split("-");
    const fecha = `${d}/${m}/${y}`;

    let hora = "";
    if (p.hora_entrega) {
      const [hh, mi] = String(p.hora_entrega).split(":");
      const h24 = Number(hh);
      const suf = h24 >= 12 ? "p.m." : "a.m.";
      const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
      hora = `${String(h12).padStart(2, "0")}:${mi} ${suf}`;
    }

    const detalle = items
      .map((it) => {
        const nombre = it.productos?.nombre ?? nombres[it.producto_id] ?? "Producto";
        const subtotal = (Number(it.cantidad) * Number(it.precio_unitario ?? 0)).toFixed(2);
        const lineas = [`🎂 ${nombre} × ${Number(it.cantidad)} — S/ ${subtotal}`];
        if (it.tamano) lineas.push(`   🍰 Tamaño: ${it.tamano}`);
        if (it.empaque) lineas.push(`   📦 Empaque: ${it.empaque}`);
        if (it.nota) lineas.push(`   🖌️ Decoración: ${it.nota}`);
        return lineas.join("\n");
      })
      .join("\n\n");

    const texto =
      `🧁 *MIMI PASTEL*\n` +
      `_Confirmación de pedido_\n\n` +
      `¡Gracias por tu pedido! 💗\n` +
      `Nos alegra ser parte de tus momentos especiales.\n\n` +
      `👤 *Cliente:* ${p.cliente}\n` +
      `📅 *Entrega:* ${fecha}${hora ? " · " + hora : ""}\n` +
      (p.lugar ? `📍 *Lugar:* ${p.lugar}\n` : "") +
      `\n💗 *DETALLE DEL PEDIDO* 💗\n` +
      `------------------------------\n` +
      `${detalle}\n` +
      `------------------------------\n\n` +
      `🧾 Total: *S/ ${total.toFixed(2)}*\n` +
      `💵 Adelanto: S/ ${adelanto.toFixed(2)}\n` +
      `❗ *SALDO PENDIENTE: S/ ${saldo.toFixed(2)}*\n\n` +
      `Gracias por confiar en Mimi Pastel 💗\n` +
      `_Si no le gusta, no lo paga._`;

    const tel = (p.telefono ?? "").replace(/\D/g, "");
    const destino = tel.length === 9 ? `51${tel}` : tel;
    window.open(`https://wa.me/${destino}?text=${encodeURIComponent(texto)}`, "_blank");
  }

  async function eliminarPedido(p: Pedido) {
    setErr(null);
    setMsg(null);
    await quitarPedidoDeProduccion(p.id);
    const { error } = await supabase.from("pedidos").delete().eq("id", p.id);
    if (error) return setErr(error.message);
    setMsg(`Pedido de ${p.cliente} eliminado.`);
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

        <div className="field">
          <label className="f">Tipo de cliente</label>
          <select className="input" value={tipoCliente} onChange={(e) => setTipoCliente(e.target.value)}>
            <option value="directo">Cliente directo</option>
            <option value="distribuidor">Distribuidor</option>
          </select>
        </div>

        <div className="field">
          <label className="f">Lugar de entrega</label>
          <input
            className="input"
            value={lugar}
            onChange={(e) => setLugar(e.target.value)}
            placeholder="Dirección o referencia (ej. Av. Lima 245, frente al mercado)"
          />
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
              <select className="input" value={l.producto_id} onChange={(e) => elegirProducto(i, e.target.value)}>
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
                step="0.0001"
                placeholder="Precio unit."
                value={l.precio}
                onChange={(e) => setLinea(i, "precio", e.target.value)}
              />
            </div>
            {presentacionesDe(l.producto_id).length > 1 && (
              <select
                className="input"
                style={{ marginTop: 8 }}
                value={l.presentacion_id}
                onChange={(e) => elegirPresentacion(i, e.target.value)}
              >
                {presentacionesDe(l.producto_id).map((pr) => (
                  <option key={pr.id} value={pr.id}>
                    {pr.nombre}
                  </option>
                ))}
              </select>
            )}
            <input
              className="input"
              style={{ marginTop: 8 }}
              placeholder="Indicaciones: bañada en chantilly, rellena de fudge, dedicatoria…"
              value={l.nota}
              onChange={(e) => setLinea(i, "nota", e.target.value)}
            />
            <select
              className="input"
              style={{ marginTop: 8 }}
              value={l.empaque}
              onChange={(e) => setLinea(i, "empaque", e.target.value)}
            >
              <option value="">Empaque…</option>
              <option value="caja">Caja</option>
              <option value="bolsa">Bolsa</option>
              <option value="bandeja">Bandeja</option>
              <option value="otro">Otro</option>
            </select>
          </div>
        ))}

        <div className="row" style={{ marginTop: 8 }}>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setLineas((l) => [...l, { producto_id: "", presentacion_id: "", cantidad: "", precio: "", nota: "", empaque: "" }])}
          >
            + Agregar producto
          </button>
          <strong>{soles(total)}</strong>
        </div>

        <div
          style={{
            border: "1px dashed var(--line)",
            borderRadius: 10,
            padding: 10,
            marginTop: 8,
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: 12.5, color: "var(--muted)" }}>
            ¿Producto que no está en la lista? (bocaditos, tortas especiales…)
          </span>
          <input
            className="input"
            style={{ flex: 1, minWidth: 160 }}
            placeholder="Nombre del producto"
            value={nuevoProducto}
            onChange={(e) => setNuevoProducto(e.target.value)}
          />
          <button className="btn btn-sm" type="button" onClick={crearProductoRapido} disabled={creandoProd}>
            {creandoProd ? "Creando…" : "Crear producto"}
          </button>
        </div>

        <div className="field" style={{ marginTop: 12 }}>
          <label className="f">Adelanto recibido (S/)</label>
          <input className="input num" type="number" min="0" step="0.1" value={adelanto} onChange={(e) => setAdelanto(e.target.value)} placeholder="0.00" />
        </div>

        <button className="btn btn-primary btn-block">Registrar pedido</button>
      </form>

      <div className="card">
        <h2>Entregas de hoy</h2>
        {(() => {
          const hoy = new Date().toISOString().slice(0, 10);
          const delDia = pedidos.filter((p: any) => p.fecha_entrega === hoy && p.estado !== "cancelado");
          if (delDia.length === 0) return <p className="empty">No hay entregas programadas para hoy.</p>;
          return delDia.map((p: any) => {
            const items = (p.pedido_items ?? []) as any[];
            const total = items.reduce((a, it) => a + Number(it.cantidad) * Number(it.precio_unitario ?? 0), 0);
            const adelanto = Number(p.adelanto ?? 0);
            const saldo = Math.max(0, total - adelanto);
            return (
              <div key={p.id} style={{ borderBottom: "1px solid var(--line)", padding: "10px 0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <div>
                    <strong>{p.cliente}</strong>
                    <span className="sub" style={{ marginLeft: 8 }}>
                      {p.hora_entrega ? String(p.hora_entrega).slice(0, 5) : ""} {p.lugar ? "\u00b7 " + p.lugar : ""}
                    </span>
                  </div>
                  <div>
                    <span className="sub">Total </span><strong>{soles(total)}</strong>
                    <span className="sub" style={{ marginLeft: 10 }}>Adelanto </span><strong>{soles(adelanto)}</strong>
                    <span className="sub" style={{ marginLeft: 10 }}>Cobrar </span>
                    <strong style={{ color: saldo > 0 ? "var(--danger)" : "var(--ok)" }}>{soles(saldo)}</strong>
                  </div>
                </div>
                <div className="sub" style={{ fontSize: 12.5, marginTop: 4 }}>
                  {items
                    .map((it) => {
                      const nombre = it.productos?.nombre ?? nombres[it.producto_id] ?? "Producto";
                      return `${nombre} x${Number(it.cantidad)}`;
                    })
                    .join(" \u00b7 ")}
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                  <button className="btn btn-sm" onClick={() => setEditando(p)}>
                    Editar pedido
                  </button>
                </div>
                <CobroPedido pedidoId={p.id} totalPedido={total} onSaved={cargar} />
              </div>
            );
          });
        })()}
      </div>

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
              onEliminar={() => eliminarPedido(p)}
              accion={
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button className="btn btn-sm" onClick={() => setEditando(p)}>
                    Editar pedido
                  </button>
                  <button className="btn btn-sm" onClick={() => enviarWhatsapp(p)}>
                    WhatsApp
                  </button>
                  <CobroPedido
                    pedidoId={p.id}
                    totalPedido={(p.pedido_items ?? []).reduce(
                      (a: number, it: any) => a + Number(it.cantidad) * Number(it.precio_unitario ?? 0),
                      0,
                    )}
                    onSaved={cargar}
                  />
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
          onDeleted={() => {
            setEditando(null);
            setMsg("Pedido eliminado y retirado de producción.");
            cargar();
          }}
        />
      )}
    </>
  );
}
