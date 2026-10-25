from pathlib import Path

p = Path("app/ventas/page.tsx")
s = p.read_text(encoding="utf-8")
orig = s

# 1. precio por defecto S/ 2
s = s.replace(
    '        precio: precioMap[p.id] ? String(precioMap[p.id]) : "",',
    '        precio: precioMap[p.id] ? String(precioMap[p.id]) : "2",',
    1,
)

# 2. clic en Disponible copia el valor a Contado
viejo_disp = """                      <td className="num">{disponible(f) || ""}</td>"""
nuevo_disp = """                      <td
                        className="num"
                        onClick={() => setCampo(i, "contado", String(disponible(f)))}
                        title="Toca para copiar en Contado"
                        style={{ cursor: "pointer", color: "var(--accent)", fontWeight: 600 }}
                      >
                        {disponible(f) || ""}
                      </td>"""
if viejo_disp not in s:
    raise SystemExit("no se encontro la celda disponible")
s = s.replace(viejo_disp, nuevo_disp, 1)

# 3. boton copiar todo + guardar conteo dentro de la tarjeta de conteo
viejo_head = """        <div className="row" style={{ marginBottom: 8, padding: "0 4px" }}>
          <h2 style={{ margin: 0 }}>Conteo del turno</h2>
          <span className="sub" style={{ margin: 0, fontSize: 12 }}>
            Inicial + enviado = disponible
          </span>
        </div>"""
nuevo_head = """        <div className="row" style={{ marginBottom: 8, padding: "0 4px" }}>
          <h2 style={{ margin: 0 }}>Conteo del turno</h2>
          <button
            className="btn btn-sm"
            type="button"
            onClick={() => setFilas((fs) => fs.map((f) => ({ ...f, contado: String(disponible(f)) })))}
          >
            Copiar disponible a todos
          </button>
        </div>"""
if viejo_head not in s:
    raise SystemExit("no se encontro la cabecera del conteo")
s = s.replace(viejo_head, nuevo_head, 1)

# 4. quitar la tabla de precios por producto
ini = s.find('<h2>Precios y dinero</h2>')
if ini == -1:
    raise SystemExit("no se encontro precios y dinero")
fin_marca = '        <div className="grid grid-3" style={{ marginTop: 12 }}>'
fin = s.find(fin_marca, ini)
if fin == -1:
    raise SystemExit("no se encontro el bloque de dinero")

s = s[:ini] + "<h2>Cierre de caja</h2>\n\n" + s[fin:]

# 5. mover "Guardar conteo" al bloque de conteo y dejar solo cerrar turno
viejo_botones = """        <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
          <button className="btn" onClick={soloConteo} disabled={guardando}>
            Guardar conteo
          </button>
          <button className="btn btn-primary" onClick={guardar} disabled={guardando}>
            {guardando ? "Guardando…" : "Cerrar turno"}
          </button>
        </div>"""
nuevo_botones = """        <button className="btn btn-primary btn-block" style={{ marginTop: 14 }} onClick={guardar} disabled={guardando}>
          {guardando ? "Guardando…" : "Cerrar turno"}
        </button>"""
if viejo_botones not in s:
    raise SystemExit("no se encontraron los botones")
s = s.replace(viejo_botones, nuevo_botones, 1)

# boton guardar conteo al final de la tarjeta de conteo
ancla_fin_conteo = """          </div>
        )}
      </div>

      <div className="card">"""
nuevo_fin_conteo = """          </div>
        )}

        <div style={{ marginTop: 10 }}>
          <button className="btn" onClick={soloConteo} disabled={guardando}>
            {guardando ? "Guardando…" : "Guardar conteo"}
          </button>
        </div>
      </div>

      <div className="card">"""
if ancla_fin_conteo not in s:
    raise SystemExit("no se encontro el cierre del conteo")
s = s.replace(ancla_fin_conteo, nuevo_fin_conteo, 1)

p.write_text(s, encoding="utf-8")
print("ok:", s != orig)
print("precio 2:", '"2")' in s, "| copiar:", "Copiar disponible" in s, "| conteo btn:", "Guardar conteo" in s)
