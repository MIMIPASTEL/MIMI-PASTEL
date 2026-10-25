from pathlib import Path

p = Path("app/cierre/page.tsx")
s = p.read_text(encoding="utf-8")
orig = s

# estado
if "sobrantesDia" not in s:
    s = s.replace(
        "  const [cargando, setCargando] = useState(true);",
        "  const [cargando, setCargando] = useState(true);\n  const [sobrantesDia, setSobrantesDia] = useState<any[]>([]);",
        1,
    )

# consulta
s = s.replace(
    """    const [pv, ci] = await Promise.all([
      supabase.from("puntos_venta").select("id, codigo, turno").eq("activo", true).order("orden"),
      supabase.from("v_cierre_turno").select("*").eq("fecha", fecha),
    ]);""",
    """    const [pv, ci, sb] = await Promise.all([
      supabase.from("puntos_venta").select("id, codigo, turno").eq("activo", true).order("orden"),
      supabase.from("v_cierre_turno").select("*").eq("fecha", fecha),
      supabase
        .from("sobrantes")
        .select("punto_venta_id, producto_id, cantidad, cantidad_reutilizable, creado_en")
        .eq("fecha", fecha),
    ]);""",
    1,
)
s = s.replace(
    "    setFilas((ci.data ?? []) as Fila[]);",
    "    setFilas((ci.data ?? []) as Fila[]);\n    setSobrantesDia((sb.data ?? []) as any[]);",
    1,
)

# tarjeta antes del cierre del fragmento
marca = "    </>\n  );\n}"
if marca not in s:
    raise SystemExit("no se encontro el cierre")

tarjeta = """      <div className="card">
        <h2>Sobrantes registrados · {fechaCorta(fecha)}</h2>
        <p className="sub" style={{ marginTop: -6 }}>
          Incluye la hora en que cada turno guardó sus sobrantes. Solo visible para administración.
        </p>

        {sobrantesDia.length === 0 ? (
          <p className="empty">Sin sobrantes registrados en esta fecha.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Hora</th>
                  <th>Punto</th>
                  <th>Producto</th>
                  <th className="num">Sobrante</th>
                  <th className="num">Reutilizable</th>
                </tr>
              </thead>
              <tbody>
                {sobrantesDia
                  .slice()
                  .sort((a, b) => String(a.creado_en).localeCompare(String(b.creado_en)))
                  .map((s2, i) => (
                    <tr key={i}>
                      <td>
                        {s2.creado_en
                          ? new Date(s2.creado_en).toLocaleTimeString("es-PE", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </td>
                      <td>{nombre(s2.punto_venta_id)}</td>
                      <td>{productoNombre(s2.producto_id)}</td>
                      <td className="num">{numero(s2.cantidad)}</td>
                      <td className="num">
                        {s2.cantidad_reutilizable === null ? "" : numero(s2.cantidad_reutilizable)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </>
  );
}"""

s = s.replace(marca, tarjeta, 1)

p.write_text(s, encoding="utf-8")
print("ok:", s != orig, "| sobrantes:", "sobrantesDia" in s)
