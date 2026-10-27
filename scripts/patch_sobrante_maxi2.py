from pathlib import Path

p = Path("components/SobrantesRevision.tsx")
s = p.read_text(encoding="utf-8")
orig = s

# solo los sobrantes del ultimo punto del dia (MAXI 2)
s = s.replace(
    'const [sob, prods] = await Promise.all([',
    'const [sob, prods, pts] = await Promise.all([',
    1,
)
s = s.replace(
    '      supabase.from("productos").select("id, dias_vida"),\n    ]);',
    '      supabase.from("productos").select("id, dias_vida"),\n'
    '      supabase.from("puntos_venta").select("id, codigo, turno, tipo").eq("tipo", "maxiahorro"),\n'
    "    ]);",
    1,
)

# calcular el punto final (turno mayor) y filtrar
s = s.replace(
    '    const vida: Record<string, number> = {};',
    '    const listaPuntos = ((pts.data ?? []) as any[]).filter((x) => x.tipo === "maxiahorro");\n'
    '    const maxTurno = listaPuntos.reduce((a, x) => Math.max(a, Number(x.turno ?? 0)), 0);\n'
    '    const ultimoPunto = listaPuntos.find((x) => Number(x.turno ?? 0) === maxTurno)?.id ?? null;\n\n'
    '    const soloUltimo = ((sob.data ?? []) as any[]).filter(\n'
    '      (x) => !ultimoPunto || x.punto_venta_id === ultimoPunto,\n'
    "    );\n\n"
    '    const vida: Record<string, number> = {};',
    1,
)
s = s.replace(
    '      ((sob.data ?? []) as any[]).map((s) => {',
    '      soloUltimo.map((s) => {',
    1,
)

p.write_text(s, encoding="utf-8")
print("ok:", "soloUltimo" in s and "maxTurno" in s)
