from pathlib import Path

p = Path("app/ventas/page.tsx")
s = p.read_text(encoding="utf-8")
orig = s

# la venta del turno: solo la mas reciente (evita sumar duplicados antiguos)
s = s.replace(
    """      supabase
        .from("ventas")
        .select("promociones, descuento")
        .eq("fecha", fecha)
        .eq("punto_venta_id", puntoId)
        .eq("turno", turno),""",
    """      supabase
        .from("ventas")
        .select("promociones, descuento")
        .eq("fecha", fecha)
        .eq("punto_venta_id", puntoId)
        .eq("turno", turno)
        .order("creado_en", { ascending: false })
        .limit(1),""",
    1,
)

# usar la primera fila, no la suma
s = s.replace(
    "      const promoVendidas = ((vt.data ?? []) as any[]).reduce((a, x) => a + Number(x.promociones ?? 0), 0);",
    "      const promoVendidas = Number(((vt.data ?? []) as any[])[0]?.promociones ?? 0);",
    1,
)

p.write_text(s, encoding="utf-8")
print("ok:", s != orig, "| limit 1:", ".limit(1)," in s)
