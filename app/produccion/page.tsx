"use client";

import { useCallback, useEffect, useState } from "react";
import Shell, { usePerfil } from "@/components/Shell";
import { supabase, hoyISO, soles, numero, fechaCorta } from "@/lib/supabase";
import PedidoDetalle from "@/components/PedidoDetalle";
import Despacho from "@/components/Despacho";
import SobrantesRevision from "@/components/SobrantesRevision";
import InsumosProduccion from "@/components/InsumosProduccion";
import ProduccionDelDia from "@/components/ProduccionDelDia";

type Prod = { id: string; nombre: string };
type Punto = { id: string; codigo: string; nombre: string };
type Item = {
  id: string;
  producto_id: string;
  cantidad: number;
  destino_punto_id: string | null;
  destino_pedido_id: string | null;
  origen: string;
};

export default function ProduccionPage() {
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
  const [items, setItems] = useState<Item[]>([]);
  const [reqId, setReqId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pedidosDia, setPedidosDia] = useState<any[]>([]);

  // alta de requerimiento
  const [nuevoProd, setNuevoProd] = useState("");
  const [nuevaCant, setNuevaCant] = useState("");
  const [nuevoDestino, setNuevoDestino] = useState("");

  // registro de producción
  const [prodProd, setProdProd] = useState("");
  const [prodCant, setProdCant] = useState("");
  const [prodInsumos, setProdInsumos] = useState("");
  const [prodMano, setProdMano] = useState("");
  const [prodDestino, setProdDestino] = useState("");

  // merma
  const [mermaProd, setMermaProd] = useState("");
  const [mermaCant, setMermaCant] = useState("");
  const [mermaMotivo, setMermaMotivo] = useState("roto");

  const cargar = useCallback(async () => {
    const [p, pv] = await Promise.all([
      supabase.from("productos").select("id, nombre").eq("activo", true).order("orden", { ascending: true }),
      supabase.from("puntos_venta").select("id, codigo, nombre").eq("activo", true).order("orden", { ascending: true }).order("codigo"),
    ]);
    setProductos((p.data ?? []) as Prod[]);
    setPuntos((pv.data ?? []) as Punto[]);

    const { data: pe } = await supabase
      .from("pedidos")
      .select("id, cliente, telefono, notas, hora_entrega, estado, adelanto, pedido_items(producto_id, cantidad, precio_unitario, nota, productos(nombre))")
      .eq("fecha_entrega", fecha)
      .neq("estado", "cancelado")
      .order("hora_entrega");
    setPedidosDia(pe ?? []);

    const { data: req } = await supabase
      .from("requerimientos")
      .select("id")
      .eq("fecha", fecha)
      .maybeSingle();

    if (!req) {
      setReqId(null);
      setItems([]);
      return;
    }
    setReqId(req.id);
    const { data: its } = await supabase
      .from("requerimiento_items")
      .select("id, producto_id, cantidad, destino_punto_id, destino_pedido_id, origen")
      .eq("requerimiento_id", req.id);
    setItems((its ?? []) as Item[]);
  }, [fecha]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  function limpiar() {
    setErr(null);
    setMsg(null);
  }

  async function asegurarReq(): Promise<string | null> {
    if (reqId) return reqId;
    const { data, error } = await supabase
      .from("requerimientos")
      .insert({ fecha, creado_por: perfil?.id })
      .select("id")
      .single();
    if (error) {
      // puede existir ya (carrera)
      const { data: ex } = await supabase.from("requerimientos").select("id").eq("fecha", fecha).maybeSingle();
      if (ex) {
        setReqId(ex.id);
        return ex.id;
      }
      setErr("No se pudo crear el requerimiento: " + error.message);
      return null;
    }
    setReqId(data.id);
    return data.id;
  }

  async function agregarItem(e: React.FormEvent) {
    e.preventDefault();
    limpiar();
    if (!nuevoProd || !nuevaCant || !nuevoDestino) {
      setErr("Completa producto, cantidad y destino.");
      return;
    }
    const id = await asegurarReq();
    if (!id) return;
    const { error } = await supabase.from("requerimiento_items").insert({
      requerimiento_id: id,
      producto_id: nuevoProd,
      cantidad: Number(nuevaCant),
      destino_punto_id: nuevoDestino,
      origen: "estimado",
    });
    if (error) {
      setErr(error.message);
      return;
    }
    setNuevoProd("");
    setNuevaCant("");
    setNuevoDestino("");
    setMsg("Requerimiento actualizado.");
    cargar();
  }

  async function quitarItem(id: string) {
    await supabase.from("requerimiento_items").delete().eq("id", id);
    cargar();
  }

  async function publicar() {
    limpiar();
    if (!reqId) return;
    const { error } = await supabase
      .from("requerimientos")
      .update({ estado: "publicado" })
      .eq("id", reqId);
    if (error) setErr(error.message);
    else setMsg("Requerimiento publicado: el personal ya lo ve en su pantalla.");
  }

  async function registrarProduccion(e: React.FormEvent) {
    e.preventDefault();
    limpiar();
    if (!prodProd || !prodCant) {
      setErr("Indica producto y cantidad producida.");
      return;
    }
    const cant = Number(prodCant);
    if (cant <= 0) {
      setErr("La cantidad debe ser mayor a cero.");
      return;
    }
    const insumos = Number(prodInsumos || 0);
    const mano = Number(prodMano || 0);
    const { error } = await supabase.from("lotes_produccion").insert({
      fecha,
      producto_id: prodProd,
      cantidad_producida: cant,
      costo_insumos: insumos,
      costo_mano_obra: mano,
      punto_venta_id: prodDestino || null,
      creado_por: perfil?.id,
    });
    if (error) {
      setErr(error.message);
      return;
    }
    setProdProd("");
    setProdCant("");
    setProdInsumos("");
    setProdMano("");
    setProdDestino("");
    setMsg(
      `Producción registrada: ${numero(cant)} unid. · costo unitario ${soles((insumos + mano) / cant)}`,
    );
  }

  async function registrarMerma(e: React.FormEvent) {
    e.preventDefault();
    limpiar();
    if (!mermaProd || !mermaCant) {
      setErr("Indica producto y cantidad de la merma.");
      return;
    }
    const { error } = await supabase.from("mermas").insert({
      fecha,
      producto_id: mermaProd,
      cantidad: Number(mermaCant),
      tipo: "produccion",
      motivo: mermaMotivo,
      usuario_id: perfil?.id,
    });
    if (error) {
      setErr(error.message);
      return;
    }
    setMermaProd("");
    setMermaCant("");
    setMsg("Merma registrada.");
  }

  const nombreProd = (id: string) => productos.find((p) => p.id === id)?.nombre ?? "—";

  const nombres: Record<string, string> = {};
  productos.forEach((p) => {
    nombres[p.id] = p.nombre;
  });
  const nombreDestino = (it: Item) => {
    if (it.destino_pedido_id) return "Pedido";
    return puntos.find((p) => p.id === it.destino_punto_id)?.codigo ?? "—";
  };

  return (
    <>
      <h1>Producción</h1>
      <p className="sub">Requerimiento del día, lo producido y las mermas</p>

      <div className="card">
        <label className="f">Fecha</label>
        <input
          className="input"
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          style={{ maxWidth: 200 }}
        />
      </div>

      {err && <div className="alert err">{err}</div>}
      {msg && <div className="alert ok">{msg}</div>}

      <div className="card">
        <div className="row" style={{ marginBottom: 10 }}>
          <h2 style={{ margin: 0 }}>Requerimiento · {fechaCorta(fecha)}</h2>
          {reqId && <span className="badge neutral">{items.length} ítems</span>}
        </div>

        {items.length === 0 ? (
          <p className="empty">Sin requerimiento. Agrega el primero abajo.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th className="num">Cantidad</th>
                  <th>Destino</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id}>
                    <td>{nombreProd(it.producto_id)}</td>
                    <td className="num">{numero(it.cantidad)}</td>
                    <td>{nombreDestino(it)}</td>
                    <td style={{ textAlign: "right" }}>
                      <button className="btn btn-sm btn-danger" onClick={() => quitarItem(it.id)}>
                        Quitar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {items.length > 0 && (
          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={publicar}>
            Publicar requerimiento
          </button>
        )}
      </div>

      <div className="card">
        <h2>Agregar al requerimiento</h2>
        <form onSubmit={agregarItem}>
          <div className="grid grid-3">
            <div className="field">
              <label className="f">Producto</label>
              <select className="input" value={nuevoProd} onChange={(e) => setNuevoProd(e.target.value)}>
                <option value="">—</option>
                {productos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="f">Cantidad</label>
              <input
                className="input num"
                type="number"
                min="0"
                step="1"
                value={nuevaCant}
                onChange={(e) => setNuevaCant(e.target.value)}
              />
            </div>
            <div className="field">
              <label className="f">Destino</label>
              <select className="input" value={nuevoDestino} onChange={(e) => setNuevoDestino(e.target.value)}>
                <option value="">—</option>
                {puntos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.codigo}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button className="btn btn-primary">Agregar</button>
        </form>
      </div>

      {pedidosDia.length > 0 && (
        <div className="card">
          <h2>Pedidos del día · indicaciones del cliente</h2>
          {pedidosDia.map((p) => (
            <PedidoDetalle key={p.id} pedido={p} nombres={nombres} />
          ))}
          <p className="sub" style={{ margin: "10px 0 0" }}>
            Toca cada pedido para ver cómo debe prepararse.
          </p>
        </div>
      )}

      <ProduccionDelDia fecha={fecha} productos={productos} />

      <SobrantesRevision fecha={fecha} productos={productos} puntos={puntos} />

      <Despacho fecha={fecha} productos={productos} puntos={puntos} />

      <div className="card">
        <h2>Registrar producción</h2>
        <form onSubmit={registrarProduccion}>
          <div className="grid grid-3">
            <div className="field">
              <label className="f">Producto</label>
              <select className="input" value={prodProd} onChange={(e) => setProdProd(e.target.value)}>
                <option value="">—</option>
                {productos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="f">Producido</label>
              <input
                className="input num"
                type="number"
                min="0"
                step="1"
                value={prodCant}
                onChange={(e) => setProdCant(e.target.value)}
              />
            </div>
            <div className="field">
              <label className="f">Destino (opcional)</label>
              <select className="input" value={prodDestino} onChange={(e) => setProdDestino(e.target.value)}>
                <option value="">—</option>
                {puntos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.codigo}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-2">
            <div className="field">
              <label className="f">Costo de insumos (S/)</label>
              <input
                className="input num"
                type="number"
                min="0"
                step="0.01"
                value={prodInsumos}
                onChange={(e) => setProdInsumos(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="field">
              <label className="f">Mano de obra (S/)</label>
              <input
                className="input num"
                type="number"
                min="0"
                step="0.01"
                value={prodMano}
                onChange={(e) => setProdMano(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>
          <button className="btn btn-primary">Registrar lote</button>
        </form>
      </div>

      <div className="card">
        <h2>Registrar merma de producción</h2>
        <form onSubmit={registrarMerma}>
          <div className="grid grid-3">
            <div className="field">
              <label className="f">Producto</label>
              <select className="input" value={mermaProd} onChange={(e) => setMermaProd(e.target.value)}>
                <option value="">—</option>
                {productos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="f">Cantidad</label>
              <input
                className="input num"
                type="number"
                min="0"
                step="1"
                value={mermaCant}
                onChange={(e) => setMermaCant(e.target.value)}
              />
            </div>
            <div className="field">
              <label className="f">Motivo</label>
              <select className="input" value={mermaMotivo} onChange={(e) => setMermaMotivo(e.target.value)}>
                <option value="roto">Roto</option>
                <option value="quemado">Quemado</option>
                <option value="vencido">Vencido</option>
                <option value="contaminado">Contaminado</option>
                <option value="otro">Otro</option>
              </select>
            </div>
          </div>
          <button className="btn btn-primary">Registrar merma</button>
        </form>
      </div>

      <InsumosProduccion fecha={fecha} />

      {productos.length === 0 && (
        <div className="alert err">
          No hay productos creados. Un administrador debe darlos de alta en Ajustes.
        </div>
      )}
    </>
  );
}
