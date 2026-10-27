from pathlib import Path

p = Path("app/ventas/page.tsx")
s = p.read_text(encoding="utf-8")
orig = s

# 1. perfil
if "usePerfil" not in s:
    s = s.replace(
        'import { supabase, hoyISO, soles, numero, fechaCorta } from "@/lib/supabase";',
        'import { usePerfil } from "@/components/Shell";\nimport { supabase, hoyISO, soles, numero, fechaCorta } from "@/lib/supabase";',
        1,
    )

s = s.replace(
    '  const [vendedoras, setVendedoras] = useState<any[]>([]);',
    '  const [vendedoras, setVendedoras] = useState<any[]>([]);\n  const [cierreAprobado, setCierreAprobado] = useState(false);\n  const perfil = usePerfil();\n  const esAdmin = perfil?.rol === "admin";',
    1,
)

# 2. detectar cierre aprobado al cargar
s = s.replace(
    "    setFilas(\n      productos.map((p) => ({",
    "    const { count: aprobados } = await supabase\n"
    '      .from("movimientos_caja")\n'
    '      .select("id", { count: "exact", head: true })\n'
    "      .eq(\"referencia\", `turno:${fecha}:${puntoId}:${turno}`)\n"
    '      .eq("aprobado", true);\n'
    "    setCierreAprobado((aprobados ?? 0) > 0);\n\n"
    "    setFilas(\n      productos.map((p) => ({",
    1,
)

# 3. bloquear guardado para no-admin
ancla = "  async function guardarConteo("
bloque = """  const sinPermiso = cierreAprobado && !esAdmin;

""" + ancla
s = s.replace(ancla, bloque, 1)

s = s.replace('disabled={guardando}', 'disabled={guardando || sinPermiso}')
s = s.replace('disabled={guardando || sinPermiso}>\n            {guardando ? "Guardando…" : "Guardar conteo"}',
              'disabled={guardando || sinPermiso}>\n            {guardando ? "Guardando…" : "Guardar conteo"}')

p.write_text(s, encoding="utf-8")
print("ok:", "sinPermiso" in s, "| perfil:", "usePerfil" in s, "| count:", "cierreAprobado" in s)
