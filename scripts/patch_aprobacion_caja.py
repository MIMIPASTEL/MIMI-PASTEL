from pathlib import Path

# ---------- ventas: los movimientos quedan pendientes ----------
p = Path("app/ventas/page.tsx")
s = p.read_text(encoding="utf-8")
orig = s

# gastos clasificados: agregar aprobado: false
s = s.replace(
    '        creado_por: perfil?.id,\n        tipo: "salida",',
    '        creado_por: perfil?.id,\n        tipo: "salida",\n        aprobado: false,',
)
# ingresos del turno
s = s.replace(
    '        referencia: refTurno,\n        creado_por: perfil?.id,',
    '        referencia: refTurno,\n        creado_por: perfil?.id,\n        aprobado: false,',
)

p.write_text(s, encoding="utf-8")
print("ventas:", s.count("aprobado: false"))

# ---------- caja: solo aprobados + seccion pendientes ----------
c = Path("app/caja/page.tsx")
t = c.read_text(encoding="utf-8")

t = t.replace(
    '.select("id, fecha, tipo, categoria_codigo, monto, medio, concepto, punto_venta_id")',
    '.select("id, fecha, tipo, categoria_codigo, monto, medio, concepto, punto_venta_id, aprobado")',
    1,
)
t = t.replace(
    "  punto_venta_id: string | null;\n};",
    "  punto_venta_id: string | null;\n  aprobado: boolean;\n};",
    1,
)

# separar aprobados y pendientes
t = t.replace(
    "  const ingresos = useMemo(",
    "  const aprobados = useMemo(() => movs.filter((m) => m.aprobado), [movs]);\n"
    "  const pendientes = useMemo(() => movs.filter((m) => !m.aprobado), [movs]);\n\n"
    "  const ingresos = useMemo(",
    1,
)
t = t.replace("movs.filter((m) => m.tipo === \"ingreso\")", "aprobados.filter((m) => m.tipo === \"ingreso\")", 1)
t = t.replace("movs.filter((m) => m.tipo === \"salida\")", "aprobados.filter((m) => m.tipo === \"salida\")", 1)
t = t.replace(
    "      movs\n        .filter((m) => m.tipo === \"salida\")",
    "      aprobados\n        .filter((m) => m.tipo === \"salida\")",
    1,
)
t = t.replace("      movs\n        .filter((m) => m.tipo === \"salida\" && m.categoria_codigo === \"compra_insumo\")",
              "      aprobados\n        .filter((m) => m.tipo === \"salida\" && m.categoria_codigo === \"compra_insumo\")", 1)

# aprobar
ancla = "  async function eliminar(m: Mov) {"
funcion = """  async function aprobarTodo() {
    if (pendientes.length === 0) return;
    if (!confirm(`Aprobar ${pendientes.length} movimientos y enviarlos a caja?`)) return;
    const ids = pendientes.map((m) => m.id);
    const { error } = await supabase.from("movimientos_caja").update({ aprobado: true }).in("id", ids);
    if (error) return setErr(error.message);
    setMsg(`${ids.length} movimientos aprobados.`);
    cargar();
  }

  async function aprobarUno(m: Mov) {
    const { error } = await supabase.from("movimientos_caja").update({ aprobado: true }).eq("id", m.id);
    if (error) return setErr(error.message);
    cargar();
  }

""" + ancla
t = t.replace(ancla, funcion, 1)

# tabla de pendientes antes de "Movimientos del mes"
ancla2 = '      <div className="card">\n        <h2>Movimientos del mes</h2>'
pend = '''      <div className="card">
        <h2>Pendientes de aprobación</h2>
        {pendientes.length === 0 ? (
          <p className="empty">No hay movimientos por aprobar.</p>
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Fecha</th><th>Punto</th><th>Tipo</th><th>Categoría</th><th>Concepto</th><th className="num">Monto</th><th></th></tr>
                </thead>
                <tbody>
                  {pendientes.map((m) => (
                    <tr key={m.id}>
                      <td>{m.fecha}</td>
                      <td>{puntos.find((x) => x.id === m.punto_venta_id)?.codigo ?? "—"}</td>
                      <td>{m.tipo === "ingreso" ? "Ingreso" : "Salida"}</td>
                      <td>{nombreCat(m.categoria_codigo)}</td>
                      <td>{m.concepto ?? "—"}</td>
                      <td className="num">{soles(Number(m.monto))}</td>
                      <td className="num">
                        <button type="button" onClick={() => aprobarUno(m)} style={{ background: "none", border: 0, cursor: "pointer", color: "var(--brand)", fontWeight: 700 }}>
                          Aprobar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button className="btn btn-sm" style={{ marginTop: 10 }} onClick={aprobarTodo}>
              Aprobar todo ({pendientes.length})
            </button>
          </>
        )}
        <p className="sub" style={{ margin: "10px 4px 0", fontSize: 12 }}>
          Mientras no se aprueben, estos movimientos no afectan los totales de caja.
        </p>
      </div>

''' + ancla2
if ancla2 in t:
    t = t.replace(ancla2, pend, 1)

# la tabla de movimientos usa aprobados
t = t.replace("{movs.map((m) => (", "{aprobados.map((m) => (", 1)
t = t.replace("{movs.length === 0 ? (\n          <p className=\"empty\">Sin movimientos.</p>", "{aprobados.length === 0 ? (\n          <p className=\"empty\">Sin movimientos aprobados.</p>", 1)

c.write_text(t, encoding="utf-8")
print("caja:", "pendientes" in t)
