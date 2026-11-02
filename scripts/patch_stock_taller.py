from pathlib import Path

p = Path("components/ProduccionDia.tsx")
s = p.read_text(encoding="utf-8") 
orig = s

# estado
s = s.replace(
    "  const [enviado, setEnviado] = useState<Record<string, number>>({});",
    "  const [enviado, setEnviado] = useState<Record<string, number>>({});\n  const [salidas, setSalidas] = useState<Record<string, number>>({});",
    1,
)

# cargar ventas de taller y muestras
s = s.replace(
    '      supabase.from("despachos").select("punto_venta_id, turno, puntos_venta(tipo), despacho_items(producto_id, cantidad_enviada)").eq("fecha", fecha),',
    '      supabase.from("despachos").select("punto_venta_id, turno, puntos_venta(tipo), despacho_items(producto_id, cantidad_enviada)").eq("fecha", fecha),\n'
    '      supabase.from("ventas").select("venta_items(producto_id, cantidad), puntos_venta!inner(codigo)").eq("fecha", fecha).eq("puntos_venta.codigo", "TALLER"),\n'
    '      supabase.from("mermas").select("producto_id, cantidad").eq("fecha", fecha).eq("tipo", "muestra"),',
    1,
)
s = s.replace(
    "    const [lot, mer, des] = await Promise.all([",
    "    const [lot, mer, des, vta, mue] = await Promise.all([",
    1,
)

s = s.replace(
    "    setEnviado(e);\n    setCargando(false);",
    """    setEnviado(e);

    const sa: Record<string, number> = {};
    ((vta.data ?? []) as any[]).forEach((v: any) => {
      ((v.venta_items ?? []) as any[]).forEach((it: any) => {
        sa[it.producto_id] = (sa[it.producto_id] ?? 0) + Number(it.cantidad);
      });
    });
    ((mue.data ?? []) as any[]).forEach((m: any) => {
      sa[m.producto_id] = (sa[m.producto_id] ?? 0) + Number(m.cantidad);
    });
    setSalidas(sa);

    setCargando(false);""",
    1,
)

# stock considera salidas del taller
s = s.replace(
    "              const stock = prod - mer - env;",
    "              const sal = salidas[p.id] ?? 0;\n              const stock = prod - mer - env - sal;",
    1,
)
s = s.replace(
    '              <th className="num">Enviado</th>\n              <th className="num">Stock</th>',
    '              <th className="num">Enviado</th>\n              <th className="num">Taller</th>\n              <th className="num">Stock</th>',
    1,
)
s = s.replace(
    '                  <td className="num">{env || "—"}</td>',
    '                  <td className="num">{env || "—"}</td>\n                  <td className="num">{sal || "—"}</td>',
    1,
)
s = s.replace(
    "Producido − merma − enviado = stock en taller.",
    "Producido − merma − enviado − ventas de taller = stock.",
    1,
)

p.write_text(s, encoding="utf-8")
print("ok:", "salidas" in s)
