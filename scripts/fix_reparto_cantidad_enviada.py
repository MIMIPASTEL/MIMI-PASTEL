from pathlib import Path

p = Path("app/repartos/page.tsx")
s = p.read_text(encoding="utf-8")
orig = s

ancla = """      const ids = Object.keys(programado);"""

bloque = """      // lo que produccion realmente despacho tiene prioridad
      const { data: desp } = await supabase
        .from("despachos")
        .select("despacho_items(producto_id, cantidad_enviada)")
        .eq("fecha", fecha)
        .eq("punto_venta_id", puntoId)
        .maybeSingle();

      if (desp) {
        const enviado: Record<string, number> = {};
        ((desp as any).despacho_items ?? []).forEach((it: any) => {
          enviado[it.producto_id] = (enviado[it.producto_id] ?? 0) + Number(it.cantidad_enviada);
        });
        const claves = new Set([...Object.keys(programado), ...Object.keys(enviado)]);
        programado = {};
        claves.forEach((k) => {
          programado[k] = enviado[k] ?? 0;
        });
      }

""" + ancla

if "tiene prioridad" not in s:
    s = s.replace(ancla, bloque, 1)

p.write_text(s, encoding="utf-8")
print("ok:", "tiene prioridad" in s)
