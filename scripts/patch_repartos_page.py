from pathlib import Path

# ---------- repartos: Shell + cambio de lista de precios ----------
p = Path("app/repartos/page.tsx")
s = p.read_text(encoding="utf-8")

if "Shell" not in s:
    s = s.replace(
        'import { supabase, soles, hoyISO } from "@/lib/supabase";',
        'import Shell from "@/components/Shell";\nimport { supabase, soles, hoyISO } from "@/lib/supabase";',
        1,
    )
    s = s.replace("  return (\n    <>", "  return (\n    <Shell>\n    <>", 1)
    s = s.replace("    </>\n  );\n}", "    </>\n    </Shell>\n  );\n}", 1)

# mapa de precios por tipo
s = s.replace(
    "  const [saldos, setSaldos] = useState<any[]>([]);",
    "  const [saldos, setSaldos] = useState<any[]>([]);\n  const [preciosMap, setPreciosMap] = useState<Record<string, any>>({});",
    1,
)

s = s.replace(
    """    const precios: Record<string, number> = {};
    ((pc.data ?? []) as any[]).forEach((x) => {
      if (x.presentaciones?.nombre === "Unidad" && x.tipo_cliente === "directo") {
        precios[x.producto_id] = Number(x.precio);
      }
    });""",
    """    const precios: Record<string, any> = {};
    ((pc.data ?? []) as any[]).forEach((x) => {
      if (x.presentaciones?.nombre !== "Unidad") return;
      precios[x.producto_id] = precios[x.producto_id] ?? {};
      precios[x.producto_id][x.tipo_cliente] = Number(x.precio);
    });
    setPreciosMap(precios);""",
    1,
)

s = s.replace(
    '        precio: precios[p.id] ? String(precios[p.id]) : "2",',
    '        precio: precios[p.id]?.[tipoPrecio] ? String(precios[p.id][tipoPrecio]) : "2",',
    1,
)

# al cambiar la lista, recalcular precios
s = s.replace(
    "  const set = (i: number, campo: keyof Fila, v: string) =>",
    """  useEffect(() => {
    setFilas((fs) =>
      fs.map((f) => {
        const pr = preciosMap[f.producto_id]?.[tipoPrecio];
        return pr !== undefined ? { ...f, precio: String(pr) } : f;
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipoPrecio, preciosMap]);

  const set = (i: number, campo: keyof Fila, v: string) =>""",
    1,
)

p.write_text(s, encoding="utf-8")
print("repartos:", "Shell" in s, "| precios:", "preciosMap" in s)

# ---------- menu ----------
q = Path("components/Shell.tsx")
t = q.read_text(encoding="utf-8")
if '"/repartos"' not in t:
    t = t.replace(
        '{ href: "/ventas", label: "Ventas", ico: "\U0001F9FE", roles: ["admin", "ventas"] },',
        '{ href: "/ventas", label: "Ventas", ico: "\U0001F9FE", roles: ["admin", "ventas"] },\n  { href: "/repartos", label: "Repartos", ico: "\U0001F6F5", roles: ["admin", "ventas"] },',
        1,
    )
    q.write_text(t, encoding="utf-8")
print("menu:", '"/repartos"' in t)
