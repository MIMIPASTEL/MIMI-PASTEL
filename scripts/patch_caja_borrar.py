from pathlib import Path

p = Path("app/caja/page.tsx")
s = p.read_text(encoding="utf-8")
orig = s

# funcion para eliminar
ancla = "  const catsTipo = cats.filter((c) => c.tipo === tipo);"
funcion = """  async function eliminar(m: Mov) {
    if (!confirm(`Eliminar ${m.tipo} de ${soles(Number(m.monto))} (${m.concepto ?? nombreCat(m.categoria_codigo)})?`)) return;
    const { error } = await supabase.from("movimientos_caja").delete().eq("id", m.id);
    if (error) return setErr(error.message);
    setMsg("Movimiento eliminado.");
    cargar();
  }

""" + ancla
s = s.replace(ancla, funcion, 1)

# columna de accion
s = s.replace(
    "<tr><th>Fecha</th><th>Tipo</th><th>Categoría</th><th>Concepto</th><th className=\"num\">Monto</th></tr>",
    "<tr><th>Fecha</th><th>Tipo</th><th>Categoría</th><th>Concepto</th><th className=\"num\">Monto</th><th></th></tr>",
    1,
)

s = s.replace(
    """                    <td className="num" style={{ color: m.tipo === "ingreso" ? "var(--ok)" : "var(--danger)" }}>
                      {soles(Number(m.monto))}
                    </td>
                  </tr>""",
    """                    <td className="num" style={{ color: m.tipo === "ingreso" ? "var(--ok)" : "var(--danger)" }}>
                      {soles(Number(m.monto))}
                    </td>
                    <td className="num">
                      <button
                        type="button"
                        onClick={() => eliminar(m)}
                        title="Eliminar movimiento"
                        style={{ background: "none", border: 0, cursor: "pointer", color: "var(--danger)", fontWeight: 700 }}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>""",
    1,
)

p.write_text(s, encoding="utf-8")
print("ok:", "eliminar(m)" in s)
