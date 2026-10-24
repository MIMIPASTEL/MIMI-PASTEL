"use client";

import { useState } from "react";

type Props = {
  pedido: any;
  /** id de producto -> nombre corto (código) para mostrar */
  nombres?: Record<string, string>;
  accion?: React.ReactNode;
  abiertoInicial?: boolean;
};

/**
 * Tarjeta de pedido que se despliega al tocarla.
 * Muestra las especificaciones de cada línea (relleno, cobertura, dedicatoria…).
 */
export default function PedidoDetalle({ pedido, nombres = {}, accion, abiertoInicial = false }: Props) {
  const [abierto, setAbierto] = useState(abiertoInicial);
  const items = pedido?.pedido_items ?? [];
  const total = items.reduce(
    (a: number, it: any) => a + Number(it.cantidad) * Number(it.precio_unitario ?? 0),
    0,
  );
  const conEspecificaciones = items.some((it: any) => (it.nota ?? "").trim().length > 0);

  return (
    <div style={{ borderBottom: "1px solid #f3ebe5" }}>
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        style={{
          width: "100%",
          textAlign: "left",
          background: "transparent",
          border: "none",
          padding: "10px 0",
          cursor: "pointer",
          fontFamily: "inherit",
          color: "inherit",
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "flex-start",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <strong>{pedido.cliente}</strong>
            <span className="badge neutral">{pedido.estado}</span>
            {conEspecificaciones && <span className="badge warn">con indicaciones</span>}
          </div>
          <div className="sub" style={{ margin: "2px 0 0" }}>
            {pedido.hora_entrega ? String(pedido.hora_entrega).slice(0, 5) : "sin hora"} ·{" "}
            {items
              .map((it: any) => `${nombres[it.producto_id] ?? it.productos?.nombre ?? "?"}×${Number(it.cantidad)}`)
              .join(" · ")}
          </div>
        </div>
        <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
          {total > 0 && <div style={{ fontSize: 13, fontWeight: 600 }}>S/ {total.toFixed(2)}</div>}
          <div style={{ fontSize: 12, color: "var(--muted)" }}>{abierto ? "▲ ocultar" : "▼ ver detalle"}</div>
        </div>
      </button>

      {abierto && (
        <div style={{ padding: "0 0 12px" }}>
          {items.map((it: any, i: number) => (
            <div
              key={i}
              style={{
                background: "var(--bg)",
                border: "1px solid var(--line)",
                borderRadius: 10,
                padding: "10px 12px",
                marginBottom: 8,
              }}
            >
              <div className="row">
                <strong>
                  {nombres[it.producto_id] ?? it.productos?.nombre ?? "Producto"} × {Number(it.cantidad)}
                </strong>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>
                  S/ {Number(it.precio_unitario ?? 0).toFixed(2)} c/u
                </span>
              </div>
              {it.nota ? (
                <p style={{ margin: "6px 0 0", fontSize: 13.5, whiteSpace: "pre-wrap" }}>📝 {it.nota}</p>
              ) : (
                <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--muted)" }}>Sin indicaciones</p>
              )}
            </div>
          ))}

          {pedido.notas && (
            <p style={{ margin: "4px 0 0", fontSize: 13 }}>
              <strong>Nota general:</strong> {pedido.notas}
            </p>
          )}
          {pedido.telefono && (
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--muted)" }}>📞 {pedido.telefono}</p>
          )}
          {Number(pedido.adelanto ?? 0) > 0 && (
            <p style={{ margin: "4px 0 0", fontSize: 13 }}>
              Adelanto: S/ {Number(pedido.adelanto).toFixed(2)}
            </p>
          )}
          {accion && <div style={{ marginTop: 10 }}>{accion}</div>}
        </div>
      )}
    </div>
  );
}
