"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Shell from "@/components/Shell";
import { supabase, hoyISO, soles, numero, fechaCorta } from "@/lib/supabase";

type Punto = { id: string; codigo: string; turno: number | null };
type Fila = {
  punto_venta_id: string;
  enviado: number;
  vendido: number;
  sobrante_ayer: number;
  sobrante: number;
  merma: number;
  dif_unidades: number;
  venta_bruta: number;
  descuento: number;
  venta_neta: number;
  yape: number;
  transferencia: number;
  efectivo: number;
  gastos: number;
  efectivo_a_entregar: number;
  dif_dinero: number;
};

export default function CierrePage() {
  return (
    <Shell>
      <Contenido />
    </Shell>
  );
}

function Contenido() {
  const [fecha, setFecha] = useState(hoyISO());
  const [puntos, setPuntos] = useState<Punto[]>([]);
  const [filas, setFilas] = useState<Fila[]>([]);
  const [cargando, setCargando] = useState(true);
  const [sobrantesDia, setSobrantesDia] = useState<any[]>([]);
  const [prodNombres, setProdNombres] = useState<Record<string, string>>({});
  const [resumen, setResumen] = useState<any[]>([]);

  const cargar = useCallback(async () => {
    setCargando(true);
    const [pv, ci, sb, pr] = await Promise.all([
      supabase.from("puntos_venta").select("id, codigo, turno").eq("activo", true).order("orden"),
      supabase.from("v_cierre_turno").select("*").eq("fecha", fecha),
      supabase
        .from("sobrantes")
        .select("punto_venta_id, producto_id, cantidad, cantidad_reutilizable, creado_en")
        .eq("fecha", fecha),
      supabase.from("productos").select("id, codigo"),
    ]);
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

    setPuntos((pv.data ?? []) as Punto[]);
    setFilas((ci.data ?? []) as Fila[]);
    setSobrantesDia((sb.data ?? []) as any[]);
    const pn: Record<string, string> = {};
    ((pr.data ?? []) as any[]).forEach((x) => {
      pn[x.id] = x.codigo ?? "";
    });
    setProdNombres(pn);
    setCargando(false);
  }, [fecha]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const nombre = (id: string) => puntos.find((p) => p.id === id)?.codigo ?? "—";

  const conMovimiento = useMemo(
    () =>
      filas
        .filter(
          (f) =>
            Number(f.enviado) > 0 ||
            Number(f.vendido) > 0 ||
            Number(f.venta_neta) > 0 ||
            Number(f.sobrante) > 0 ||
            Number(f.merma) > 0,
        )
        .sort((a, b) => nombre(a.punto_venta_id).localeCompare(nombre(b.punto_venta_id))),
    [filas, puntos],
  );

  const total = (campo: keyof Fila) =>
    conMovimiento.reduce((a, f) => a + Number(f[campo] ?? 0), 0);

  function estado(f: Fila) {
    const du = Math.abs(Number(f.dif_unidades));
    const dd = Math.abs(Number(f.dif_dinero));
    if (du < 0.01 && dd < 0.01) return <span className="badge ok">cuadrado</span>;
    if (du <= 2 && dd <= 5) return <span className="badge warn">revisar</span>;
    return <span className="badge danger">descuadre</span>;
  }

  return (
    <>
      <h1>Cierre y conciliación</h1>
      <p className="sub">Unidades enviadas, vendidas y dinero, turno por turno</p>

      <div className="card">
        <label className="f">Fecha</label>
        <input
          className="input"
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          style={{ maxWidth: 200 }}
        />
      </div>

      <div className="grid grid-3" style={{ marginBottom: 14 }}>
        <div className="kpi">
          <div className="label">Enviado</div>
          <div className="value">{numero(total("enviado"))}</div>
          <div className="hint">unidades despachadas</div>
        </div>
        <div className="kpi">
          <div className="label">Vendido</div>
          <div className="value">{numero(total("vendido"))}</div>
          <div className="hint">sobrante {numero(total("sobrante"))} · merma {numero(total("merma"))}</div>
        </div>
        <div className="kpi accent">
          <div className="label">Efectivo a entregar</div>
          <div className="value">{soles(total("efectivo_a_entregar"))}</div>
          <div className="hint">después de gastos {soles(total("gastos"))}</div>
        </div>
      </div>

      <div className="card">
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

      <div className="card">
        <h2>Detalle por punto · {fechaCorta(fecha)}</h2>

        {cargando ? (
          <p className="empty">Cargando…</p>
        ) : conMovimiento.length === 0 ? (
          <p className="empty">Sin movimientos registrados en esta fecha.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Punto</th>
                  <th className="num">Enviado</th>
                  <th className="num">Vendido</th>
                  <th className="num">Sobró</th>
                  <th className="num">Merma</th>
                  <th className="num">Dif. unid.</th>
                  <th className="num">Venta neta</th>
                  <th className="num">Cobrado</th>
                  <th className="num">Gastos</th>
                  <th className="num">A entregar</th>
                  <th className="num">Dif. S/</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {conMovimiento.map((f) => (
                  <tr key={f.punto_venta_id}>
                    <td><strong>{nombre(f.punto_venta_id)}</strong></td>
                    <td className="num">{numero(f.enviado)}</td>
                    <td className="num">{numero(f.vendido)}</td>
                    <td className="num">{numero(f.sobrante)}</td>
                    <td className="num">{numero(f.merma)}</td>
                    <td className="num">
                      <span className={`badge ${Math.abs(Number(f.dif_unidades)) < 0.01 ? "ok" : "danger"}`}>
                        {numero(f.dif_unidades)}
                      </span>
                    </td>
                    <td className="num">{soles(f.venta_neta)}</td>
                    <td className="num">{soles(Number(f.efectivo) + Number(f.yape) + Number(f.transferencia))}</td>
                    <td className="num">{soles(f.gastos)}</td>
                    <td className="num">{soles(f.efectivo_a_entregar)}</td>
                    <td className="num">{soles(f.dif_dinero)}</td>
                    <td>{estado(f)}</td>
                  </tr>
                ))}
                <tr>
                  <td><strong>Total</strong></td>
                  <td className="num">{numero(total("enviado"))}</td>
                  <td className="num">{numero(total("vendido"))}</td>
                  <td className="num">{numero(total("sobrante"))}</td>
                  <td className="num">{numero(total("merma"))}</td>
                  <td className="num">{numero(total("dif_unidades"))}</td>
                  <td className="num">{soles(total("venta_neta"))}</td>
                  <td className="num">
                    {soles(total("efectivo") + total("yape") + total("transferencia"))}
                  </td>
                  <td className="num">{soles(total("gastos"))}</td>
                  <td className="num">{soles(total("efectivo_a_entregar"))}</td>
                  <td className="num">{soles(total("dif_dinero"))}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        <p className="sub" style={{ margin: "10px 4px 0" }}>
          Un turno está <strong>cuadrado</strong> cuando la diferencia de unidades y de dinero son cero.
          Si falta dinero o unidades, aparece en rojo.
        </p>
      </div>
      <div className="card">
        <h2>Sobrantes registrados · {fechaCorta(fecha)}</h2>
        <p className="sub" style={{ marginTop: -6 }}>
          Incluye la hora en que cada turno guardó sus sobrantes. Solo visible para administración.
        </p>

        {sobrantesDia.length === 0 ? (
          <p className="empty">Sin sobrantes registrados en esta fecha.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Hora</th>
                  <th>Punto</th>
                  <th>Producto</th>
                  <th className="num">Sobrante</th>
                  <th className="num">Reutilizable</th>
                </tr>
              </thead>
              <tbody>
                {sobrantesDia
                  .slice()
                  .sort((a, b) => String(a.creado_en).localeCompare(String(b.creado_en)))
                  .map((s2, i) => (
                    <tr key={i}>
                      <td>
                        {s2.creado_en
                          ? new Date(s2.creado_en).toLocaleTimeString("es-PE", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </td>
                      <td>{nombre(s2.punto_venta_id)}</td>
                      <td>{prodNombres[s2.producto_id] ?? "—"}</td>
                      <td className="num">{numero(s2.cantidad)}</td>
                      <td className="num">
                        {s2.cantidad_reutilizable === null ? "" : numero(s2.cantidad_reutilizable)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </>
  );
}
