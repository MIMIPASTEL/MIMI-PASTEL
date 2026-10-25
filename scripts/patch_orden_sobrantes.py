from pathlib import Path

# ---------- ParrillaPrograma: sobrante desde la misma fuente que la revision ----------
p = Path("components/ParrillaPrograma.tsx")
s = p.read_text(encoding="utf-8")
orig = s

if "restarDia" not in s:
    s = s.replace(
        "type Punto = { id: string; codigo: string; es_fijo?: boolean };",
        """type Punto = { id: string; codigo: string; es_fijo?: boolean };

function restarDia(iso: string) {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() - 1);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}""",
        1,
    )

s = s.replace(
    'supabase.from("v_sugerido_produccion").select("producto_id, sobrante_ayer").eq("fecha", fecha),',
    'supabase.from("sobrantes").select("producto_id, cantidad, cantidad_reutilizable").eq("fecha", restarDia(fecha)),',
    1,
)

s = s.replace(
    """    const sm: Record<string, number> = {};
    ((sug.data ?? []) as any[]).forEach((x) => {
      sm[x.producto_id] = (sm[x.producto_id] ?? 0) + Number(x.sobrante_ayer);
    });""",
    """    const sm: Record<string, number> = {};
    ((sug.data ?? []) as any[]).forEach((x) => {
      const util = x.cantidad_reutilizable === null ? Number(x.cantidad) : Number(x.cantidad_reutilizable);
      sm[x.producto_id] = (sm[x.producto_id] ?? 0) + util;
    });""",
    1,
)

# titulo numerado y version para refrescar
s = s.replace(
    '<h2 style={{ margin: 0 }}>Programación del día</h2>',
    '<h2 style={{ margin: 0 }}>2 · Programación del día</h2>',
    1,
)

s = s.replace(
    "export default function ParrillaPrograma({\n  fecha,\n  productos,\n  puntos,\n}: {",
    "export default function ParrillaPrograma({\n  fecha,\n  productos,\n  puntos,\n}: {",
    1,
)

p.write_text(s, encoding="utf-8")
print("parrilla:", s != orig)

# ---------- SobrantesRevision: avisar cuando se guarda ----------
q = Path("components/SobrantesRevision.tsx")
t = q.read_text(encoding="utf-8")
orig2 = t

t = t.replace(
    """export default function SobrantesRevision({
  fecha,
  productos,
  puntos,
}: {
  fecha: string;
  productos: Prod[];
  puntos: Punto[];
}) {""",
    """export default function SobrantesRevision({
  fecha,
  productos,
  puntos,
  onSaved,
}: {
  fecha: string;
  productos: Prod[];
  puntos: Punto[];
  onSaved?: () => void;
}) {""",
    1,
)

t = t.replace(
    '    setMsg("Revisión guardada: el sobrante útil ya alimenta la producción de hoy.");\n    cargar();',
    '    setMsg("Revisión guardada: el sobrante útil ya alimenta la producción de hoy.");\n    cargar();\n    if (onSaved) onSaved();',
    1,
)

t = t.replace('<h2>Sobrantes de ayer · ¿cuánto sirve?</h2>', '<h2>1 · Sobrantes de ayer · ¿cuánto sirve?</h2>', 1)
t = t.replace('<h2>Sobrantes de ayer</h2>', '<h2>1 · Sobrantes de ayer</h2>', 1)

q.write_text(t, encoding="utf-8")
print("sobrantes:", t != orig2, "| onSaved:", "onSaved" in t)
