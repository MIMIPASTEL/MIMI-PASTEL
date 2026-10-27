from pathlib import Path

p = Path("components/InsumosProduccion.tsx")
s = p.read_text(encoding="utf-8")
orig = s

# 1. perfil y total por operador
if "usePerfil" not in s:
    s = s.replace(
        'import { supabase',
        'import { usePerfil } from "@/components/Shell";\nimport { supabase',
        1,
    )
    s = s.replace(
        "export default function InsumosProduccion",
        "export default function InsumosProduccion",
        1,
    )

# 2. traer operador
s = s.replace(
    'const [guardando, setGuardando] = useState(false);',
    'const [guardando, setGuardando] = useState(false);\n  const [totalOperadores, setTotalOperadores] = useState<Record<string, number>>({});\n  const perfil = usePerfil();',
    1,
)

# 3. consulta con operador
s = s.replace(
    'supabase.from("consumos_dia").select("insumo_id, cantidad").eq("fecha", fecha),',
    'supabase.from("consumos_dia").select("insumo_id, cantidad, operador_id").eq("fecha", fecha),',
    1,
)

# 4. separar lo mio y el total
viejo = """    const m: Record<string, string> = {};
    (con.data ?? []).forEach((c: any) => {
      m[c.insumo_id] = String(Number(c.cantidad));
    });
    setCant(m);"""
nuevo = """    const m: Record<string, string> = {};
    const tot: Record<string, number> = {};
    (con.data ?? []).forEach((c: any) => {
      tot[c.insumo_id] = (tot[c.insumo_id] ?? 0) + Number(c.cantidad);
      if (perfil?.id && c.operador_id === perfil.id) {
        m[c.insumo_id] = String(Number(c.cantidad));
      }
    });
    setCant(m);
    setTotalOperadores(tot);"""
if viejo not in s:
    raise SystemExit("no se encontro el mapeo de consumos")
s = s.replace(viejo, nuevo, 1)
s = s.replace("  }, [fecha]);", "  }, [fecha, perfil?.id]);", 1)

# 5. guardar con operador
s = s.replace(
    """      .map((i) => ({
        fecha,
        insumo_id: i.id,
        cantidad: Number(cant[i.id]),
        costo_unitario: Number(i.precio_unitario ?? 0),
      }));""",
    """      .map((i) => ({
        fecha,
        insumo_id: i.id,
        operador_id: perfil?.id ?? null,
        cantidad: Number(cant[i.id]),
        costo_unitario: Number(i.precio_unitario ?? 0),
      }));""",
    1,
)
s = s.replace(
    '.upsert(filas, { onConflict: "fecha,insumo_id" });',
    '.upsert(filas, { onConflict: "fecha,insumo_id,operador_id" });',
    1,
)

p.write_text(s, encoding="utf-8")
print("componente:", "operador_id" in s, "| perfil:", "usePerfil" in s)
