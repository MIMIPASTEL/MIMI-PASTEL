from pathlib import Path

p = Path("app/ventas/page.tsx")
s = p.read_text(encoding="utf-8")
orig = s

# ---------- 1. descuento de promociones: X grupos = X soles ----------
viejo_desc = """  const descuentoPromo = useMemo(() => {
    const grupos = Number(promoGrupos || 0);
    if (!promo || grupos === 0 || totalVendido === 0) return 0;
    const promedio = ventaBruta / totalVendido;
    const porGrupo = Number(promo.cantidad) * promedio - Number(promo.precio);
    return Math.max(0, grupos * Math.max(0, porGrupo));
  }, [promo, promoGrupos, ventaBruta, totalVendido]);"""

nuevo_desc = """  // Cada grupo promocional cuesta lo mismo que su descuento:
  // 3 por S/ 5 con pastel a S/ 2 = S/ 1 de descuento por grupo.
  const PRECIO_BASE = 2;
  const descuentoPromo = useMemo(() => {
    const grupos = Number(promoGrupos || 0);
    if (!promo || grupos === 0) return 0;
    const porGrupo = Number(promo.cantidad) * PRECIO_BASE - Number(promo.precio);
    return Math.max(0, grupos * Math.max(0, porGrupo));
  }, [promo, promoGrupos]);"""

if viejo_desc not in s:
    raise SystemExit("no se encontro descuentoPromo")
s = s.replace(viejo_desc, nuevo_desc, 1)

# ---------- 2. precargar el cierre de caja guardado ----------
viejo_load = """    setFilas(
      productos.map((p) => ({"""
nuevo_load = """    // cierre de caja ya guardado de este turno
    const [pg, vt, mv] = await Promise.all([
      supabase.from("pagos").select("medio, monto").eq("fecha", fecha).eq("punto_venta_id", puntoId),
      supabase
        .from("ventas")
        .select("promociones, descuento")
        .eq("fecha", fecha)
        .eq("punto_venta_id", puntoId)
        .eq("turno", turno),
      supabase
        .from("movimientos_caja")
        .select("monto")
        .eq("fecha", fecha)
        .eq("punto_venta_id", puntoId)
        .eq("tipo", "salida"),
    ]);

    const porMedio: Record<string, number> = {};
    ((pg.data ?? []) as any[]).forEach((x) => {
      porMedio[x.medio] = (porMedio[x.medio] ?? 0) + Number(x.monto);
    });
    setEfectivo(porMedio["efectivo"] ? String(porMedio["efectivo"]) : "");
    setYape(porMedio["yape"] ? String(porMedio["yape"]) : "");
    setTransferencia(porMedio["transferencia"] ? String(porMedio["transferencia"]) : "");

    const promoVendidas = ((vt.data ?? []) as any[]).reduce((a, x) => a + Number(x.promociones ?? 0), 0);
    setPromoGrupos(promoVendidas ? String(promoVendidas) : "");

    const totalGastos = ((mv.data ?? []) as any[]).reduce((a, x) => a + Number(x.monto), 0);
    setGasto(totalGastos ? String(totalGastos) : "");

    setFilas(
      productos.map((p) => ({"""
if viejo_load not in s:
    raise SystemExit("no se encontro el setFilas de carga")
s = s.replace(viejo_load, nuevo_load, 1)

# ---------- 3. KPI de venta neta ----------
viejo_kpi = """        <div className="grid grid-4" style={{ marginTop: 4 }}>
          <div className="kpi">
            <div className="label">Venta bruta</div>
            <div className="value" style={{ fontSize: 17 }}>{soles(ventaBruta)}</div>
          </div>
          <div className="kpi">
            <div className="label">Promociones</div>
            <div className="value" style={{ fontSize: 17 }}>−{soles(descuentoPromo)}</div>
          </div>
          <div className="kpi">
            <div className="label">Cobrado</div>
            <div className="value" style={{ fontSize: 17 }}>{soles(cobrado)}</div>
          </div>
          <div className="kpi accent">
            <div className="label">Diferencia</div>
            <div
              className="value"
              style={{ fontSize: 17, color: Math.abs(diferenciaDinero) < 0.01 ? "var(--ok)" : "var(--danger)" }}
            >
              {soles(diferenciaDinero)}
            </div>
            <div className="hint">cobrado − venta neta {soles(ventaNeta)}</div>
          </div>
        </div>"""

nuevo_kpi = """        <div className="grid grid-4" style={{ marginTop: 4 }}>
          <div className="kpi">
            <div className="label">Venta bruta</div>
            <div className="value" style={{ fontSize: 17 }}>{soles(ventaBruta)}</div>
          </div>
          <div className="kpi">
            <div className="label">Promociones</div>
            <div className="value" style={{ fontSize: 17 }}>−{soles(descuentoPromo)}</div>
            <div className="hint">{promoGrupos || 0} grupo(s)</div>
          </div>
          <div className="kpi">
            <div className="label">Venta neta</div>
            <div className="value" style={{ fontSize: 17 }}>{soles(ventaNeta)}</div>
          </div>
          <div className="kpi accent">
            <div className="label">Diferencia</div>
            <div
              className="value"
              style={{ fontSize: 17, color: Math.abs(diferenciaDinero) < 0.01 ? "var(--ok)" : "var(--danger)" }}
            >
              {soles(diferenciaDinero)}
            </div>
            <div className="hint">cobrado {soles(cobrado)}</div>
          </div>
        </div>"""
if viejo_kpi not in s:
    raise SystemExit("no se encontro el bloque de KPIs")
s = s.replace(viejo_kpi, nuevo_kpi, 1)

p.write_text(s, encoding="utf-8")
print("ok:", s != orig, "| desc:", "PRECIO_BASE" in s, "| precarga:", "porMedio" in s)
