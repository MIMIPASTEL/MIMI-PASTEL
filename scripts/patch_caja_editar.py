from pathlib import Path

p = Path("app/caja/page.tsx")
s = p.read_text(encoding="utf-8")
orig = s

# estado de edicion
s = s.replace(
    '  const [concepto, setConcepto] = useState("");',
    '  const [concepto, setConcepto] = useState("");\n  const [editandoId, setEditandoId] = useState<string | null>(null);',
    1,
)

# cargar datos en el formulario
ancla = "  async function registrar(e: React.FormEvent) {"
funcion = """  function editar(m: Mov) {
    setEditandoId(m.id);
    setFecha(m.fecha);
    setTipo(m.tipo);
    setCategoria(m.categoria_codigo);
    setMonto(String(Number(m.monto)));
    setMedio(m.medio);
    setConcepto(m.concepto ?? "");
    setMsg(null);
    setErr(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelarEdicion() {
    setEditandoId(null);
    setMonto("");
    setConcepto("");
  }

""" + ancla
s = s.replace(ancla, funcion, 1)

# insertar o actualizar
s = s.replace(
    """    const { error } = await supabase.from("movimientos_caja").insert({
      fecha,
      tipo,
      categoria_codigo: categoria,
      monto: valor,
      medio,
      concepto: concepto || null,
    });""",
    """    const datos = {
      fecha,
      tipo,
      categoria_codigo: categoria,
      monto: valor,
      medio,
      concepto: concepto || null,
    };

    const { error } = editandoId
      ? await supabase.from("movimientos_caja").update(datos).eq("id", editandoId)
      : await supabase.from("movimientos_caja").insert(datos);""",
    1,
)

s = s.replace(
    '    setMsg("Movimiento registrado.");',
    '    setMsg(editandoId ? "Movimiento actualizado." : "Movimiento registrado.");\n    setEditandoId(null);',
    1,
)

# titulo y boton
s = s.replace("<h2>Registrar movimiento</h2>", '<h2>{editandoId ? "Editar movimiento" : "Registrar movimiento"}</h2>', 1)
s = s.replace(
    '            {guardando ? "Guardando…" : "Registrar"}',
    '            {guardando ? "Guardando…" : editandoId ? "Guardar cambios" : "Registrar"}',
    1,
)
s = s.replace(
    """          <button className="btn btn-primary btn-block" disabled={guardando}>""",
    """          {editandoId && (
            <button type="button" className="btn btn-block" onClick={cancelarEdicion} style={{ marginBottom: 8 }}>
              Cancelar edición
            </button>
          )}
          <button className="btn btn-primary btn-block" disabled={guardando}>""",
    1,
)

# boton editar en la tabla
s = s.replace(
    """                      <button
                        type="button"
                        onClick={() => eliminar(m)}""",
    """                      <button
                        type="button"
                        onClick={() => editar(m)}
                        style={{ background: "none", border: 0, cursor: "pointer", color: "var(--brand)", fontWeight: 700, marginRight: 10 }}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => eliminar(m)}""",
    1,
)

p.write_text(s, encoding="utf-8")
print("ok:", "editandoId" in s and "editar(m)" in s)
