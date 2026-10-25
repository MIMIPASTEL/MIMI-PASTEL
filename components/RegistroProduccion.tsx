"use client";

import { useState } from "react";
import { supabase, hoyISO, soles, numero } from "@/lib/supabase";

type Prod = { id: string; codigo?: string | null; nombre: string };

export default function RegistroProduccion({ productos }: { productos: Prod[] }) {
  const [fecha, setFecha] = useState(hoyISO());
  const [prodId, setProdId] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [insumos, setInsumos] = useState("");
  const [mano, setMano] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    setErr(null);
    setMsg(null);
    if (!prodId || !cantidad) return setErr("Indica producto y cantidad producida.");
    const cant = Number(cantidad);
    if (cant <= 0) return setErr("La cantidad debe ser mayor a cero.");

    setGuardando(true);
    const ci = Number(insumos || 0);
    const cm = Number(mano || 0);

    const { error } = await supabase.from("lotes_produccion").insert({
      fecha,
      producto_id: prodId,
      cantidad_producida: cant,
      costo_insumos: ci,
      costo_mano_obra: cm,
    });

    setGuardando(false);
    if (error) return setErr(error.message);

    setMsg(`Lote registrado: ${numero(cant)} unid. · costo unitario ${soles((ci + cm) / cant)}`);
    setProdId("");
    setCantidad("");
    setInsumos("");
    setMano("");
  }

  return (
    <div className="card">
      <h2>Registro de producción</h2>
      <p className="sub" style={{ marginTop: -6 }}>
        Cada lote horneado con su costo. De aquí sale el costo unitario para valorizar las mermas
        y el costo de lo vendido.
      </p>

      {err && <div className="alert err">{err}</div>}
      {msg && <div className="alert ok">{msg}</div>}

      <div className="grid grid-3">
        <div className="field">
          <label className="f">Fecha</label>
          <input className="input" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </div>
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
          <label className="f">Cantidad producida</label>
          <input className="input num" type="number" min="0" step="1" value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-2">
        <div className="field">
          <label className="f">Costo de insumos (S/)</label>
          <input className="input num" type="number" min="0" step="0.01" value={insumos} onChange={(e) => setInsumos(e.target.value)} placeholder="0.00" />
        </div>
        <div className="field">
          <label className="f">Mano de obra (S/)</label>
          <input className="input num" type="number" min="0" step="0.01" value={mano} onChange={(e) => setMano(e.target.value)} placeholder="0.00" />
        </div>
      </div>

      <button className="btn btn-primary" onClick={guardar} disabled={guardando}>
        {guardando ? "Guardando…" : "Registrar lote"}
      </button>
    </div>
  );
}
