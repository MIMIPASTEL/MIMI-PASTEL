from pathlib import Path

# ---------- 1. parrilla: solo sobrantes del ultimo punto ----------
p = Path("components/ParrillaPrograma.tsx")
s = p.read_text(encoding="utf-8")
orig = s

s = s.replace(
    'supabase.from("sobrantes").select("producto_id, cantidad, cantidad_reutilizable").eq("fecha", restarDia(fecha)),',
    'supabase.from("sobrantes").select("producto_id, punto_venta_id, cantidad, cantidad_reutilizable").eq("fecha", restarDia(fecha)),',
    1,
)

s = s.replace(
    """    const sm: Record<string, number> = {};
    ((sug.data ?? []) as any[]).forEach((x) => {""",
    """    const { data: pts } = await supabase
      .from("puntos_venta")
      .select("id, turno, tipo")
      .eq("tipo", "maxiahorro");
    const maxTurno = ((pts ?? []) as any[]).reduce((a, x) => Math.max(a, Number(x.turno ?? 0)), 0);
    const ultimo = ((pts ?? []) as any[]).find((x) => Number(x.turno ?? 0) === maxTurno)?.id ?? null;

    const sm: Record<string, number> = {};
    ((sug.data ?? []) as any[]).forEach((x) => {
      if (ultimo && x.punto_venta_id !== ultimo) return;""",
    1,
)

p.write_text(s, encoding="utf-8")
print("parrilla:", "ultimo" in s)

# ---------- 2. entregas de hoy: boton editar ----------
q = Path("app/pedidos/page.tsx")
t = q.read_text(encoding="utf-8")
orig2 = t

if "setEditando(p)" in t and "Entregas de hoy" in t:
    # agregar boton dentro del panel de entregas
    t = t.replace(
        """                <CobroPedido pedidoId={p.id} totalPedido={total} onSaved={cargar} />""",
        """                <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                  <button className="btn btn-sm" onClick={() => setEditando(p)}>
                    Editar pedido
                  </button>
                </div>
                <CobroPedido pedidoId={p.id} totalPedido={total} onSaved={cargar} />""",
        1,
    )

q.write_text(t, encoding="utf-8")
print("pedidos:", "Editar pedido" in t)
