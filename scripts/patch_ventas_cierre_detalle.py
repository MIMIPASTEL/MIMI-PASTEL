from pathlib import Path

p = Path("app/ventas/page.tsx")
s = p.read_text(encoding="utf-8")
orig = s

# ---------- 1. al cargar, priorizar el cierre guardado ----------
viejo = """    const porMedio: Record<string, number> = {};"""
nuevo = """    // si ya hay un cierre guardado para este turno, se usa tal cual
    const { data: cierre } = await supabase
      .from("cuadres")
      .select("efectivo, yape, transferencia, gasto, promociones, descuento")
      .eq("fecha", fecha)
      .eq("punto_venta_id", puntoId)
      .eq("turno", turno)
      .maybeSingle();

    if (cierre) {
      setEfectivo(Number(cierre.efectivo) ? String(cierre.efectivo) : "");
      setYape(Number(cierre.yape) ? String(cierre.yape) : "");
      setTransferencia(Number(cierre.transferencia) ? String(cierre.transferencia) : "");
      setGasto(Number(cierre.gasto) ? String(cierre.gasto) : "");
      setPromoGrupos(Number(cierre.promociones) ? String(cierre.promociones) : "");
    }

    const porMedio: Record<string, number> = {};"""
if viejo not in s:
    raise SystemExit("no se encontro porMedio")
s = s.replace(viejo, nuevo, 1)

# solo usar pagos cuando no hay cierre guardado
s = s.replace(
    """    setEfectivo(porMedio["efectivo"] ? String(porMedio["efectivo"]) : "");
    setYape(porMedio["yape"] ? String(porMedio["yape"]) : "");
    setTransferencia(porMedio["transferencia"] ? String(porMedio["transferencia"]) : "");""",
    """    if (!cierre) {
      setEfectivo(porMedio["efectivo"] ? String(porMedio["efectivo"]) : "");
      setYape(porMedio["yape"] ? String(porMedio["yape"]) : "");
      setTransferencia(porMedio["transferencia"] ? String(porMedio["transferencia"]) : "");
    }""",
    1,
)

# ---------- 2. guardar el detalle en el cierre ----------
viejo_upsert = """        dinero_esperado: ventaNeta,
        dinero_contado: cobrado,"""
nuevo_upsert = """        dinero_esperado: ventaNeta,
        dinero_contado: cobrado,
        efectivo: Number(efectivo || 0),
        yape: Number(yape || 0),
        transferencia: Number(transferencia || 0),
        gasto: Number(gasto || 0),
        promociones: Number(promoGrupos || 0),
        descuento: descuentoPromo,"""
if viejo_upsert not in s:
    raise SystemExit("no se encontro el upsert de cuadres")
s = s.replace(viejo_upsert, nuevo_upsert, 1)

p.write_text(s, encoding="utf-8")
print("ok:", s != orig, "| cierre:", "cierre.efectivo" in s, "| guarda detalle:", "efectivo: Number(efectivo" in s)
