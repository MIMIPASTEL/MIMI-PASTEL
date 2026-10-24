"""Borrador automatico en la parrilla de programacion."""
import re
from pathlib import Path

p = Path("app/programacion/page.tsx")
s = p.read_text(encoding="utf-8")
orig = s

# 1. imports
s = s.replace(
    'import PedidoDetalle from "@/components/PedidoDetalle";',
    'import PedidoDetalle from "@/components/PedidoDetalle";\n'
    'import { borrarBorrador, guardarBorrador, leerBorrador } from "@/lib/draft";',
    1,
)

# 2. estado
s = s.replace(
    "  const [pedidosDia, setPedidosDia] = useState<any[]>([]);",
    """  const [pedidosDia, setPedidosDia] = useState<any[]>([]);
  const [draftDisponible, setDraftDisponible] = useState(false);
  const [listo, setListo] = useState(false);
  const [snapshot, setSnapshot] = useState("");""",
    1,
)

# 3. cargarDia con recuperacion del borrador
nuevo_cargar = '''  const cargarDia = useCallback(async () => {
    setListo(false);
    const [req, om, pe] = await Promise.all([
      supabase.from("requerimientos").select("id").eq("fecha", fecha).maybeSingle(),
      supabase.from("puntos_omitidos").select("punto_venta_id").eq("fecha", fecha),
      supabase
        .from("pedidos")
        .select("id, cliente, telefono, notas, hora_entrega, estado, adelanto, pedido_items(producto_id, cantidad, precio_unitario, nota, productos(nombre))")
        .eq("fecha_entrega", fecha)
        .neq("estado", "cancelado")
        .order("hora_entrega"),
    ]);

    setOmitidos(new Set(((om.data ?? []) as any[]).map((x) => x.punto_venta_id)));
    setPedidosDia((pe.data ?? []) as any[]);

    const m: Record<string, string> = {};
    if (req.data) {
      const { data: its } = await supabase
        .from("requerimiento_items")
        .select("producto_id, destino_punto_id, cantidad")
        .eq("requerimiento_id", req.data.id)
        .not("destino_punto_id", "is", null);
      (its ?? []).forEach((i: any) => {
        m[`${i.destino_punto_id}|${i.producto_id}`] = String(Number(i.cantidad));
      });
    }

    const borrador = leerBorrador<Record<string, string>>(`mip:prog:${fecha}`);
    if (borrador && Object.keys(borrador).length > 0) {
      setCeldas({ ...m, ...borrador });
      setDraftDisponible(true);
    } else {
      setCeldas(m);
      setDraftDisponible(false);
    }
    setSnapshot(JSON.stringify(m));
    setListo(true);
  }, [fecha]);
'''
s, n = re.subn(
    r"  const cargarDia = useCallback\(async \(\) => \{.*?\n  \}, \[fecha\]\);\n",
    nuevo_cargar,
    s,
    count=1,
    flags=re.S,
)
if n != 1:
    raise SystemExit("no se pudo reemplazar cargarDia")

# 4. autoguardado
s = s.replace(
    """  useEffect(() => {
    cargarDia();
  }, [cargarDia]);""",
    """  useEffect(() => {
    cargarDia();
  }, [cargarDia]);

  // guarda lo digitado aunque no se haya pulsado "Guardar"
  useEffect(() => {
    if (!listo) return;
    const actual = JSON.stringify(celdas);
    if (actual === snapshot) return;
    const t = setTimeout(() => {
      guardarBorrador(`mip:prog:${fecha}`, celdas);
      setDraftDisponible(true);
    }, 600);
    return () => clearTimeout(t);
  }, [celdas, listo, fecha, snapshot]);""",
    1,
)

# 5. al guardar, el borrador ya no hace falta
s = s.replace(
    """    await supabase.from("requerimientos").update({ estado: "publicado" }).eq("id", reqId);
    setGuardando(false);""",
    """    await supabase.from("requerimientos").update({ estado: "publicado" }).eq("id", reqId);
    borrarBorrador(`mip:prog:${fecha}`);
    setDraftDisponible(false);
    setSnapshot(JSON.stringify(celdas));
    setGuardando(false);""",
    1,
)

# 6. aviso + boton descartar
marca = '      {msg && <div className="alert ok">{msg}</div>}'
if marca not in s:
    raise SystemExit("no se encontro el bloque de mensajes")

aviso = """      {msg && <div className="alert ok">{msg}</div>}

      {draftDisponible && (
        <div className="alert" style={{ background: "var(--warn-soft)", color: "var(--warn)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <span>Recuperé lo que estabas digitando. Guárdalo para fijarlo.</span>
          <button className="btn btn-sm" type="button" onClick={descartarBorrador}>
            Descartar
          </button>
        </div>
      )}"""
s = s.replace(marca, aviso, 1)

# 7. funcion descartar
s = s.replace(
    "  async function guardar() {",
    """  async function descartarBorrador() {
    borrarBorrador(`mip:prog:${fecha}`);
    setDraftDisponible(false);
    setListo(false);
    await cargarDia();
  }

  async function guardar() {""",
    1,
)

p.write_text(s, encoding="utf-8")
print("aplicado:", s != orig)
print("draft:", "mip:prog" in s, "| descartar:", "descartarBorrador" in s)
