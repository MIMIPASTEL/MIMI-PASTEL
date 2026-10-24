"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase, soles, numero } from "@/lib/supabase";

type Insumo = { id: string; nombre: string; unidad_base: string; precio_unitario: number };
type Solicitud = {
  id: string;
  cantidad: number;
  nota: string | null;
  estado: string;
  fecha: string;
  insumos: { nombre: string } | null;
  nombre_libre: string | null;
};

export default function InsumosProduccion({ fecha }: { fecha: string }) {
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [cant, setCant] = useState<Record<string, string>>({});
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [pedidoInsumo, setPedidoInsumo] = useState("");
  const [pedidoCant, setPedidoCant] = useState("");
  const [pedidoNota, setPedidoNota] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    const [ins, con, sol] = await Promise.all([
      supabase.from("insumos").select("id, nombre, unidad_base, precio_unitario").eq("activo", true).order("nombre"),
      supabase.from("consumos_dia").select("insumo_id, cantidad").eq("fecha", fecha),
      supabase
        .from("solicitudes_insumo")
        .select("id, cantidad, nota, estado, fecha, nombre_libre, insumos(nombre)")
        .eq("estado", "pendiente")
        .order("creado_en"),
    ]);
    setInsumos((ins.data ?? []) as Insumo[]);
    const m: Record<string, string> = {};
    (con.data ?? []).forEach((c: any) => {
      m[c.insumo_id] = String(Number(c.cantidad));
    });
    setCant(m);
    setSolicitudes((sol.data ?? []) as unknown as Solicitud[]);
  }, [fecha]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const costo = (i: Insumo) => Number(cant[i.id] || 0) * Number(i.precio_unitario ?? 0);
  const totalDia = insumos.reduce((a, i) => a + costo(i), 0);

  async function guardarConsumo() {
    setErr(null);
    setMsg(null);
    setGuardando(true);
    const filas = insumos
      .filter((i) => Number(cant[i.id] || 0) > 0)
      .map((i) => ({
        fecha,
        insumo_id: i.id,
        cantidad: Number(cant[i.id]),
        costo_unitario: Number(i.precio_unitario ?? 0),
      }));

    if (filas.length === 0) {
      setGuardando(false);
      return setErr("No hay cantidades para guardar.");
    }

    const { error } = await supabase.from("consumos_dia").upsert(filas, { onConflict: "fecha,insumo_id" });
    setGuardando(false);
    if (error) return setErr(error.message);
    setMsg(`Consumo del día guardado · ${soles(totalDia)} en materiales.`);
    cargar();
  }

  async function pedirInsumo() {
    setErr(null);
    setMsg(null);
    if (!pedidoInsumo && !pedidoCant) return;
    if (!pedidoCant) return setErr("Indica la cantidad que necesitas.");
    const { error } = await supabase.from("solicitudes_insumo").insert({
      fecha,
      insumo_id: pedidoInsumo || null,
      nombre_libre: pedidoInsumo ? null : "Por definir",
      cantidad: Number(pedidoCant),
      nota: pedidoNota || null,
    });
    if (error) return setErr(error.message);
    setPedidoInsumo("");
    setPedidoCant("");
    setPedidoNota("");
    setMsg("Pedido enviado. La administradora lo verá en su lista.");
    cargar();
  }

  async function marcarComprado(id: string) {
    await supabase.from("solicitudes_insumo").update({ estado: "comprado", resuelto_en: new Date().toISOString() }).eq("id", id);
    cargar();
  }

  return (
    <>
      <div className="card">
        <h2>Insumos usados hoy</h2>
        <p className="sub" style={{ marginTop: -6 }}>
          Lo que se gastó en materiales. Con esto se calcula el costo real y la compra semanal.
        </p>

        {err && <div className="alert err">{err}</div>}
        {msg && <div className="alert ok">{msg}</div>}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Insumo</th>
                <th className="num">Cantidad</th>
                <th className="num">Costo</th>
              </tr>
            </thead>
            <tbody>
              {insumos.map((i) => (
                <tr key={i.id}>
                  <td>{i.nombre} <span style={{ color: "var(--muted)", fontSize: 12 }}>({i.unidad_base})</span></td>
                  <td className="num">
                    <input
                      className="input num"
                      type="number"
                      min="0"
                      step="0.1"
                      value={cant[i.id] ?? ""}
                      onChange={(e) => setCant((c) => ({ ...c, [i.id]: e.target.value }))}
                      style={{ width: 80, padding: "6px 8px" }}
                    />
                  </td>
                  <td className="num">{costo(i) > 0 ? soles(costo(i)) : ""}</td>
                </tr>
              ))}
              <tr>
                <td colSpan={2}><strong>Total del día</strong></td>
                <td className="num"><strong>{soles(totalDia)}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>

        <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={guardarConsumo} disabled={guardando}>
          {guardando ? "Guardando…" : "Guardar consumo"}
        </button>
      </div>

      <div className="card">
        <h2>Pedir insumos</h2>
        <p className="sub" style={{ marginTop: -6 }}>
          Lo que antes avisabas por WhatsApp. Queda registrado y la administradora lo ve.
        </p>

        <div className="grid grid-3">
          <div className="field">
            <label className="f">Insumo</label>
            <select className="input" value={pedidoInsumo} onChange={(e) => setPedidoInsumo(e.target.value)}>
              <option value="">—</option>
              {insumos.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.nombre}
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
              step="0.1"
              value={pedidoCant}
              onChange={(e) => setPedidoCant(e.target.value)}
            />
          </div>
          <div className="field">
            <label className="f">Nota</label>
            <input className="input" value={pedidoNota} onChange={(e) => setPedidoNota(e.target.value)} placeholder="Urgente, para mañana…" />
          </div>
        </div>
        <button className="btn" onClick={pedirInsumo}>Enviar pedido</button>

        {solicitudes.length > 0 && (
          <>
            <h2 style={{ marginTop: 18 }}>Pendientes de compra ({solicitudes.length})</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Insumo</th>
                    <th className="num">Cantidad</th>
                    <th>Nota</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {solicitudes.map((s) => (
                    <tr key={s.id}>
                      <td>{s.fecha}</td>
                      <td>{s.insumos?.nombre ?? s.nombre_libre ?? "—"}</td>
                      <td className="num">{numero(s.cantidad, 1)}</td>
                      <td>{s.nota ?? ""}</td>
                      <td style={{ textAlign: "right" }}>
                        <button className="btn btn-sm" onClick={() => marcarComprado(s.id)}>
                          Comprado
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </>
  );
}
