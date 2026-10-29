from pathlib import Path

p = Path("app/repartos/page.tsx")
s = p.read_text(encoding="utf-8")
orig = s

# estados
s = s.replace(
    '  const [cargando, setCargando] = useState(true);',
    '  const [cargando, setCargando] = useState(true);\n'
    '  const [devueltos, setDevueltos] = useState<Record<string, string>>({});\n'
    '  const [destinoDev, setDestinoDev] = useState<"revender" | "descartar">("revender");',
    1,
)

# bruto usa la cantidad devuelta
s = s.replace(
    "    () => filas.reduce((a, f) => a + f.cantidad * Number(f.precio || 0), 0),",
    "    () =>\n      filas.reduce(\n"
    "        (a, f) =>\n"
    "          a + Math.max(0, f.cantidad - Number(devueltos[f.producto_id] || 0)) * Number(f.precio || 0),\n"
    "        0,\n"
    "      ),",
    1,
)
s = s.replace("    [filas],\n  );", "    [filas, devueltos],\n  );", 1)

# guardar venta con lo realmente vendido
s = s.replace(
    """      filas.map((f) => ({
        venta_id: venta.id,
        producto_id: f.producto_id,
        cantidad: f.cantidad,
        precio_unitario: Number(f.precio),
      })),""",
    """      filas
        .map((f) => ({
          venta_id: venta.id,
          producto_id: f.producto_id,
          cantidad: Math.max(0, f.cantidad - Number(devueltos[f.producto_id] || 0)),
          precio_unitario: Number(f.precio),
        }))
        .filter((x) => x.cantidad > 0),""",
    1,
)

# registrar devoluciones
ancla = "    const pagos: any[] = [];"
bloque = """    // devoluciones: se revenden (sobrante) o se descartan (merma)
    const devs = filas.filter((f) => Number(devueltos[f.producto_id] || 0) > 0);
    if (devs.length) {
      await supabase.from("sobrantes").delete().eq("fecha", fecha).eq("punto_venta_id", puntoId);
      await supabase.from("mermas").delete().eq("fecha", fecha).eq("punto_venta_id", puntoId).eq("tipo", "devolucion");

      if (destinoDev === "revender") {
        await supabase.from("sobrantes").insert(
          devs.map((f) => ({
            fecha,
            punto_venta_id: puntoId,
            producto_id: f.producto_id,
            cantidad: Number(devueltos[f.producto_id]),
            cantidad_reutilizable: Number(devueltos[f.producto_id]),
          })),
        );
      } else {
        await supabase.from("mermas").insert(
          devs.map((f) => ({
            fecha,
            punto_venta_id: puntoId,
            producto_id: f.producto_id,
            cantidad: Number(devueltos[f.producto_id]),
            tipo: "devolucion",
            nota: "Producto devuelto por el cliente",
          })),
        );
      }
    }

""" + ancla
if "se revenden (sobrante)" not in s:
    s = s.replace(ancla, bloque, 1)

p.write_text(s, encoding="utf-8")
print("ok:", "destinoDev" in s, "| devs:", "se revenden" in s)
