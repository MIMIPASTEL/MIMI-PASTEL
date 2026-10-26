"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase, soles } from "@/lib/supabase";

export default function CobroPedido({
  pedidoId,
  totalPedido,
  onSaved,
}: {
  pedidoId: string;
  totalPedido: number;
  onSaved?: () => void;
}) {
  const [pagado, setPagado] = useState(0);
  const [abierto, setAbierto] = useState(false);
  const [medio, setMedio] = useState("efectivo");
  const [monto, setMonto] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const saldo = Math.max(0, totalPedido - pagado);

  const cargar = useCallback(async () => {
    const { data } = await supabase
      .from("pagos_pedido")
      .select("monto")
      .eq("pedido_id", pedidoId);
    const suma = ((data ?? []) as any[]).reduce((a, x) => a + Number(x.monto), 0);
    setPagado(suma);
  }, [pedidoId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function cobrar() {
    setErr(null);
    const valor = Number(monto || 0);
    if (valor <= 0) return setErr("Escribe el monto cobrado.");
    setGuardando(true);
    const { error } = await supabase.from("pagos_pedido").insert({
      pedido_id: pedidoId,
      tipo: pagado > 0 ? "saldo" : "adelanto",
      medio,
      monto: valor,
      fecha: new Date().toISOString().slice(0, 10),
    });
    if (error) {
      setGuardando(false);
      return setErr(error.message);
    }

    await supabase.from("movimientos_caja").insert({
      fecha: new Date().toISOString().slice(0, 10),
      tipo: "ingreso",
      categoria_codigo: pagado > 0 ? "venta" : "adelanto_pedido",
      monto: valor,
      medio,
      concepto: pagado > 0 ? "Saldo de pedido" : "Adelanto de pedido",
      referencia: `pedido:${pedidoId}`,
    });

    const nuevoPagado = pagado + valor;
    await supabase.from("pedidos").update({ adelanto: nuevoPagado }).eq("id", pedidoId);

    setGuardando(false);
    setMonto("");
    setAbierto(false);
    await cargar();
    onSaved?.();
  }

  return (
    <div style={{ borderTop: "1px dashed var(--line)", marginTop: 10, paddingTop: 10 }}>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center", fontSize: 13 }}>
        <span>Total: <strong>{soles(totalPedido)}</strong></span>
        <span>Pagado: <strong>{soles(pagado)}</strong></span>
        <span style={{ color: saldo > 0 ? "var(--danger)" : "var(--ok)" }}>
          Saldo: <strong>{soles(saldo)}</strong>
        </span>
        {saldo > 0 && !abierto && (
          <button className="btn btn-sm" onClick={() => { setAbierto(true); setMonto(String(saldo)); }}>
            Cobrar
          </button>
        )}
        {saldo <= 0 && <span className="badge ok">Pagado</span>}
      </div>

      {err && <div className="alert err" style={{ marginTop: 8 }}>{err}</div>}

      {abierto && (
        <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
          <select className="input" style={{ maxWidth: 150 }} value={medio} onChange={(e) => setMedio(e.target.value)}>
            <option value="efectivo">Efectivo</option>
            <option value="yape">Yape</option>
            <option value="transferencia">Transferencia</option>
          </select>
          <input
            className="input num"
            type="number"
            min="0"
            step="0.1"
            style={{ maxWidth: 120 }}
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
          />
          <button className="btn btn-sm btn-primary" onClick={cobrar} disabled={guardando}>
            {guardando ? "Guardando…" : "Registrar cobro"}
          </button>
          <button className="btn btn-sm" onClick={() => setAbierto(false)}>
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}
