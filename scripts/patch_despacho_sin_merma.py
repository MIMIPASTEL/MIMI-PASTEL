from pathlib import Path
import re

p = Path("components/Despacho.tsx")
s = p.read_text(encoding="utf-8")
orig = s
n = 0

def rep(viejo, nuevo, exacto=1):
    global s, n
    if viejo not in s:
        raise SystemExit("NO ENCONTRADO: " + viejo[:60])
    s = s.replace(viejo, nuevo, exacto)
    n += 1

# 1. estado
rep('  const [merma, setMerma] = useState<Record<string, string>>({});\n', "")

# 2. consulta de mermas
rep("""    const [req, des, mpr] = await Promise.all([""", """    const [req, des] = await Promise.all([""")
rep("""      supabase.from("mermas").select("producto_id, cantidad").eq("fecha", fecha).eq("tipo", "produccion"),
""", "")

# 3. seteo de merma al cargar
rep("""    const m: Record<string, string> = {};
    ((mpr.data ?? []) as any[]).forEach((x) => {
      m[x.producto_id] = String(Number(x.cantidad));
    });
    setMerma(m);
""", "")

# 4. total de merma
rep("""  const totalMerma = productos.reduce((a, p) => a + Number(merma[p.id] || 0), 0);
""", "")

# 5. guardado de merma
ini = s.find("    // merma de producción del día")
if ini == -1:
    raise SystemExit("no se encontro el bloque de merma en guardar")
fin = s.find("    setGuardando(false);", ini)
if fin == -1:
    raise SystemExit("no se encontro el cierre del guardado")
s = s[:ini] + s[fin:]
n += 1

# 6. fila de merma en la tabla
ini2 = s.find('<tr style={{ background: "#fff7f5" }}>\n                <td className="sticky" style={{ fontSize: 12.5 }}>Merma (rotos / quemados)</td>')
if ini2 == -1:
    raise SystemExit("no se encontro la fila de merma")
fin2 = s.find("</tr>", ini2) + len("</tr>\n\n")
s = s[:ini2] + s[fin2:]
n += 1

p.write_text(s, encoding="utf-8")
print("cambios:", n, "| merma restante:", "merma" in s.lower())
