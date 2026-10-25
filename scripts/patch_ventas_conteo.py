from pathlib import Path

p = Path("app/ventas/page.tsx")
s = p.read_text(encoding="utf-8")
orig = s

# quitar pasos duplicados del cierre y usar guardarConteo
ini = s.find("    // 1. despacho: confirmar lo contado")
fin = s.find("    // 4. venta", ini)
if ini == -1 or fin == -1:
    raise SystemExit("no se encontraron los pasos del cierre")

s = s[:ini] + "    const okConteo = await guardarConteo();\n    if (!okConteo) {\n      setGuardando(false);\n      return;\n    }\n\n" + s[fin:]

# boton de guardar conteo
viejo_boton = """        <button className="btn btn-primary btn-block" style={{ marginTop: 14 }} onClick={guardar} disabled={guardando}>
          {guardando ? "Guardando…" : "Cerrar turno"}
        </button>"""
nuevo_boton = """        <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
          <button className="btn" onClick={soloConteo} disabled={guardando}>
            Guardar conteo
          </button>
          <button className="btn btn-primary" onClick={guardar} disabled={guardando}>
            {guardando ? "Guardando…" : "Cerrar turno"}
          </button>
        </div>"""
if viejo_boton not in s:
    raise SystemExit("no se encontro el boton de cierre")
s = s.replace(viejo_boton, nuevo_boton, 1)

p.write_text(s, encoding="utf-8")
print("ok:", s != orig, "| cierre usa conteo:", "okConteo" in s, "| boton:", "Guardar conteo" in s)
