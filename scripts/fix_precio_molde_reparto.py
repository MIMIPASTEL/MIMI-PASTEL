from pathlib import Path

p = Path("app/repartos/page.tsx")
s = p.read_text(encoding="utf-8")
orig = s

# 1. traer tambien el nombre y default de la presentacion
s = s.replace(
    '.select("producto_id, precio, tipo_cliente, presentaciones!inner(nombre)"),',
    '.select("producto_id, precio, tipo_cliente, presentaciones!inner(nombre, es_default)"),',
    1,
)

# 2. precio: unidad si existe, si no la presentacion por defecto
viejo = """      const precios: Record<string, number> = {};
      ((pc.data ?? []) as any[]).forEach((x) => {
        if (x.presentaciones?.nombre === "Unidad" && x.tipo_cliente === "distribuidor") {
          precios[x.producto_id] = Number(x.precio);
        }
      });"""

nuevo = """      const unidad: Record<string, number> = {};
      const otro: Record<string, number> = {};
      ((pc.data ?? []) as any[]).forEach((x) => {
        if (x.tipo_cliente !== "distribuidor") return;
        if (x.presentaciones?.nombre === "Unidad") {
          unidad[x.producto_id] = Number(x.precio);
        } else {
          const actual = otro[x.producto_id];
          const valor = Number(x.precio);
          if (actual === undefined || valor > actual) otro[x.producto_id] = valor;
        }
      });
      const precios: Record<string, number> = { ...otro, ...unidad };"""

if viejo not in s:
    raise SystemExit("no se encontro el bloque de precios")
s = s.replace(viejo, nuevo, 1)

s = s.replace('precio: String(precios[p.id] ?? 1.6667),', 'precio: String(precios[p.id] ?? 1.6667),', 1)

p.write_text(s, encoding="utf-8")
print("ok:", "unidad" in s and "otro" in s)
