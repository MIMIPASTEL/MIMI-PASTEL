from pathlib import Path

p = Path("app/ventas/page.tsx")
s = p.read_text(encoding="utf-8")
orig = s

# la promo necesita saber que productos participan
s = s.replace(
    '.select("id, nombre, cantidad, precio")',
    '.select("id, nombre, cantidad, precio, promocion_productos(producto_id)")',
    1,
)

viejo = """  // Cada grupo promocional cuesta lo mismo que su descuento:
  // 3 por S/ 5 con pastel a S/ 2 = S/ 1 de descuento por grupo.
  const PRECIO_BASE = 2;
  const descuentoPromo = useMemo(() => {
    const grupos = Number(promoGrupos || 0);
    if (!promo || grupos === 0 || ventaBruta <= 0) return 0;
    const porGrupo = Number(promo.cantidad) * PRECIO_BASE - Number(promo.precio);
    return Math.max(0, grupos * Math.max(0, porGrupo));
  }, [promo, promoGrupos, ventaBruta]);"""

nuevo = """  // Descuento de promociones: usa el precio real de los productos que participan
  const descuentoPromo = useMemo(() => {
    const grupos = Number(promoGrupos || 0);
    if (!promo || grupos === 0 || ventaBruta <= 0) return 0;

    const ids = new Set(((promo.promocion_productos ?? []) as any[]).map((x) => x.producto_id));
    let unidades = 0;
    let valor = 0;
    filas.forEach((f) => {
      if (ids.size > 0 && !ids.has(f.producto_id)) return;
      const c = vendido(f);
      unidades += c;
      valor += c * de(f, "precio");
    });
    if (unidades === 0) return 0;

    const promedio = valor / unidades;
    const porGrupo = Number(promo.cantidad) * promedio - Number(promo.precio);
    return Math.max(0, grupos * Math.max(0, porGrupo));
  }, [promo, promoGrupos, ventaBruta, filas]);"""

if viejo not in s:
    raise SystemExit("no se encontro descuentoPromo")
s = s.replace(viejo, nuevo, 1)

p.write_text(s, encoding="utf-8")
print("ok:", s != orig, "| promo productos:", "promocion_productos" in s)
