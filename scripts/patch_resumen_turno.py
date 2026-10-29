from pathlib import Path

p = Path("app/cierre/page.tsx")
s = p.read_text(encoding="utf-8")
orig = s

# estado
s = s.replace(
    "  const [prodNombres, setProdNombres] = useState<Record<string, string>>({});",
    "  const [prodNombres, setProdNombres] = useState<Record<string, string>>({});\n  const [resumen, setResumen] = useState<any[]>([]);",
    1,
)

# carga del resumen
ancla = "  const cargar = useCallback(async () => {"
if ancla in s:
    pass

# insertar tras el Promise.all existente: buscar "const ["
i = s.find(".from(\"v_cierre_turno\")")
j = s.find("]);", i)
bloque = """
    // resumen por turno: disponible, vendido, sobrante, merma
    const [desp, vts, sob, mer, pvs] = await Promise.all([
      supabase.from("despachos").select("punto_venta_id, turno, despacho_items(cantidad_enviada, cantidad_recibida)").eq("fecha", fecha),
      supabase.from("ventas").select("punto_venta_id, turno, venta_items(cantidad)").eq("fecha", fecha),
      supabase.from("sobrantes").select("punto_venta_id, cantidad").eq("fecha", fecha),
      supabase.from("mermas").select("punto_venta_id, cantidad").eq("fecha", fecha),
      supabase.from("puntos_venta").select("id, codigo, turno"),
    ]);

    const acum: Record<string, any> = {};
    const criterio = (punto: string | null, turno: any) => `${punto}|${turno ?? ""}`;

    ((desp.data ?? []) as any[]).forEach((d) => {
      const k = criterio(d.punto_venta_id, d.turno);
      acum[k] = acum[k] ?? { punto: d.punto_venta_id, turno: d.turno, disponible: 0, vendido: 0, sobrante: 0, merma: 0 };
      ((d.despacho_items ?? []) as any[]).forEach((it) => {
        acum[k].disponible += Number(it.cantidad_recibida ?? it.cantidad_enviada ?? 0);
      });
    });

    ((vts.data ?? []) as any[]).forEach((v) => {
      const k = criterio(v.punto_venta_id, v.turno);
      acum[k] = acum[k] ?? { punto: v.punto_venta_id, turno: v.turno, disponible: 0, vendido: 0, sobrante: 0, merma: 0 };
      ((v.venta_items ?? []) as any[]).forEach((it) => {
        acum[k].vendido += Number(it.cantidad);
      });
    });

    ((sob.data ?? []) as any[]).forEach((x) => {
      Object.keys(acum).forEach((k) => {
        if (acum[k].punto === x.punto_venta_id) acum[k].sobrante += Number(x.cantidad);
      });
    });

    ((mer.data ?? []) as any[]).forEach((x) => {
      Object.keys(acum).forEach((k) => {
        if (acum[k].punto === x.punto_venta_id) acum[k].merma += Number(x.cantidad);
      });
    });

    const nombres: Record<string, string> = {};
    ((pvs.data ?? []) as any[]).forEach((x) => (nombres[x.id] = x.codigo));

    setResumen(
      Object.values(acum).map((r: any) => ({ ...r, codigo: nombres[r.punto] ?? "—" })),
    );
"""
if i > 0 and j > i:
    s = s[:j + 3] + bloque + s[j + 3:]

# tarjeta antes de "Detalle por punto"
ancla2 = s.find("<h2>Detalle por punto")
ini_card = s.rfind("<div className=\"card\">", 0, ancla2)
tarjeta = '''<div className="card">
        <h2>Resumen por turno · {fechaCorta(fecha)}</h2>
        {resumen.length === 0 ? (
          <p className="empty">Sin datos de turnos para esta fecha.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Punto</th>
                  <th>Turno</th>
                  <th className="num">Disponible</th>
                  <th className="num">Vendido</th>
                  <th className="num">Sobrante</th>
                  <th className="num">Merma</th>
                </tr>
              </thead>
              <tbody>
                {resumen
                  .sort((a: any, b: any) => String(a.codigo).localeCompare(String(b.codigo)))
                  .map((r: any, i: number) => (
                    <tr key={i}>
                      <td><strong>{r.codigo}</strong></td>
                      <td>{r.turno ?? "—"}</td>
                      <td className="num">{numero(r.disponible)}</td>
                      <td className="num">{numero(r.vendido)}</td>
                      <td className="num">{numero(r.sobrante)}</td>
                      <td className="num">{numero(r.merma)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="sub" style={{ margin: "10px 4px 0", fontSize: 12 }}>
          Disponible = lo contado al recibir. Vendido = unidades cobradas. Sobrante y merma del cierre.
        </p>
      </div>

      '''
if ini_card > 0 and "Resumen por turno" not in s:
    s = s[:ini_card] + tarjeta + s[ini_card:]

p.write_text(s, encoding="utf-8")
print("ok:", "Resumen por turno" in s, "| numero:", "numero(" in s)
