from pathlib import Path

p = Path("components/SobrantesRevision.tsx")
s = p.read_text(encoding="utf-8")
orig = s

# tipo con edad
s = s.replace(
    """type Fila = {
  id: string;
  punto_venta_id: string;
  producto_id: string;
  cantidad: number;
  reutilizable: string;
};""",
    """type Fila = {
  id: string;
  punto_venta_id: string;
  producto_id: string;
  cantidad: number;
  reutilizable: string;
  dias: number;
  diasVida: number;
  descartar: boolean;
};""",
    1,
)

# carga con lote y vida util
viejo = """  const cargar = useCallback(async () => {
    const { data } = await supabase
      .from("sobrantes")
      .select("id, punto_venta_id, producto_id, cantidad, cantidad_reutilizable")
      .eq("fecha", ayer);
    setFilas(
      ((data ?? []) as any[]).map((s) => ({
        id: s.id,
        punto_venta_id: s.punto_venta_id,
        producto_id: s.producto_id,
        cantidad: Number(s.cantidad),
        reutilizable:
          s.cantidad_reutilizable === null ? String(Number(s.cantidad)) : String(Number(s.cantidad_reutilizable)),
      })),
    );
  }, [ayer]);"""

nuevo = """  const cargar = useCallback(async () => {
    const [sob, prods] = await Promise.all([
      supabase
        .from("sobrantes")
        .select("id, punto_venta_id, producto_id, cantidad, cantidad_reutilizable, lotes_produccion(fecha)")
        .eq("fecha", ayer),
      supabase.from("productos").select("id, dias_vida"),
    ]);

    const vida: Record<string, number> = {};
    ((prods.data ?? []) as any[]).forEach((p) => {
      vida[p.id] = Number(p.dias_vida ?? 2);
    });

    const hoy = new Date(fecha + "T12:00:00").getTime();

    setFilas(
      ((sob.data ?? []) as any[]).map((s) => {
        const fProd = s.lotes_produccion?.fecha;
        const dias = fProd
          ? Math.floor((hoy - new Date(fProd + "T12:00:00").getTime()) / 86400000)
          : 0;
        const diasVida = vida[s.producto_id] ?? 2;
        const descartar = dias >= diasVida;
        return {
          id: s.id,
          punto_venta_id: s.punto_venta_id,
          producto_id: s.producto_id,
          cantidad: Number(s.cantidad),
          reutilizable: descartar
            ? "0"
            : s.cantidad_reutilizable === null
              ? String(Number(s.cantidad))
              : String(Number(s.cantidad_reutilizable)),
          dias,
          diasVida,
          descartar,
        };
      }),
    );
  }, [ayer, fecha]);"""

if viejo not in s:
    raise SystemExit("no se encontro el bloque cargar")
s = s.replace(viejo, nuevo, 1)

# al guardar, si esta vencido no se reutiliza
s = s.replace(
    "      const reutiliza = Math.min(Math.max(Number(f.reutilizable || 0), 0), f.cantidad);",
    "      const reutiliza = f.descartar\n        ? 0\n        : Math.min(Math.max(Number(f.reutilizable || 0), 0), f.cantidad);",
    1,
)

# fila con aviso
s = s.replace(
    """              return (
                <tr key={f.id}>
                  <td>{nombrePunto(f.punto_venta_id)}</td>
                  <td>{nombreProd(f.producto_id)}</td>
                  <td className="num">{numero(f.cantidad)}</td>""",
    """              return (
                <tr key={f.id}>
                  <td>{nombrePunto(f.punto_venta_id)}</td>
                  <td>
                    {nombreProd(f.producto_id)}
                    {f.descartar && (
                      <div>
                        <span className="badge danger">descartar · {f.dias} días</span>
                      </div>
                    )}
                  </td>
                  <td className="num">{numero(f.cantidad)}</td>""",
    1,
)

s = s.replace(
    """                      value={f.reutilizable}
                      onChange={(e) => setReutiliza(f.id, e.target.value)}
                      style={{ width: 76, padding: "6px 8px" }}
                    />""",
    """                      value={f.descartar ? "0" : f.reutilizable}
                      onChange={(e) => setReutiliza(f.id, e.target.value)}
                      disabled={f.descartar}
                      style={{ width: 76, padding: "6px 8px" }}
                    />""",
    1,
)

p.write_text(s, encoding="utf-8")
print("ok:", s != orig, "| descartar:", "descartar" in s)
