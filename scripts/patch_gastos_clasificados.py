from pathlib import Path

p = Path("app/ventas/page.tsx")
s = p.read_text(encoding="utf-8")
orig = s

GASTOS = [
    ("gasSalario", "setGasSalario", "Salario vendedora", "planilla"),
    ("gasChofer", "setGasChofer", "Chofer", "planilla"),
    ("gasBolsas", "setGasBolsas", "Bolsas", "gasto_negocio"),
    ("gasPasaje", "setGasPasaje", "Pasaje", "movilidad"),
    ("gasComidos", "setGasComidos", "Pasteles comidos", "otro_gasto"),
]

# 1. estados
estados = "".join(
    f'  const [{n}, {st}] = useState("");\n' for n, st, _, _ in GASTOS
)
s = s.replace(
    '  const [gasto, setGasto] = useState("");',
    '  const [gasto, setGasto] = useState("");\n' + estados,
    1,
)

# 2. total automatico
s = s.replace(
    '  const [gasto, setGasto] = useState("");',
    '  const [gasto, setGasto] = useState("");',
    1,
)
ancla_efecto = "  const descuentoPromo = useMemo(() => {"
efecto = (
    "  useEffect(() => {\n"
    "    const t =\n"
    + " + ".join(f'Number({n} || 0)' for n, _, _, _ in GASTOS)
    + ";\n"
    "    setGasto(t > 0 ? String(t) : \"\");\n"
    "  }, ["
    + ", ".join(n for n, _, _, _ in GASTOS)
    + "]);\n\n"
)
if ancla_efecto in s:
    s = s.replace(ancla_efecto, efecto + ancla_efecto, 1)

# 3. reemplazar el input unico por los cinco
ini = s.find('<label className="f">Gasto pagado del efectivo</label>')
if ini == -1:
    raise SystemExit("no se encontro el label de gasto")
fin = s.find("</div>", s.find("<input", ini))
fin = s.find("</div>", fin + 6)

campos = "".join(
    f'''          <div className="field">
            <label className="f">{etiqueta}</label>
            <input
              className="input num"
              type="number"
              min="0"
              step="0.1"
              value={{{n}}}
              onChange={{(e) => {{ setTocado(true); {st}(e.target.value); }}}}
              placeholder="0.00"
            />
          </div>
'''
    for n, st, etiqueta, _ in GASTOS
)

bloque = '<div className="grid grid-3">\n' + campos + "        </div>"

# el bloque original empieza en el div que contiene el label
ini_div = s.rfind('<div className="field">', 0, ini)
if ini_div == -1:
    raise SystemExit("no se encontro el div del gasto")
s = s[:ini_div] + bloque + s[fin + 6:]

# 4. movimientos clasificados al cerrar
viejo_insert = s[s.find("// 6. gasto pagado con el efectivo"):s.find("// 7.")]
if viejo_insert:
    nuevo_insert = (
        "    // 6. gastos clasificados del turno\n"
        f'    const conceptos = [{", ".join(chr(34) + e + chr(34) for _, _, e, _ in GASTOS)}];\n'
        "    await supabase\n"
        '      .from("movimientos_caja")\n'
        "      .delete()\n"
        '      .eq("fecha", fecha)\n'
        '      .eq("punto_venta_id", puntoId)\n'
        "      .in(\"concepto\", conceptos);\n\n"
        + "".join(
            f'''    if (Number({n} || 0) > 0) {{
      await supabase.from("movimientos_caja").insert({{
        fecha,
        punto_venta_id: puntoId,
        turno,
        tipo: "salida",
        categoria_codigo: "{cat}",
        medio: "efectivo",
        monto: Number({n}),
        concepto: "{etiqueta}",
      }});
    }}
'''
            for n, _, etiqueta, cat in GASTOS
        )
    )
    s = s.replace(viejo_insert, nuevo_insert, 1)

p.write_text(s, encoding="utf-8")
print("ok:", "Salario vendedora" in s, "| loop:", "conceptos" in s)
