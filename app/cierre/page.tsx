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

  const cargar = useCallback(async () => {
    setCargando(true);
    const [pv, ci] = await Promise.all([
      supabase.from("puntos_venta").select("id, codigo, turno").eq("activo", true).order("orden"),
      supabase.from("v_cierre_turno").select("*").eq("fecha", fecha),
    ]);
    setPuntos((pv.data ?? []) as Punto[]);
    setFilas((ci.data ?? []) as Fila[]);
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
    </>
  );
}
