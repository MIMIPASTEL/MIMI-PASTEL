from pathlib import Path

p = Path("components/InsumosProduccion.tsx")
s = p.read_text(encoding="utf-8")
orig = s

s = s.replace(
    'supabase.from("recetas").select("id, producto_id, version, rendimiento, receta_items(insumo_id, cantidad)"),',
    'supabase.from("recetas").select("id, producto_id, version, rendimiento, receta_items(insumo_id, cantidad, preparacion_id, preparaciones(rendimiento, preparacion_items(insumo_id, cantidad)))"),',
    1,
)

viejo = """      const factor = Number(l.cantidad_producida) / Number(r.rendimiento || 1);
      (r.receta_items ?? []).forEach((it: any) => {
        sug[it.insumo_id] = (sug[it.insumo_id] ?? 0) + factor * Number(it.cantidad);
      });"""

nuevo = """      const factor = Number(l.cantidad_producida) / Number(r.rendimiento || 1);
      (r.receta_items ?? []).forEach((it: any) => {
        if (it.insumo_id) {
          sug[it.insumo_id] = (sug[it.insumo_id] ?? 0) + factor * Number(it.cantidad);
        } else if (it.preparacion_id && it.preparaciones) {
          // la receta usa una preparación base (masa): se expande a sus insumos
          const factorPrep = Number(it.cantidad) / Number(it.preparaciones.rendimiento || 1);
          ((it.preparaciones.preparacion_items ?? []) as any[]).forEach((pi) => {
            sug[pi.insumo_id] = (sug[pi.insumo_id] ?? 0) + factor * factorPrep * Number(pi.cantidad);
          });
        }
      });"""

if viejo not in s:
    raise SystemExit("no se encontro el calculo del sugerido")
s = s.replace(viejo, nuevo, 1)

p.write_text(s, encoding="utf-8")
print("ok:", s != orig, "| preparaciones:", "factorPrep" in s)
