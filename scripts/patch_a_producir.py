from pathlib import Path

p = Path("app/programacion/page.tsx")
s = p.read_text(encoding="utf-8")
orig = s

# 1. estado
if "sobranteProd" not in s:
    s = s.replace(
        '  const [pedidosDia, setPedidosDia] = useState<any[]>([]);',
        '  const [pedidosDia, setPedidosDia] = useState<any[]>([]);\n'
        '  const [sobranteProd, setSobranteProd] = useState<Record<string, number>>({});',
        1,
    )

# 2. consulta dentro de cargarDia
if "v_sugerido_produccion" not in s:
    s = s.replace(
        """      supabase
        .from("pedidos")
        .select("id, cliente, telefono, lugar, notas, hora_entrega, estado, adelanto, pedido_items(producto_id, cantidad, precio_unitario, nota, empaque, productos(nombre))")
        .eq("fecha_entrega", fecha)
        .neq("estado", "cancelado")
        .order("hora_entrega"),
    ]);""",
        """      supabase
        .from("pedidos")
        .select("id, cliente, telefono, lugar, notas, hora_entrega, estado, adelanto, pedido_items(producto_id, cantidad, precio_unitario, nota, empaque, productos(nombre))")
        .eq("fecha_entrega", fecha)
        .neq("estado", "cancelado")
        .order("hora_entrega"),
      supabase.from("v_sugerido_produccion").select("producto_id, sobrante_ayer").eq("fecha", fecha),
    ]);""",
        1,
    )
    s = s.replace(
        "    const [req, om, pe] = await Promise.all([",
        "    const [req, om, pe, sug] = await Promise.all([",
        1,
    )
    s = s.replace(
        "    setPedidosDia((pe.data ?? []) as any[]);",
        """    setPedidosDia((pe.data ?? []) as any[]);

    const sm: Record<string, number> = {};
    ((sug.data ?? []) as any[]).forEach((x) => {
      sm[x.producto_id] = (sm[x.producto_id] ?? 0) + Number(x.sobrante_ayer);
    });
    setSobranteProd(sm);""",
        1,
    )

# 3. filas de sobrante y "a producir"
ancla = """                <td className="num"><strong>{numero(granTotal)}</strong></td>
              </tr>"""
if ancla not in s:
    raise SystemExit("no se encontro la fila de totales")

extra = """                <td className="num"><strong>{numero(granTotal)}</strong></td>
              </tr>

              {totalSobrante > 0 && (
                <tr style={{ background: "#f7fbf8" }}>
                  <td className="sticky" style={{ fontSize: 12.5 }}>− Sobrante útil</td>
                  {productos.map((p) => (
                    <td key={p.id} className="num" style={{ fontSize: 12.5 }}>
                      {sobranteProd[p.id] ? numero(sobranteProd[p.id]) : ""}
                    </td>
                  ))}
                  <td className="num" style={{ fontSize: 12.5 }}>{numero(totalSobrante)}</td>
                </tr>
              )}

              {totalSobrante > 0 && (
                <tr style={{ background: "#fdf8ec" }}>
                  <td className="sticky"><strong>A producir</strong></td>
                  {productos.map((p) => {
                    const es = Math.max(0, totalCol(p.id) - (sobranteProd[p.id] ?? 0));
                    return (
                      <td key={p.id} className="num">
                        <strong>{es > 0 ? numero(es) : ""}</strong>
                      </td>
                    );
                  })}
                  <td className="num">
                    <strong>
                      {numero(
                        productos.reduce(
                          (a, p) => a + Math.max(0, totalCol(p.id) - (sobranteProd[p.id] ?? 0)),
                          0,
                        ),
                      )}
                    </strong>
                  </td>
                </tr>
              )}"""

s = s.replace(ancla, extra, 1)

# 4. total de sobrante
if "totalSobrante" not in s.split("const totalSobrante")[0]:
    s = s.replace(
        "  const totalPedido = (p: any) =>",
        "  const totalSobrante = Object.values(sobranteProd).reduce((a, b) => a + Number(b), 0);\n\n  const totalPedido = (p: any) =>",
        1,
    )

p.write_text(s, encoding="utf-8")
print("aplicado:", s != orig)
print("sobranteProd:", "sobranteProd" in s, "| totalSobrante:", "totalSobrante" in s)
