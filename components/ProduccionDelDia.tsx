"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase, numero } from "@/lib/supabase";

type Prod = { id: string; codigo?: string | null; nombre: string };
type Fila = {
  producto_id: string;
  programado: number;
  sobrante: number;
  producido: number;
  enviado: number;
};

export default function ProduccionDelDia({
  fecha,
  productos,
}: {
  fecha: string;
  productos: Prod[];
}) {
  const [filas, setFilas] = useState<Fila[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    const [req, sug, lot, des] = await Promise.all([
      supabase
        .from("requerimientos")
        .select("id, requerimiento_items(producto_id, cantidad)")
        .eq("fecha", fecha)
        .maybeSingle(),
      supabase.from("v_sugerido_produccion").select("producto_id, sobrante_ayer").eq("fecha", fecha),
      supabase.from("lotes_produccion").select("producto_id, cantidad_producida").eq("fecha", fecha),
      supabase.from("despachos").select("id, despacho_items(producto_id, cantidad_enviada)").eq("fecha", fecha),
    ]);

    const m: Record<string, Fila> = {};
    const fila = (id: string): Fila => {
      if (!m[id]) m[id] = { producto_id: id, programado: 0, sobrante: 0, producido: 0, enviado: 0 };
      return m[id];
    };

    ((req.data?.requerimiento_items ?? []) as any[]).forEach((i) => {
      if (i.producto_id) fila(i.producto_id).programado += Number(i.cantidad);
    });
    ((sug.data ?? []) as any[]).forEach((i) => {
      fila(i.producto_id).sobrante += Number(i.sobrante_ayer);
    });
    ((lot.data ?? []) as any[]).forEach((i) => {
      fila(i.producto_id).producido += Number(i.cantidad_producida);
    });
    ((des.data ?? []) as any[]).forEach((d) => {
      (d.despacho_items ?? []).forEach((i: any) => {
        fila(i.producto_id).enviado += Number(i.cantidad_enviada);
      });
    });

    setFilas(Object.values(m).filter((f) => f.programado > 0 || f.producido > 0 || f.enviado > 0));
    setCargando(false);
  }, [fecha]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const nombre = (id: string) => productos.find((p) => p.id === id)?.codigo ?? productos.find((p) => p.id === id)?.nombre ?? "—";

  const aProducir = (f: Fila) => Math.max(0, f.programado - f.sobrante);

  const total = (fn: (f: Fila) => number) => filas.reduce((a, f) => a + fn(f), 0);

  return (
    <div className="card">
      <div className="row" style={{ marginBottom: 10 }}>
        <h2 style={{ margin: 0 }}>Producción del día por producto</h2>
        <button className="btn btn-sm" onClick={cargar} type="button">
          Actualizar
        </button>
      </div>
      <p className="sub" style={{ marginTop: -6 }}>
        Lo programado menos el sobrante útil es lo que hay que hornear.
      </p>

      {cargando ? (
        <p className="empty">Cargando…</p>
      ) : filas.length === 0 ? (
        <p className="empty">Sin programación ni lotes registrados para esta fecha.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th className="num">Programado</th>
                <th className="num">Sobrante</th>
                <th className="num">A producir</th>
                <th className="num">Producido</th>
                <th className="num">Enviado</th>
                <th className="num">Falta</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => {
                const falta = aProducir(f) - f.producido;
                return (
                  <tr key={f.producto_id}>
                    <td><strong>{nombre(f.producto_id)}</strong></td>
                    <td className="num">{numero(f.programado)}</td>
                    <td className="num" style={{ color: f.sobrante > 0 ? "var(--ok)" : "var(--muted)" }}>
                      {f.sobrante > 0 ? "−" + numero(f.sobrante) : ""}
                    </td>
                    <td className="num"><strong>{numero(aProducir(f))}</strong></td>
                    <td className="num">{f.producido > 0 ? numero(f.producido) : ""}</td>
                    <td className="num">{f.enviado > 0 ? numero(f.enviado) : ""}</td>
                    <td className="num">
                      {f.producido === 0 && f.enviado === 0 ? (
                        ""
                      ) : (
                        <span className={`badge ${falta <= 0 ? "ok" : "warn"}`}>
                          {falta <= 0 ? "cubierto" : numero(falta)}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              <tr>
                <td><strong>Total</strong></td>
                <td className="num">{numero(total((f) => f.programado))}</td>
                <td className="num">{numero(total((f) => f.sobrante))}</td>
                <td className="num"><strong>{numero(total(aProducir))}</strong></td>
                <td className="num">{numero(total((f) => f.producido))}</td>
                <td className="num">{numero(total((f) => f.enviado))}</td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
