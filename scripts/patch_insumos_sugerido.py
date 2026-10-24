from pathlib import Path

p = Path("components/InsumosProduccion.tsx")
s = p.read_text(encoding="utf-8")
orig = s

# estado
s = s.replace(
    "  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);",
    "  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);\n"
    "  const [sugerido, setSugerido] = useState<Record<string, number>>({});",
    1,
)

# consultas extra
s = s.replace(
    "    const [ins, con, sol] = await Promise.all([",
    "    const [ins, con, sol, lot, rec] = await Promise.all([",
    1,
)
s = s.replace(
    """        .eq("estado", "pendiente")
        .order("creado_en"),
    ]);""",
    """        .eq("estado", "pendiente")
        .order("creado_en"),
      supabase.from("lotes_produccion").select("producto_id, cantidad_producida").eq("fecha", fecha),
      supabase.from("recetas").select("id, producto_id, version, rendimiento, receta_items(insumo_id, cantidad)"),
    ]);

    // Sugerido por receta: lotes producidos hoy x receta del producto
    const mejores: Record<string, any> = {};
    ((rec.data ?? []) as any[]).forEach((r) => {
      if (!mejores[r.producto_id] || Number(r.version) > Number(mejores[r.producto_id].version)) {
        mejores[r.producto_id] = r;
      }
    });
    const sug: Record<string, number> = {};
    ((lot.data ?? []) as any[]).forEach((l) => {
      const r = mejores[l.producto_id];
      if (!r) return;
      const factor = Number(l.cantidad_producida) / Number(r.rendimiento || 1);
      (r.receta_items ?? []).forEach((it: any) => {
        sug[it.insumo_id] = (sug[it.insumo_id] ?? 0) + factor * Number(it.cantidad);
      });
    });
    setSugerido(sug);""",
    1,
)

# encabezado con columna sugerido
s = s.replace(
    """                <th>Insumo</th>
                <th className="num">Cantidad</th>
                <th className="num">Costo</th>""",
    """                <th>Insumo</th>
                <th className="num">Sugerido</th>
                <th className="num">Cantidad</th>
                <th className="num">Costo</th>""",
    1,
)

# celda sugerido
s = s.replace(
    """                  <td>{i.nombre} <span style={{ color: "var(--muted)", fontSize: 12 }}>({i.unidad_base})</span></td>
                  <td className="num">""",
    """                  <td>{i.nombre} <span style={{ color: "var(--muted)", fontSize: 12 }}>({i.unidad_base})</span></td>
                  <td className="num" style={{ color: "var(--muted)" }}>
                    {sugerido[i.id] ? numero(sugerido[i.id], 2) : ""}
                  </td>
                  <td className="num">""",
    1,
)

# colSpan del total
s = s.replace(
    """                <td colSpan={2}><strong>Total del día</strong></td>""",
    """                <td colSpan={3}><strong>Total del día</strong></td>""",
    1,
)

# boton aplicar sugerido
s = s.replace(
    """        <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={guardarConsumo} disabled={guardando}>
          {guardando ? "Guardando…" : "Guardar consumo"}
        </button>""",
    """        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          <button className="btn btn-primary" onClick={guardarConsumo} disabled={guardando}>
            {guardando ? "Guardando…" : "Guardar consumo"}
          </button>
          <button
            className="btn"
            type="button"
            onClick={() => {
              const nuevo: Record<string, string> = { ...cant };
              Object.entries(sugerido).forEach(([id, v]) => {
                if (Number(v) > 0) nuevo[id] = String(Math.round(Number(v) * 100) / 100);
              });
              setCant(nuevo);
            }}
          >
            Usar cantidades sugeridas
          </button>
        </div>
        <p className="sub" style={{ margin: "8px 0 0", fontSize: 12 }}>
          El sugerido sale de las recetas por lo que se produjo hoy. Ajústalo si se usó de más o de menos.
        </p>""",
    1,
)

p.write_text(s, encoding="utf-8")
print("ok:", s != orig, "| sugerido:", "sugerido" in s)
