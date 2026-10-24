"""Anade el interruptor fijo/eventual a la pantalla de Ajustes (v2)."""
from pathlib import Path

p = Path("app/admin/page.tsx")
s = p.read_text(encoding="utf-8")
orig = s

s = s.replace(
    "type Punto = { id: string; codigo: string };",
    'type Punto = { id: string; codigo: string; nombre: string; tipo: string; es_fijo: boolean };',
)

s = s.replace(
    'supabase.from("puntos_venta").select("id, codigo").order("codigo"),',
    'supabase.from("puntos_venta").select("id, codigo, nombre, tipo, es_fijo").order("codigo"),',
)

ancla = "  async function alternarActivo(p: Prod) {"
if ancla not in s:
    raise SystemExit("no se encontro alternarActivo")
s = s.replace(ancla, """  async function alternarFijo(p: Punto) {
    await supabase.from("puntos_venta").update({ es_fijo: !p.es_fijo }).eq("id", p.id);
    cargar();
  }

""" + ancla, 1)

marca = "        <h2>Usuarios</h2>"
if marca not in s:
    raise SystemExit("no se encontro el bloque de usuarios")

nuevo = """        <h2>Puntos de venta y clientes</h2>
        <p className="sub" style={{ marginTop: -6 }}>
          Los fijos aparecen siempre en la parrilla de programación (lunes a viernes).
          Los eventuales solo cuando activas «mostrar eventuales».
        </p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Nombre</th>
                <th>Tipo</th>
                <th>Programación</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {puntos.map((pv) => (
                <tr key={pv.id}>
                  <td><strong>{pv.codigo}</strong></td>
                  <td>{pv.nombre}</td>
                  <td>{pv.tipo}</td>
                  <td>
                    <span className={`badge ${pv.es_fijo ? "ok" : "neutral"}`}>
                      {pv.es_fijo ? "fijo" : "eventual"}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button className="btn btn-sm" onClick={() => alternarFijo(pv)}>
                      {pv.es_fijo ? "Marcar eventual" : "Marcar fijo"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h2>Usuarios</h2>"""

s = s.replace(marca, nuevo, 1)

p.write_text(s, encoding="utf-8")
print("aplicado:", s != orig)
print("alternarFijo definida:", "async function alternarFijo" in s)
