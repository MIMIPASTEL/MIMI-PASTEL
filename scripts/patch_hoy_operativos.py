from pathlib import Path

p = Path("app/hoy/page.tsx")
s = p.read_text(encoding="utf-8")
orig = s

if "gastosOper" in s:
    raise SystemExit("ya estaba aplicado")

# estado
s = s.replace(
    "  const [costos, setCostos] = useState<any>(null);",
    "  const [costos, setCostos] = useState<any>(null);\n  const [gastosOper, setGastosOper] = useState(0);",
    1,
)

# consulta de parametros
s = s.replace(
    "        supabase.from(\"v_costos_dia\").select(\"*\").eq(\"fecha\", hoy).maybeSingle(),",
    "        supabase.from(\"v_costos_dia\").select(\"*\").eq(\"fecha\", hoy).maybeSingle(),\n"
    "        supabase.from(\"parametros_costeo\").select(\"ventas_dia, chofer_dia\").eq(\"id\", 1).maybeSingle(),",
    1,
)
s = s.replace(
    "      const [u, c, q, pe, mv, co] = await Promise.all([",
    "      const [u, c, q, pe, mv, co, pc] = await Promise.all([",
    1,
)
s = s.replace(
    "      setCostos(co.data ?? null);",
    "      setCostos(co.data ?? null);\n"
    "      setGastosOper(Number(pc.data?.ventas_dia ?? 0) + Number(pc.data?.chofer_dia ?? 0));",
    1,
)

# utilidad neta
s = s.replace(
    "  const util = Number(utilidad?.utilidad ?? 0);",
    "  const util = Number(utilidad?.utilidad ?? 0) - gastosOper;",
    1,
)

p.write_text(s, encoding="utf-8")
print("hoy:", s != orig, "| gastosOper:", "gastosOper" in s)
