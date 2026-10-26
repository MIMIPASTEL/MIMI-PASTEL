"use client";

import { useState } from "react";
import { supabase, soles } from "@/lib/supabase";
import { quitarPedidoDeProduccion, sincronizarPedido } from "@/lib/pedidos";

type Prod = { id: string; nombre: string };
type Linea = { producto_id: string; cantidad: string; precio: string; tamano: string; nota: string; empaque: string };

export default function EditarPedido({
  pedido,
  productos,
  onClose,
  onSaved,
  onDeleted,
}: {
  pedido: any;
  productos: Prod[];
  onClose: () => void;
  onSaved: () => void;
  onDeleted?: () => void;
}) {
  const [cliente, setCliente] = useState(pedido.cliente ?? "");
  const [telefono, setTelefono] = useState(pedido.telefono ?? "");
  const [lugar, setLugar] = useState(pedido.lugar ?? "");
  const [fecha, setFecha] = useState(pedido.fecha_entrega ?? "");
  const [hora, setHora] = useState(pedido.hora_entrega ? String(pedido.hora_entrega).slice(0, 5) : "");
  const [adelanto, setAdelanto] = useState(String(Number(pedido.adelanto ?? 0)));
  const [estado, setEstado] = useState(pedido.estado ?? "confirmado");
  const [notas, setNotas] = useState(pedido.notas ?? "");
  const [lineas, setLineas] = useState<Linea[]>(
    (pedido.pedido_items ?? []).map((it: any) => ({
      producto_id: it.producto_id,
      cantidad: String(Number(it.cantidad)),
      precio: String(Number(it.precio_unitario ?? 0)),
      tamano: it.tamano ?? "",
      nota: it.nota ?? "",
      empaque: it.empaque ?? "",
    })),
  );
  const [err, setErr] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);

  function setLinea(i: number, campo: keyof Linea, v: string) {
    setLineas((l) => l.map((x, j) => (j === i ? { ...x, [campo]: v } : x)));
  }

  const total = lineas.reduce((a, l) => a + Number(l.cantidad || 0) * Number(l.precio || 0), 0);

  async function guardar() {
    setErr(null);
    if (!cliente.trim()) return setErr("Falta el nombre del cliente.");
    const validas = lineas.filter((l) => l.producto_id && Number(l.cantidad) > 0);
    if (validas.length === 0) return setErr("El pedido necesita al menos un producto.");

    setGuardando(true);

    const { error } = await supabase
      .from("pedidos")
      .update({
        cliente: cliente.trim(),
        telefono: telefono || null,
        lugar: lugar || null,
        fecha_entrega: fecha,
        hora_entrega: hora || null,
        adelanto: Number(adelanto || 0),
        estado,
        notas: notas || null,
      })
      .eq("id", pedido.id);

    if (error) {
      setErr(error.message);
      setGuardando(false);
      return;
    }

    const { error: e2 } = await supabase.from("pedido_items").delete().eq("pedido_id", pedido.id);
    if (e2) {
      setErr(e2.message);
      setGuardando(false);
      return;
    }

    const { error: e3 } = await supabase.from("pedido_items").insert(
      validas.map((l) => ({
        pedido_id: pedido.id,
        producto_id: l.producto_id,
        cantidad: Number(l.cantidad),
        precio_unitario: Number(l.precio || 0),
        tamano: l.tamano.trim() || null,
        nota: l.nota.trim() || null,
        empaque: l.empaque || null,
      })),
    );

    if (e3) {
      setErr(e3.message);
      setGuardando(false);
      return;
    }

    await sincronizarPedido(pedido.id);
    setGuardando(false);
    onSaved();
  }

  async function eliminar() {
    setErr(null);
    setGuardando(true);
    await quitarPedidoDeProduccion(pedido.id);
    const { error } = await supabase.from("pedidos").delete().eq("id", pedido.id);
    setGuardando(false);
    if (error) {
      setErr(error.message);
      return;
    }
    if (onDeleted) onDeleted();
    else onSaved();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="row" style={{ marginBottom: 12 }}>
          <h2 style={{ margin: 0 }}>Editar pedido</h2>
          <button className="btn btn-sm" onClick={onClose} type="button">
            Cerrar
          </button>
        </div>

        {err && <div className="alert err">{err}</div>}

        <div className="grid grid-2">
          <div className="field">
            <label className="f">Cliente</label>
            <input className="input" value={cliente} onChange={(e) => setCliente(e.target.value)} />
          </div>
          <div className="field">
            <label className="f">Teléfono</label>
            <input className="input" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
          </div>
        </div>

        <div className="field">
          <label className="f">Lugar de entrega</label>
          <input className="input" value={lugar} onChange={(e) => setLugar(e.target.value)} />
        </div>

        <div className="grid grid-3">
          <div className="field">
            <label className="f">Entrega</label>
            <input className="input" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>
          <div className="field">
            <label className="f">Hora</label>
            <input className="input" type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
          </div>
          <div className="field">
            <label className="f">Estado</label>
            <select className="input" value={estado} onChange={(e) => setEstado(e.target.value)}>
              <option value="borrador">Borrador</option>
              <option value="confirmado">Confirmado</option>
              <option value="en_produccion">En producción</option>
              <option value="despachado">Despachado</option>
              <option value="entregado">Entregado</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>
        </div>

        <h2 style={{ marginTop: 10 }}>Productos</h2>
        {lineas.map((l, i) => (
          <div key={i} style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 10, marginBottom: 8 }}>
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
                step="0.0001"
                placeholder="Precio unit."
                value={l.precio}
                onChange={(e) => setLinea(i, "precio", e.target.value)}
              />
            </div>
            <div className="grid grid-2" style={{ marginTop: 8 }}>
              <input
                className="input"
                placeholder="Tamaño: grande, 20 porciones…"
                value={l.tamano}
                onChange={(e) => setLinea(i, "tamano", e.target.value)}
              />
              <input
                className="input"
                placeholder="Indicaciones: bañada en chantilly…"
                value={l.nota}
                onChange={(e) => setLinea(i, "nota", e.target.value)}
              />
            </div>
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
            <div style={{ textAlign: "right", marginTop: 6 }}>
              <button
                className="btn btn-sm btn-danger"
                type="button"
                onClick={() => setLineas((ls) => ls.filter((_, j) => j !== i))}
              >
                Quitar
              </button>
            </div>
          </div>
        ))}

        <button
          className="btn btn-sm"
          type="button"
          onClick={() =>
            setLineas((l) => [...l, { producto_id: "", cantidad: "", precio: "", tamano: "", nota: "", empaque: "" }])
          }
        >
          + Agregar producto
        </button>

        <div className="grid grid-2" style={{ marginTop: 12 }}>
          <div className="field">
            <label className="f">Adelanto (S/)</label>
            <input
              className="input num"
              type="number"
              min="0"
              step="0.0001"
              value={adelanto}
              onChange={(e) => setAdelanto(e.target.value)}
            />
          </div>
          <div className="field">
            <label className="f">Nota general</label>
            <input className="input" value={notas} onChange={(e) => setNotas(e.target.value)} />
          </div>
        </div>

        <div className="row" style={{ marginTop: 8, flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {!confirmando ? (
              <button
                className="btn btn-sm btn-danger"
                type="button"
                onClick={() => setConfirmando(true)}
              >
                Eliminar pedido
              </button>
            ) : (
              <>
                <span style={{ fontSize: 13 }}>¿Eliminar definitivamente?</span>
                <button className="btn btn-sm btn-danger" type="button" onClick={eliminar} disabled={guardando}>
                  Sí, eliminar
                </button>
                <button className="btn btn-sm" type="button" onClick={() => setConfirmando(false)}>
                  No
                </button>
              </>
            )}
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <strong>Total: {soles(total)}</strong>
            <button className="btn btn-primary" onClick={guardar} disabled={guardando} type="button">
              {guardando ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
