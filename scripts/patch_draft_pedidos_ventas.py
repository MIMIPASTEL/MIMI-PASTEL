"""Borradores automaticos en Pedidos y Ventas."""
import re
from pathlib import Path

# ============ PEDIDOS ============
p = Path("app/pedidos/page.tsx")
s = p.read_text(encoding="utf-8")
orig = s

s = s.replace(
    'import PedidoDetalle from "@/components/PedidoDetalle";',
    'import PedidoDetalle from "@/components/PedidoDetalle";\n'
    'import { borrarBorrador, guardarBorrador, leerBorrador } from "@/lib/draft";',
    1,
)

s = s.replace(
    "  const [lineas, setLineas] = useState<Linea[]>([{ producto_id: \"\", cantidad: \"\", precio: \"\", nota: \"\" }]);",
    "  const [lineas, setLineas] = useState<Linea[]>([{ producto_id: \"\", cantidad: \"\", precio: \"\", nota: \"\" }]);\n"
    "  const [draftListo, setDraftListo] = useState(false);",
    1,
)

ancla = "  useEffect(() => {\n    cargar();\n  }, [cargar]);"
if ancla not in s:
    raise SystemExit("pedidos: no se encontro el useEffect de carga")

s = s.replace(
    ancla,
    ancla + """

  // recupera el formulario a medio llenar
  useEffect(() => {
    const d = leerBorrador<any>("mip:pedido:nuevo");
    if (d) {
      if (typeof d.cliente === "string") setCliente(d.cliente);
      if (typeof d.telefono === "string") setTelefono(d.telefono);
      if (typeof d.fecha === "string") setFecha(d.fecha);
      if (typeof d.hora === "string") setHora(d.hora);
      if (typeof d.puntoId === "string") setPuntoId(d.puntoId);
      if (typeof d.adelanto === "string") setAdelanto(d.adelanto);
      if (Array.isArray(d.lineas) && d.lineas.length > 0) setLineas(d.lineas);
    }
    setDraftListo(true);
  }, []);

  // autoguardado del formulario
  useEffect(() => {
    if (!draftListo) return;
    const t = setTimeout(
      () => guardarBorrador("mip:pedido:nuevo", { cliente, telefono, fecha, hora, puntoId, adelanto, lineas }),
      600,
    );
    return () => clearTimeout(t);
  }, [draftListo, cliente, telefono, fecha, hora, puntoId, adelanto, lineas]);""",
    1,
)

s = s.replace(
    """    setLineas([{ producto_id: "", cantidad: "", precio: "", nota: "" }]);
    if (!sync.error) setMsg("Pedido registrado y agregado a Programar.");""",
    """    setLineas([{ producto_id: "", cantidad: "", precio: "", nota: "" }]);
    borrarBorrador("mip:pedido:nuevo");
    if (!sync.error) setMsg("Pedido registrado y agregado a Programar.");""",
    1,
)

p.write_text(s, encoding="utf-8")
print("pedidos:", s != orig, "| draft:", "mip:pedido:nuevo" in s)

# ============ VENTAS ============
q = Path("app/ventas/page.tsx")
t = q.read_text(encoding="utf-8")
orig2 = t

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
    r"    setFilas\(\n      base\.map\(\(p\) => \(\{.*?\}\),\n    \);\n    setMostrarEnviado\(Boolean\(desp\)\);",
    re.S,
)
m = patron.search(t)
if not m:
    raise SystemExit("ventas: no se encontro el bloque setFilas")

bloque = m.group(0)
mapa = re.search(r"base\.map\(\(p\) => \(\{.*?\}\),", bloque, re.S).group(0).rstrip(",")
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

# autoguardado despues del useEffect de cargar
ancla2 = "  useEffect(() => {\n    cargar();\n  }, [cargar]);"
if ancla2 not in t:
    raise SystemExit("ventas: no se encontro el useEffect de carga")

t = t.replace(
    ancla2,
    ancla2 + """

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
print("ventas:", t != orig2, "| draft:", "mip:ventas" in t)
