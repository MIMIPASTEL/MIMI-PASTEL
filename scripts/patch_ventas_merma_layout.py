from pathlib import Path

p = Path("app/ventas/page.tsx")
s = p.read_text(encoding="utf-8")
orig = s

# ---------- 1. cargar mermas registradas ----------
viejo_q = """    const [pg, vt, mv] = await Promise.all([
      supabase.from("pagos").select("medio, monto").eq("fecha", fecha).eq("punto_venta_id", puntoId),"""
nuevo_q = """    const [pg, vt, mv, mr] = await Promise.all([
      supabase.from("pagos").select("medio, monto").eq("fecha", fecha).eq("punto_venta_id", puntoId),
      supabase.from("mermas").select("producto_id, cantidad").eq("fecha", fecha).eq("punto_venta_id", puntoId).eq("tipo", "vitrina"),"""
if viejo_q not in s:
    raise SystemExit("no se encontro el bloque de consultas")

# la consulta de ventas y movimientos se mantiene; insertamos mr al final
s = s.replace(
    """      supabase
        .from("movimientos_caja")
        .select("monto")
        .eq("fecha", fecha)
        .eq("punto_venta_id", puntoId)
        .eq("tipo", "salida"),
    ]);""",
    """      supabase
        .from("movimientos_caja")
        .select("monto")
        .eq("fecha", fecha)
        .eq("punto_venta_id", puntoId)
        .eq("tipo", "salida"),
      supabase
        .from("mermas")
        .select("producto_id, cantidad")
        .eq("fecha", fecha)
        .eq("punto_venta_id", puntoId)
        .eq("tipo", "vitrina"),
    ]);""",
    1,
)
s = s.replace("    const [pg, vt, mv] = await Promise.all([", "    const [pg, vt, mv, mr] = await Promise.all([", 1)

# mapa de mermas y uso en las filas
viejo_filas = """    setFilas(
      productos.map((p) => ({
        producto_id: p.id,
        codigo: p.codigo ?? p.nombre,
        inicial: inicial[p.id] ?? 0,
        enviado: enviado[p.id] ?? 0,"""
nuevo_filas = """    const mermaMap: Record<string, number> = {};
    ((mr.data ?? []) as any[]).forEach((m) => {
      mermaMap[m.producto_id] = (mermaMap[m.producto_id] ?? 0) + Number(m.cantidad);
    });

    setFilas(
      productos.map((p) => ({
        producto_id: p.id,
        codigo: p.codigo ?? p.nombre,
        inicial: inicial[p.id] ?? 0,
        enviado: enviado[p.id] ?? 0,"""
if viejo_filas not in s:
    raise SystemExit("no se encontro el setFilas")
s = s.replace(viejo_filas, nuevo_filas, 1)

s = s.replace(
    '        merma: "",',
    '        merma: mermaMap[p.id] !== undefined ? String(mermaMap[p.id]) : "",',
    1,
)

# ---------- 2. limpiar caja al cerrar turno ----------
viejo_fin = """    setGuardando(false);
    setMsg(
      `Turno cerrado · vendido"""
nuevo_fin = """    await cargar();
    setEfectivo("");
    setYape("");
    setTransferencia("");
    setGasto("");
    setPromoGrupos("");

    setGuardando(false);
    setMsg(
      `Turno cerrado · vendido"""
if viejo_fin not in s:
    raise SystemExit("no se encontro el cierre del turno")
s = s.replace(viejo_fin, nuevo_fin, 1)

# ---------- 3. alinear los inputs bajo sus titulos ----------
s = s.replace(
    """                          value={f.contado}
                          onChange={(e) => setCampo(i, "contado", e.target.value)}
                        />""",
    """                          value={f.contado}
                          onChange={(e) => setCampo(i, "contado", e.target.value)}
                          style={{ width: "100%", minWidth: 62 }}
                        />""",
    1,
)
s = s.replace(
    """                          value={f.merma}
                          onChange={(e) => setCampo(i, "merma", e.target.value)}
                        />""",
    """                          value={f.merma}
                          onChange={(e) => setCampo(i, "merma", e.target.value)}
                          style={{ width: "100%", minWidth: 58 }}
                        />""",
    1,
)
s = s.replace(
    """                          value={f.sobrante}
                          onChange={(e) => setCampo(i, "sobrante", e.target.value)}
                        />""",
    """                          value={f.sobrante}
                          onChange={(e) => setCampo(i, "sobrante", e.target.value)}
                          style={{ width: "100%", minWidth: 62 }}
                        />""",
    1,
)

p.write_text(s, encoding="utf-8")
print("ok:", s != orig)
print("mermas:", "mermaMap" in s, "| limpia:", 'setEfectivo("")' in s, "| ancho:", 'width: "100%"' in s)
