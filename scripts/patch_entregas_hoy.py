from pathlib import Path

p = Path("app/pedidos/page.tsx")
s = p.read_text(encoding="utf-8")
orig = s

ancla = '      <div className="card">\n        <h2>\u00daltimos pedidos</h2>'

bloque = '''      <div className="card">
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
                      {p.hora_entrega ? String(p.hora_entrega).slice(0, 5) : ""} {p.lugar ? "\\u00b7 " + p.lugar : ""}
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
                    .join(" \\u00b7 ")}
                </div>
                <CobroPedido pedidoId={p.id} totalPedido={total} onSaved={cargar} />
              </div>
            );
          });
        })()}
      </div>

''' + ancla

if ancla in s and "Entregas de hoy" not in s:
    s = s.replace(ancla, bloque, 1)

p.write_text(s, encoding="utf-8")
print("ok:", "Entregas de hoy" in s)
