"""Borrador automatico en Ventas."""
import re
from pathlib import Path

q = Path("app/ventas/page.tsx")
t = q.read_text(encoding="utf-8")
orig = t

if "mip:ventas" in t:
    raise SystemExit("ya estaba aplicado")

t = t.replace(
    'import { supabase, hoyISO, soles, numero, fechaCorta } from "@/lib/supabase";',
    'import { supabase, hoyISO, soles, numero, fechaCorta } from "@/lib/supabase";\n'
    'import { borrarBorrador, guardarBorrador, leerBorrador } from "@/lib/draft";',
    1,
)

t = t.replace(
    "  const [guardando, setGuardando] = useState(false);",
    "  const [guardando, setGuardando] = useState(false);\n  const [draftListo, setDraftListo] = useState(false);",
    1,
)

patron = re.compile(
    r"    setFilas\(\n      base\.map\(\(p\) => \(\{.*?\}\)\),\n    \);\n    setMostrarEnviado\(Boolean\(desp\)\);",
    re.S,
)
m = patron.search(t)
if not m:
    raise SystemExit("no se encontro el bloque setFilas")

bloque = m.group(0)
mapa = re.search(r"base\.map\(\(p\) => \(\{.*?\}\)\),", bloque, re.S).group(0)
mapa = mapa[: -1]  # quitar la coma final

nuevo = f"""    const filasBase = {mapa};

    const d = leerBorrador<any>(`mip:ventas:${{fecha}}:${{puntoId}}`);
    if (d && Array.isArray(d.filas) && d.filas.length > 0) {{
      setFilas(d.filas);
      if (typeof d.efectivo === "string") setEfectivo(d.efectivo);
      if (typeof d.yape === "string") setYape(d.yape);
      if (typeof d.transferencia === "string") setTransferencia(d.transferencia);
    }} else {{
      setFilas(filasBase);
    }}
    setMostrarEnviado(Boolean(desp));
    setDraftListo(true);"""

t = t[: m.start()] + nuevo + t[m.end() :]

ancla = "  useEffect(() => {\n    cargar();\n  }, [cargar]);"
if ancla not in t:
    raise SystemExit("no se encontro el useEffect de carga")

t = t.replace(
    ancla,
    ancla + """

  useEffect(() => {
    if (!draftListo) return;
    const t = setTimeout(
      () => guardarBorrador(`mip:ventas:${fecha}:${puntoId}`, { filas, efectivo, yape, transferencia }),
      700,
    );
    return () => clearTimeout(t);
  }, [draftListo, filas, efectivo, yape, transferencia, fecha, puntoId]);""",
    1,
)

t = t.replace(
    """    setGuardando(false);
    setMsg("Cierre guardado. Revisa las diferencias abajo.");""",
    """    setGuardando(false);
    borrarBorrador(`mip:ventas:${fecha}:${puntoId}`);
    setMsg("Cierre guardado. Revisa las diferencias abajo.");""",
    1,
)

q.write_text(t, encoding="utf-8")
print("aplicado:", t != orig, "| draft:", "mip:ventas" in t, "| filasBase:", "filasBase" in t)
