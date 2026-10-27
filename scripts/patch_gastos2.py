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
s = s.replace(
    '  const [gasto, setGasto] = useState("");',
    '  const [gasto, setGasto] = useState("");\n'
    + "".join(f'  const [{n}, {st}] = useState("");\n' for n, st, _, _ in GASTOS),
    1,
)

# 2. total automatico
ancla = "  const descuentoPromo = useMemo(() => {"
efecto = (
    "  useEffect(() => {\n"
    "    const t = " + " + ".join(f'Number({n} || 0)' for n, _, _, _ in GASTOS) + ";\n"
    '    setGasto(t > 0 ? String(t) : "");\n'
    "  }, [" + ", ".join(n for n, _, _, _ in GASTOS) + "]);\n\n"
)
s = s.replace(ancla, efecto + ancla, 1)

# 3. cinco campos en lugar del input unico
viejo_campo = '''          <div className="field">
            <label className="f">Gasto pagado del efectivo</label>
            <input className="input num" type="number" min="0" step="0.1" value={gasto} onChange={(e) => { setTocado(true); setGasto(e.target.value); }} placeholder="0.00" />
          </div>'''

nuevo_campo = ""
for n, st, etiqueta, _ in GASTOS:
    nuevo_campo += (
        '          <div className="field">\n'
        f'            <label className="f">{etiqueta}</label>\n'
        '            <input className="input num" type="number" min="0" step="0.1" '
        f'value={{{n}}} onChange={{(e) => {{ setTocado(true); {st}(e.target.value); }}}} placeholder="0.00" />\n'
        "          </div>\n"
    )

if viejo_campo not in s:
    raise SystemExit("no se encontro el campo de gasto")
s = s.replace(viejo_campo, nuevo_campo.rstrip("\n"), 1)

# 4. movimientos clasificados
viejo_insert = '''    // 6. gasto pagado con el efectivo
    if (Number(gasto || 0) > 0) {
      await supabase.from("movimientos_caja").insert({
        fecha,
        tipo: "salida",
        categoria_codigo: "movilidad",
        monto: Number(gasto),
        medio: "efectivo",
        turno,
        concepto: "Gasto pagado del efectivo",
        punto_venta_id: puntoId,
        creado_por: perfil?.id,
      });
    }'''

nuevo_insert = (
    '    // 6. gastos clasificados del turno\n'
    '    const conceptosGasto = [' + ", ".join(f'"{e}"' for _, _, e, _ in GASTOS) + '];\n'
    '    await supabase\n'
    '      .from("movimientos_caja")\n'
    '      .delete()\n'
    '      .eq("fecha", fecha)\n'
    '      .eq("punto_venta_id", puntoId)\n'
    '      .in("concepto", conceptosGasto);\n\n'
)
for n, _, etiqueta, cat in GASTOS:
    nuevo_insert += (
        f'    if (Number({n} || 0) > 0) {{\n'
        '      await supabase.from("movimientos_caja").insert({\n'
        "        fecha,\n"
        f'        categoria_codigo: "{cat}",\n'
        f'        monto: Number({n}),\n'
        '        medio: "efectivo",\n'
        "        turno,\n"
        f'        concepto: "{etiqueta}",\n'
        "        punto_venta_id: puntoId,\n"
        "        creado_por: perfil?.id,\n"
        '        tipo: "salida",\n'
        "      });\n"
        "    }\n"
    )

if viejo_insert not in s:
    raise SystemExit("no se encontro el insert de gasto")
s = s.replace(viejo_insert, nuevo_insert.rstrip("\n"), 1)

p.write_text(s, encoding="utf-8")
print("ok:", "Salario vendedora" in s, "| estados:", s.count("useState(\"\")"), "| lineas:", len(s.splitlines()))
