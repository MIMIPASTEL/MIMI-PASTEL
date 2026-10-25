from pathlib import Path

p = Path("app/ventas/page.tsx")
s = p.read_text(encoding="utf-8")
orig = s

# 1. inicial solo para el turno 2
viejo_ini = """    // inventario inicial: el sobrante del turno anterior
    let prevPunto: string | null = null;
    let prevFecha = fecha;
    if (punto?.punto_anterior_id) {
      prevPunto = punto.punto_anterior_id;
      prevFecha = fecha;
    } else {
      const sig = puntos.find((p) => p.punto_anterior_id === puntoId);
      prevPunto = sig?.id ?? null;
      prevFecha = restarDia(fecha);
    }"""
nuevo_ini = """    // Solo el turno 2 arrastra el sobrante del turno 1.
    // En el turno 1 el stock anterior ya viene incluido en el envío de producción.
    const prevPunto = punto?.punto_anterior_id ?? null;
    const prevFecha = fecha;"""
if viejo_ini not in s:
    raise SystemExit("no se encontro el bloque de inicial")
s = s.replace(viejo_ini, nuevo_ini, 1)

# 2. columna inicial condicional
viejo_th = """                  <th className="sticky" style={{ minWidth: 70 }}>Prod.</th>
                  <th className="num">Inicial</th>
                  <th className="num">Enviado</th>"""
nuevo_th = """                  <th className="sticky" style={{ minWidth: 70 }}>Prod.</th>
                  {tieneInicial && <th className="num">Inicial</th>}
                  <th className="num">Enviado</th>"""
if viejo_th not in s:
    raise SystemExit("no se encontro el encabezado")
s = s.replace(viejo_th, nuevo_th, 1)

viejo_td = """                      <td className="num" style={{ fontSize: 12.5 }}>{f.inicial || ""}</td>"""
nuevo_td = """                      {tieneInicial && (
                        <td className="num" style={{ fontSize: 12.5 }}>{f.inicial || ""}</td>
                      )}"""
if viejo_td not in s:
    raise SystemExit("no se encontro la celda inicial")
s = s.replace(viejo_td, nuevo_td, 1)

# 3. variable tieneInicial
s = s.replace(
    '  const puntoActual = puntos.find((p) => p.id === puntoId);',
    '  const puntoActual = puntos.find((p) => p.id === puntoId);\n  const tieneInicial = Boolean(puntoActual?.punto_anterior_id);',
    1,
)

# 4. separar el guardado de conteo
viejo_guardar = """  async function guardar() {
    setErr(null);
    setMsg(null);
    if (!puntoId) return;
    const faltanPrecios = filas.some((f) => vendido(f) > 0 && de(f, "precio") <= 0);
    if (faltanPrecios) return setErr("Hay productos vendidos sin precio.");

    setGuardando(true);"""

nuevo_guardar = """  // Guarda solo el conteo del turno: lo recibido, la merma y los sobrantes.
  async function guardarConteo(): Promise<boolean> {
    if (!puntoId) return false;
    const punto = puntos.find((p) => p.id === puntoId)!;
    const turno = punto.turno ?? 0;

    const { data: desp, error: e1 } = await supabase
      .from("despachos")
      .upsert(
        { fecha, punto_venta_id: puntoId, turno, estado: "recibido", recibido_por: perfil?.id, recibido_en: new Date().toISOString() },
        { onConflict: "fecha,punto_venta_id,turno" },
      )
      .select("id")
      .single();
    if (e1 || !desp) {
      setErr(e1?.message ?? "No se pudo guardar el conteo");
      return false;
    }

    const items = filas
      .filter((f) => f.enviado > 0 || f.contado !== "")
      .map((f) => ({
        despacho_id: desp.id,
        producto_id: f.producto_id,
        cantidad_enviada: f.enviado,
        cantidad_recibida: f.contado === "" ? null : Number(f.contado),
      }));
    if (items.length > 0) {
      const { error } = await supabase.from("despacho_items").upsert(items, { onConflict: "despacho_id,producto_id" });
      if (error) {
        setErr(error.message);
        return false;
      }
    }

    for (const f of filas) {
      if (f.sobrante === "") continue;
      const { error } = await supabase.from("sobrantes").upsert(
        {
          fecha,
          punto_venta_id: puntoId,
          producto_id: f.producto_id,
          cantidad: Number(f.sobrante),
          registrado_por: perfil?.id,
        },
        { onConflict: "fecha,punto_venta_id,producto_id" },
      );
      if (error) {
        setErr("Sobrante: " + error.message);
        return false;
      }
    }

    for (const f of filas) {
      await supabase
        .from("mermas")
        .delete()
        .eq("fecha", fecha)
        .eq("producto_id", f.producto_id)
        .eq("punto_venta_id", puntoId)
        .eq("tipo", "vitrina");
    }
    const mermas = filas.filter((f) => de(f, "merma") > 0);
    if (mermas.length > 0) {
      const { error } = await supabase.from("mermas").insert(
        mermas.map((f) => ({
          fecha,
          producto_id: f.producto_id,
          punto_venta_id: puntoId,
          cantidad: de(f, "merma"),
          tipo: "vitrina",
          motivo: "roto",
          usuario_id: perfil?.id,
        })),
      );
      if (error) {
        setErr("Merma: " + error.message);
        return false;
      }
    }

    return true;
  }

  async function soloConteo() {
    setErr(null);
    setMsg(null);
    setGuardando(true);
    const ok = await guardarConteo();
    setGuardando(false);
    if (ok) {
      setMsg("Conteo guardado. Puedes cerrar el turno cuando termines de vender.");
      cargar();
    }
  }

  async function guardar() {
    setErr(null);
    setMsg(null);
    if (!puntoId) return;
    const faltanPrecios = filas.some((f) => vendido(f) > 0 && de(f, "precio") <= 0);
    if (faltanPrecios) return setErr("Hay productos vendidos sin precio.");

    setGuardando(true);"""

if viejo_guardar not in s:
    raise SystemExit("no se encontro el inicio de guardar")
s = s.replace(viejo_guardar, nuevo_guardar, 1)

p.write_text(s, encoding="utf-8")
print("ok:", s != orig, "| tieneInicial:", "tieneInicial" in s, "| soloConteo:", "soloConteo" in s)
