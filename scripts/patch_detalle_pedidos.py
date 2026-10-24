"""Muestra el detalle de los pedidos en Programar y en Produccion."""
from pathlib import Path

# ---------------- programacion ----------------
p = Path("app/programacion/page.tsx")
s = p.read_text(encoding="utf-8")
orig = s

s = s.replace(
    'import { supabase, hoyISO, numero, fechaCorta } from "@/lib/supabase";',
    'import { supabase, hoyISO, numero, fechaCorta } from "@/lib/supabase";\n'
    'import PedidoDetalle from "@/components/PedidoDetalle";',
    1,
)

s = s.replace(
    '.select("id, cliente, hora_entrega, estado, pedido_items(producto_id, cantidad)")',
    '.select("id, cliente, telefono, notas, hora_entrega, estado, adelanto, pedido_items(producto_id, cantidad, precio_unitario, nota, productos(nombre))")',
    1,
)

s = s.replace(
    "  const listaOmitidos = puntos.filter((p) => omitidos.has(p.id));",
    """  const listaOmitidos = puntos.filter((p) => omitidos.has(p.id));

  const nombres: Record<string, string> = {};
  productos.forEach((p) => {
    nombres[p.id] = p.codigo ?? p.nombre;
  });""",
    1,
)

ini = s.find("      {pedidosDia.length > 0 && (")
fin = s.find("      {listaOmitidos.length > 0 && (")
if ini == -1 or fin == -1 or fin < ini:
    raise SystemExit("no se encontro el bloque de pedidos en programacion")

nuevo = """      {pedidosDia.length > 0 && (
        <div className="card">
          <div className="row" style={{ marginBottom: 10 }}>
            <h2 style={{ margin: 0 }}>Pedidos de este día</h2>
            <span className="badge ok">{numero(totalPedidos)} unid. en producción</span>
          </div>
          {pedidosDia.map((p) => (
            <PedidoDetalle key={p.id} pedido={p} nombres={nombres} />
          ))}
          <p className="sub" style={{ margin: "10px 0 0" }}>
            Toca un pedido para ver las indicaciones del cliente. Se agregan solos al requerimiento.
          </p>
        </div>
      )}

"""
s = s[:ini] + nuevo + s[fin:]
p.write_text(s, encoding="utf-8")
print("programacion:", s != orig)

# ---------------- produccion ----------------
q = Path("app/produccion/page.tsx")
t = q.read_text(encoding="utf-8")
orig2 = t

t = t.replace(
    'import { supabase, hoyISO, soles, numero, fechaCorta } from "@/lib/supabase";',
    'import { supabase, hoyISO, soles, numero, fechaCorta } from "@/lib/supabase";\n'
    'import PedidoDetalle from "@/components/PedidoDetalle";',
    1,
)

t = t.replace(
    "  const [mensaje, setMensaje] = useState<string | null>(null);",
    "  const [mensaje, setMensaje] = useState<string | null>(null);",
    1,
)

t = t.replace(
    "  const [err, setErr] = useState<string | null>(null);",
    "  const [err, setErr] = useState<string | null>(null);\n  const [pedidosDia, setPedidosDia] = useState<any[]>([]);",
    1,
)

t = t.replace(
    "    setProductos((p.data ?? []) as Prod[]);\n    setPuntos((pv.data ?? []) as Punto[]);",
    """    setProductos((p.data ?? []) as Prod[]);
    setPuntos((pv.data ?? []) as Punto[]);

    const { data: pe } = await supabase
      .from("pedidos")
      .select("id, cliente, telefono, notas, hora_entrega, estado, adelanto, pedido_items(producto_id, cantidad, precio_unitario, nota, productos(nombre))")
      .eq("fecha_entrega", fecha)
      .neq("estado", "cancelado")
      .order("hora_entrega");
    setPedidosDia(pe ?? []);""",
    1,
)

t = t.replace(
    "  const nombreProd = (id: string) => productos.find((p) => p.id === id)?.nombre ?? \"—\";",
    """  const nombreProd = (id: string) => productos.find((p) => p.id === id)?.nombre ?? "—";

  const nombres: Record<string, string> = {};
  productos.forEach((p) => {
    nombres[p.id] = p.nombre;
  });""",
    1,
)

marca = """      <div className="card">
        <h2>Registrar producción</h2>"""
if marca not in t:
    raise SystemExit("no se encontro la tarjeta de registrar produccion")

tarjeta = """      {pedidosDia.length > 0 && (
        <div className="card">
          <h2>Pedidos del día · indicaciones del cliente</h2>
          {pedidosDia.map((p) => (
            <PedidoDetalle key={p.id} pedido={p} nombres={nombres} />
          ))}
          <p className="sub" style={{ margin: "10px 0 0" }}>
            Toca cada pedido para ver cómo debe prepararse.
          </p>
        </div>
      )}

"""
t = t.replace(marca, tarjeta + marca, 1)

q.write_text(t, encoding="utf-8")
print("produccion:", t != orig2)
