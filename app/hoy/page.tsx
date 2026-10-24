"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Shell from "@/components/Shell";
import { supabase, hoyISO, soles, numero, fechaCorta } from "@/lib/supabase";

type Fila = Record<string, any>;

export default function HoyPage() {
  return (
    <Shell>
      <Contenido />
    </Shell>
  );
}

function Contenido() {
  const hoy = hoyISO();
  const [utilidad, setUtilidad] = useState<Fila | null>(null);
  const [canales, setCanales] = useState<Fila[]>([]);
  const [cuadre, setCuadre] = useState<Fila[]>([]);
  const [pedidos, setPedidos] = useState<Fila[]>([]);
  const [caja, setCaja] = useState<{ ing: number; sal: number }>({ ing: 0, sal: 0 });
  const [costos, setCostos] = useState<any>(null);
  const [nombres, setNombres] = useState<Record<string, string>>({});
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    (async () => {
      const [prod, pv] = await Promise.all([
        supabase.from("productos").select("id, nombre"),
        supabase.from("puntos_venta").select("id, codigo, nombre"),
      ]);
      const map: Record<string, string> = {};
      (prod.data ?? []).forEach((p: any) => (map[p.id] = p.nombre));
      (pv.data ?? []).forEach((p: any) => (map[p.id] = p.codigo));
      setNombres(map);

      const [u, c, q, pe, mv, co] = await Promise.all([
        supabase.from("v_utilidad_dia").select("*").eq("fecha", hoy).maybeSingle(),
        supabase.from("v_ventas_por_canal").select("*").eq("fecha", hoy),
        supabase.from("v_cuadre_unidades").select("*").eq("fecha", hoy).neq("diferencia", 0),
        supabase
          .from("pedidos")
          .select("id, cliente, fecha_entrega, hora_entrega, estado, adelanto")
          .lte("fecha_entrega", hoy)
          .not("estado", "in", "(entregado,cancelado)")
          .order("fecha_entrega"),
        supabase.from("movimientos_caja").select("tipo, monto").eq("fecha", hoy),
        supabase.from("v_costos_dia").select("*").eq("fecha", hoy).maybeSingle(),
      ]);

      setUtilidad(u.data ?? null);
      setCanales((c.data ?? []) as Fila[]);
      setCuadre((q.data ?? []) as Fila[]);
      setPedidos((pe.data ?? []) as Fila[]);

      const ing = (mv.data ?? []).filter((m: any) => m.tipo === "ingreso").reduce((a: number, m: any) => a + Number(m.monto), 0);
      const sal = (mv.data ?? []).filter((m: any) => m.tipo === "salida").reduce((a: number, m: any) => a + Number(m.monto), 0);
      setCaja({ ing, sal });
      setCostos(co.data ?? null);
      setCargando(false);
    })();
  }, [hoy]);

  const ventas = Number(utilidad?.ventas ?? 0);
  const util = Number(utilidad?.utilidad ?? 0);
  const margen = ventas > 0 ? (util / ventas) * 100 : 0;

  const diferenciaTotal = useMemo(
    () => cuadre.reduce((a, f) => a + Math.abs(Number(f.diferencia)), 0),
    [cuadre],
  );

  return (
    <>
      <h1>Hoy</h1>
      <p className="sub">{fechaCorta(hoy)} · resumen de la operación</p>

      <div className="grid grid-3" style={{ marginBottom: 14 }}>
        <div className="kpi accent">
          <div className="label">Utilidad del día</div>
          <div className="value">{soles(util)}</div>
          <div className="hint">
            {ventas > 0 ? `margen ${margen.toFixed(1)}%` : "sin ventas registradas"}
          </div>
        </div>
        <div className="kpi">
          <div className="label">Ventas</div>
          <div className="value">{soles(ventas)}</div>
          <div className="hint">costo {soles(utilidad?.costo_ventas)}</div>
        </div>
        <div className="kpi">
          <div className="label">Caja</div>
          <div className="value">{soles(caja.ing - caja.sal)}</div>
          <div className="hint">
            ingresos {soles(caja.ing)} · salidas {soles(caja.sal)}
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Costos del día</h2>
        <div className="grid grid-4">
          <div className="kpi">
            <div className="label">Producido</div>
            <div className="value" style={{ fontSize: 19 }}>{soles(costos?.costo_produccion)}</div>
            <div className="hint">{numero(costos?.unidades_producidas)} unid.</div>
          </div>
          <div className="kpi">
            <div className="label">Costo de ventas</div>
            <div className="value" style={{ fontSize: 19 }}>{soles(costos?.costo_ventas)}</div>
            <div className="hint">{numero(costos?.unidades_vendidas)} unid. vendidas</div>
          </div>
          <div className="kpi">
            <div className="label">Sobrante a mañana</div>
            <div className="value" style={{ fontSize: 19 }}>{soles(costos?.valor_sobrante_hoy)}</div>
            <div className="hint">{numero(costos?.unidades_sobrante_hoy)} unid. (inventario)</div>
          </div>
          <div className="kpi">
            <div className="label">Merma</div>
            <div className="value" style={{ fontSize: 19 }}>{soles(costos?.valor_merma)}</div>
            <div className="hint">{numero(costos?.unidades_merma)} unid.</div>
          </div>
        </div>
        <p className="sub" style={{ margin: "10px 0 0" }}>
          Producir no es gastar: lo que no se vende queda como inventario y se costea cuando sale.
          {Number(costos?.valor_sobrante_ayer ?? 0) > 0
            ? ` Hoy entraron ${soles(costos?.valor_sobrante_ayer)} de sobrante de ayer.`
            : ""}
        </p>
      </div>

      <div className="card">
        <h2>Ventas por canal</h2>
        {canales.length === 0 ? (
          <p className="empty">Todavía no hay ventas registradas hoy.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Canal</th>
                  <th className="num">Tickets</th>
                  <th className="num">Unidades</th>
                  <th className="num">Total</th>
                </tr>
              </thead>
              <tbody>
                {canales.map((c) => (
                  <tr key={c.punto_venta_id}>
                    <td>{c.punto_venta}</td>
                    <td className="num">{numero(c.tickets)}</td>
                    <td className="num">{numero(c.unidades)}</td>
                    <td className="num">{soles(c.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <div className="row" style={{ marginBottom: 10 }}>
          <h2 style={{ margin: 0 }}>Diferencias de cuadre</h2>
          {diferenciaTotal > 0 ? (
            <span className="badge danger">{numero(diferenciaTotal)} unid.</span>
          ) : (
            <span className="badge ok">todo cuadra</span>
          )}
        </div>
        {cuadre.length === 0 ? (
          <p className="empty">Sin diferencias registradas hoy.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Punto</th>
                  <th className="num">Enviado</th>
                  <th className="num">Vendido</th>
                  <th className="num">Merma</th>
                  <th className="num">Diferencia</th>
                </tr>
              </thead>
              <tbody>
                {cuadre.map((f, i) => (
                  <tr key={i}>
                    <td>{nombres[f.producto_id] ?? "—"}</td>
                    <td>{nombres[f.punto_venta_id] ?? "—"}</td>
                    <td className="num">{numero(f.enviado)}</td>
                    <td className="num">{numero(f.vendido)}</td>
                    <td className="num">{numero(f.merma)}</td>
                    <td className="num">
                      <span className={`badge ${Number(f.diferencia) > 0 ? "danger" : "warn"}`}>
                        {Number(f.diferencia) > 0 ? "+" : ""}
                        {numero(f.diferencia)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <div className="row" style={{ marginBottom: 10 }}>
          <h2 style={{ margin: 0 }}>Pedidos por entregar</h2>
          <Link className="btn btn-sm" href="/pedidos">
            Ver todos
          </Link>
        </div>
        {pedidos.length === 0 ? (
          <p className="empty">No hay pedidos pendientes.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Entrega</th>
                  <th>Estado</th>
                  <th className="num">Adelanto</th>
                </tr>
              </thead>
              <tbody>
                {pedidos.map((p) => (
                  <tr key={p.id}>
                    <td>{p.cliente}</td>
                    <td>
                      {fechaCorta(p.fecha_entrega)}
                      {p.hora_entrega ? ` · ${String(p.hora_entrega).slice(0, 5)}` : ""}
                    </td>
                    <td>
                      <span className="badge neutral">{p.estado.replace("_", " ")}</span>
                    </td>
                    <td className="num">{soles(p.adelanto)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {cargando && <p className="sub">Cargando…</p>}
    </>
  );
}
