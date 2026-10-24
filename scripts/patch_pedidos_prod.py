"""Conecta pedidos -> programacion automaticamente."""
import re
from pathlib import Path

# ---------- app/pedidos/page.tsx ----------
p = Path("app/pedidos/page.tsx")
s = p.read_text(encoding="utf-8")
orig = s

s = s.replace(
    'import { supabase, hoyISO, soles, numero, fechaCorta } from "@/lib/supabase";',
    'import { supabase, hoyISO, soles, numero, fechaCorta } from "@/lib/supabase";\n'
    'import { sincronizarPedido } from "@/lib/pedidos";',
    1,
)

s = s.replace(
    """    if (e2) return setErr(e2.message);

    setCliente("");""",
    """    if (e2) return setErr(e2.message);

    const sync = await sincronizarPedido(ped.id, perfil?.id);
    if (sync.error) setErr("Pedido guardado, pero no se pudo programar: " + sync.error);

    setCliente("");""",
    1,
)

s = s.replace(
    'setMsg("Pedido registrado.");',
    'if (!sync.error) setMsg("Pedido registrado y agregado a Programar.");',
    1,
)

nueva_pasar = '''  async function pasarAProduccion(p: Pedido) {
    setErr(null);
    setMsg(null);
    const r = await sincronizarPedido(p.id, perfil?.id);
    if (r.error) setErr(r.error);
    else setMsg("Pedido sincronizado con el requerimiento de produccion.");
  }
'''
s, n = re.subn(
    r"  async function pasarAProduccion\(p: Pedido\) \{.*?\n  \}\n",
    nueva_pasar,
    s,
    count=1,
    flags=re.S,
)
if n != 1:
    raise SystemExit("no se pudo reemplazar pasarAProduccion")

s = s.replace("Pasar al requerimiento", "Sincronizar con produccion", 1)

p.write_text(s, encoding="utf-8")
print("pedidos:", s != orig, "| funcion nueva:", "async function pasarAProduccion(p: Pedido) {\n    setErr(null);" in s)

# ---------- app/programacion/page.tsx ----------
q = Path("app/programacion/page.tsx")
t = q.read_text(encoding="utf-8")
orig2 = t

t = t.replace(
    '  const [nuevoNombre, setNuevoNombre] = useState("");',
    '  const [nuevoNombre, setNuevoNombre] = useState("");\n'
    "  const [pedidosDia, setPedidosDia] = useState<any[]>([]);",
    1,
)

nueva_carga = '''  const cargarDia = useCallback(async () => {
    const [req, om, pe] = await Promise.all([
      supabase.from("requerimientos").select("id").eq("fecha", fecha).maybeSingle(),
      supabase.from("puntos_omitidos").select("punto_venta_id").eq("fecha", fecha),
      supabase
        .from("pedidos")
        .select("id, cliente, hora_entrega, estado, pedido_items(producto_id, cantidad)")
        .eq("fecha_entrega", fecha)
        .neq("estado", "cancelado")
        .order("hora_entrega"),
    ]);

    setOmitidos(new Set(((om.data ?? []) as any[]).map((x) => x.punto_venta_id)));
    setPedidosDia((pe.data ?? []) as any[]);

    if (!req.data) {
      setCeldas({});
      return;
    }
    const { data: its } = await supabase
      .from("requerimiento_items")
      .select("producto_id, destino_punto_id, cantidad")
      .eq("requerimiento_id", req.data.id)
      .not("destino_punto_id", "is", null);
    const m: Record<string, string> = {};
    (its ?? []).forEach((i: any) => {
      m[`${i.destino_punto_id}|${i.producto_id}`] = String(Number(i.cantidad));
    });
    setCeldas(m);
  }, [fecha]);
'''
t, n2 = re.subn(
    r"  const cargarDia = useCallback\(async \(\) => \{.*?\n  \}, \[fecha\]\);\n",
    nueva_carga,
    t,
    count=1,
    flags=re.S,
)
if n2 != 1:
    raise SystemExit("no se pudo reemplazar cargarDia")

# resumen de pedidos
t = t.replace(
    "  const listaOmitidos = puntos.filter((p) => omitidos.has(p.id));",
    """  const listaOmitidos = puntos.filter((p) => omitidos.has(p.id));

  const resumenPedidos = useMemo(() => {
    const m: Record<string, number> = {};
    pedidosDia.forEach((p) =>
      (p.pedido_items ?? []).forEach((it: any) => {
        m[it.producto_id] = (m[it.producto_id] ?? 0) + Number(it.cantidad);
      }),
    );
    return m;
  }, [pedidosDia]);

  const totalPedidos = Object.values(resumenPedidos).reduce((a, b) => a + b, 0);""",
    1,
)

# tarjeta de pedidos antes de "Hoy no pidieron"
marca = "      {listaOmitidos.length > 0 && ("
if marca not in t:
    raise SystemExit("no se encontro la tarjeta de omitidos")

tarjeta = """      {pedidosDia.length > 0 && (
        <div className="card">
          <div className="row" style={{ marginBottom: 10 }}>
            <h2 style={{ margin: 0 }}>Pedidos de este día</h2>
            <span className="badge ok">{numero(totalPedidos)} unid. en producción</span>
          </div>
          {pedidosDia.map((p) => (
            <div key={p.id} style={{ padding: "8px 0", borderBottom: "1px solid #f3ebe5" }}>
              <div className="row">
                <div>
                  <strong>{p.cliente}</strong>
                  <div className="sub" style={{ margin: 0 }}>
                    {p.hora_entrega ? String(p.hora_entrega).slice(0, 5) : "sin hora"} · {p.estado}
                  </div>
                </div>
                <div className="num" style={{ textAlign: "right" }}>
                  {(p.pedido_items ?? [])
                    .map((it: any) => {
                      const prod = productos.find((x) => x.id === it.producto_id);
                      return `${prod?.codigo ?? "?"}×${Number(it.cantidad)}`;
                    })
                    .join(" · ")}
                </div>
              </div>
            </div>
          ))}
          <p className="sub" style={{ margin: "10px 0 0" }}>
            Se agregan solos al requerimiento. Si un pedido se cancela, deja de aparecer aquí.
          </p>
        </div>
      )}

"""
t = t.replace(marca, tarjeta + marca, 1)

q.write_text(t, encoding="utf-8")
print("programacion:", t != orig2)
