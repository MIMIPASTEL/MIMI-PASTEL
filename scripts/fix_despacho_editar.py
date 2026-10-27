from pathlib import Path

p = Path("components/Despacho.tsx")
s = p.read_text(encoding="utf-8")
orig = s

# 1. si se deja todo en cero, se limpia el envio existente
viejo = """      if (items.length === 0) continue;"""
nuevo = """      if (items.length === 0) {
        const { data: previo } = await supabase
          .from("despachos")
          .select("id")
          .eq("fecha", fecha)
          .eq("punto_venta_id", pv.id)
          .maybeSingle();
        if (previo) await supabase.from("despacho_items").delete().eq("despacho_id", previo.id);
        continue;
      }"""
if viejo not in s:
    raise SystemExit("no se encontro el continue")
s = s.replace(viejo, nuevo, 1)

# 2. borrar los items anteriores y grabar los nuevos
viejo2 = """      const { error: e2 } = await supabase.from("despacho_items").upsert(
        items.map((x) => ({
          despacho_id: desp.id,
          producto_id: x.p.id,
          cantidad_enviada: x.v,
          cantidad_stock: 0,
        })),
        { onConflict: "despacho_id,producto_id" },
      );"""
nuevo2 = """      await supabase.from("despacho_items").delete().eq("despacho_id", desp.id);

      const { error: e2 } = await supabase.from("despacho_items").insert(
        items.map((x) => ({
          despacho_id: desp.id,
          producto_id: x.p.id,
          cantidad_enviada: x.v,
          cantidad_stock: 0,
        })),
      );"""
if viejo2 not in s:
    raise SystemExit("no se encontro el upsert de items")
s = s.replace(viejo2, nuevo2, 1)

p.write_text(s, encoding="utf-8")
print("ok:", "previo" in s and "delete().eq(\"despacho_id\", desp.id)" in s)
