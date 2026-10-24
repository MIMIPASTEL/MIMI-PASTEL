"""Mostrar solo los clientes con datos, ordenados."""
from pathlib import Path

p = Path("app/programacion/page.tsx")
s = p.read_text(encoding="utf-8")

# estado
if "baseVisibles" not in s:
    s = s.replace(
        '  const [listo, setListo] = useState(false);',
        '  const [listo, setListo] = useState(false);\n  const [baseVisibles, setBaseVisibles] = useState<Set<string>>(new Set());',
        1,
    )

# guardar los que venian de la base
if "setBaseVisibles(" not in s:
    s = s.replace(
        "    setSnapshot(JSON.stringify(m));\n    setListo(true);",
        '    setBaseVisibles(new Set(Object.keys(m).map((k) => k.split("|")[0]).filter(Boolean)));\n    setSnapshot(JSON.stringify(m));\n    setListo(true);',
        1,
    )

ini = s.index("  // Fijos: siempre. Eventuales")
fin = s.index("  }, [puntos, verEventuales, omitidos, celdas]);", ini) + len("  }, [puntos, verEventuales, omitidos, celdas]);")

nuevo = '''  // Solo se muestran los clientes que tienen algo llenado. Los pedidos van
  // como fila aparte (🎂). Si el día está vacío, se muestran los fijos para
  // poder programar desde cero.
  const visibles = useMemo(() => {
    const conValor = new Set(
      Object.entries(celdas)
        .filter(([, v]) => Number(v) > 0)
        .map(([k]) => k.split("|")[0])
        .filter(Boolean),
    );
    const activos = puntos.filter((p) => !omitidos.has(p.id));
    if (verEventuales) return activos;

    const conDatos = activos.filter((p) => baseVisibles.has(p.id) || conValor.has(p.id));
    if (conDatos.length === 0) return activos.filter((p) => p.es_fijo);
    return conDatos;
  }, [puntos, verEventuales, omitidos, baseVisibles, celdas]);'''

s = s[:ini] + nuevo + s[fin:]

s = s.replace("Ver todos los eventuales (", "Ver todos los clientes (", 1)

p.write_text(s, encoding="utf-8")
print("ok | baseVisibles:", "baseVisibles" in s, "| conDatos:", "conDatos" in s)
