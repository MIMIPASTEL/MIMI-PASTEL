import re
from pathlib import Path

p = Path("app/repartos/page.tsx")
s = p.read_text(encoding="utf-8")

# precio distribuidor por defecto
s = s.replace('useState<"directo" | "distribuidor">("directo")', 'useState<"directo" | "distribuidor">("distribuidor")', 1)

# cargar cantidades programadas del cliente
ancla = "  const set = (i: number, campo: keyof Fila, v: string) =>"
efecto = """  useEffect(() => {
    async function traerProgramado() {
      if (!puntoId || !fecha) return;
      const { data: req } = await supabase
        .from("requerimientos")
        .select("id")
        .eq("fecha", fecha)
        .maybeSingle();
      if (!req) return;

      const { data: its } = await supabase
        .from("requerimiento_items")
        .select("producto_id, cantidad")
        .eq("requerimiento_id", req.id)
        .eq("destino_punto_id", puntoId);

      const mapa: Record<string, number> = {};
      ((its ?? []) as any[]).forEach((x) => {
        mapa[x.producto_id] = (mapa[x.producto_id] ?? 0) + Number(x.cantidad);
      });

      setFilas((fs) =>
        fs.map((f) => ({
          ...f,
          cantidad: mapa[f.producto_id] ? String(mapa[f.producto_id]) : "",
        })),
      );
    }
    traerProgramado();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fecha, puntoId]);

""" + ancla

if "traerProgramado" not in s:
    s = s.replace(ancla, efecto, 1)

p.write_text(s, encoding="utf-8")
print("ok:", "traerProgramado" in s, "| distribuidor:", '"distribuidor")' in s)
