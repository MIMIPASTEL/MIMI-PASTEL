from pathlib import Path

p = Path("app/ventas/page.tsx")
s = p.read_text(encoding="utf-8")
orig = s

# 1. no sobrescribir promociones ni gasto cuando ya hay cierre guardado
viejo = """    const promoVendidas = ((vt.data ?? []) as any[]).reduce((a, x) => a + Number(x.promociones ?? 0), 0);
    setPromoGrupos(promoVendidas ? String(promoVendidas) : "");

    const totalGastos = ((mv.data ?? []) as any[]).reduce((a, x) => a + Number(x.monto), 0);
    setGasto(totalGastos ? String(totalGastos) : "");"""

nuevo = """    if (!cierre) {
      const promoVendidas = ((vt.data ?? []) as any[]).reduce((a, x) => a + Number(x.promociones ?? 0), 0);
      setPromoGrupos(promoVendidas ? String(promoVendidas) : "");

      const totalGastos = ((mv.data ?? []) as any[]).reduce((a, x) => a + Number(x.monto), 0);
      setGasto(totalGastos ? String(totalGastos) : "");
    }"""

if viejo not in s:
    raise SystemExit("no se encontro el bloque de promo/gasto")
s = s.replace(viejo, nuevo, 1)

# 2. gastos del turno (no de todo el dia)
s = s.replace(
    """        .from("movimientos_caja")
        .select("monto")
        .eq("fecha", fecha)
        .eq("punto_venta_id", puntoId)
        .eq("tipo", "salida"),""",
    """        .from("movimientos_caja")
        .select("monto")
        .eq("fecha", fecha)
        .eq("punto_venta_id", puntoId)
        .eq("turno", turno)
        .eq("tipo", "salida"),""",
    1,
)

# 3. cerrar el turno debe reemplazar el cierre anterior, no acumular
ancla = """    // 4. venta
    const vendidos = filas.filter((f) => vendido(f) > 0);"""
reemplazo = """    // se limpia el cierre anterior de este turno (si se vuelve a cerrar)
    await supabase.from("ventas").delete().eq("fecha", fecha).eq("punto_venta_id", puntoId).eq("turno", turno);

    // 4. venta
    const vendidos = filas.filter((f) => vendido(f) > 0);"""
if ancla not in s:
    raise SystemExit("no se encontro el bloque de venta")
s = s.replace(ancla, reemplazo, 1)

p.write_text(s, encoding="utf-8")
print("ok:", s != orig)
print("cierre respetado:", "if (!cierre) {\n      const promoVendidas" in s)
print("gasto por turno:", '.eq("turno", turno)\n        .eq("tipo", "salida")' in s)
