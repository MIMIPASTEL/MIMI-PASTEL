"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase, numero } from "@/lib/supabase";

type Prod = { id: string; codigo?: string | null; nombre: string };
type Punto = { id: string; codigo: string };

type Fila = {
  id: string;
  punto_venta_id: string;
  producto_id: string;
  cantidad: number;
  reutilizable: string;
  dias: number;
  diasVida: number;
  descartar: boolean;
};

function restarDia(iso: string) {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() - 1);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export default function SobrantesRevision({
  fecha,
  productos,
  puntos,
  onSaved,
}: {
  fecha: string;
  productos: Prod[];
  puntos: Punto[];
  onSaved?: () => void;
}) {
  const ayer = restarDia(fecha);
  const [filas, setFilas] = useState<Fila[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    const [sob, prods, pts] = await Promise.all([
      supabase
        .from("sobrantes")
        .select("id, punto_venta_id, producto_id, cantidad, cantidad_reutilizable, lotes_produccion(fecha)")
        .eq("fecha", ayer),
      supabase.from("productos").select("id, dias_vida"),
      supabase.from("puntos_venta").select("id, codigo, turno, tipo").eq("tipo", "maxiahorro"),
    ]);

    const listaPuntos = ((pts.data ?? []) as any[]).filter((x) => x.tipo === "maxiahorro");
    const maxTurno = listaPuntos.reduce((a, x) => Math.max(a, Number(x.turno ?? 0)), 0);
    const ultimoPunto = listaPuntos.find((x) => Number(x.turno ?? 0) === maxTurno)?.id ?? null;

    const soloUltimo = ((sob.data ?? []) as any[]).filter(
      (x) => !ultimoPunto || x.punto_venta_id === ultimoPunto,
    );

    const vida: Record<string, number> = {};
    ((prods.data ?? []) as any[]).forEach((p) => {
      vida[p.id] = Number(p.dias_vida ?? 2);
    });

    const hoy = new Date(fecha + "T12:00:00").getTime();

    setFilas(
      soloUltimo.map((s) => {
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
  }, [ayer, fecha]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const nombreProd = (id: string) => productos.find((p) => p.id === id)?.codigo ?? productos.find((p) => p.id === id)?.nombre ?? "—";
  const nombrePunto = (id: string) => puntos.find((p) => p.id === id)?.codigo ?? "—";

  const totalSobrante = filas.reduce((a, f) => a + f.cantidad, 0);
  const totalReutiliza = filas.reduce((a, f) => a + Number(f.reutilizable || 0), 0);
  const totalMerma = Math.max(0, totalSobrante - totalReutiliza);

  function setReutiliza(id: string, v: string) {
    setFilas((fs) => fs.map((f) => (f.id === id ? { ...f, reutilizable: v } : f)));
  }

  async function guardar() {
    setErr(null);
    setMsg(null);
    setGuardando(true);

    for (const f of filas) {
      const reutiliza = f.descartar
        ? 0
        : Math.min(Math.max(Number(f.reutilizable || 0), 0), f.cantidad);
      const merma = Math.max(0, f.cantidad - reutiliza);

      await supabase.from("sobrantes").update({ cantidad_reutilizable: reutiliza }).eq("id", f.id);

      // se reemplaza la merma de esta revisión
      await supabase
        .from("mermas")
        .delete()
        .eq("fecha", ayer)
        .eq("punto_venta_id", f.punto_venta_id)
        .eq("producto_id", f.producto_id)
        .eq("tipo", "devolucion");

      if (merma > 0) {
        await supabase.from("mermas").insert({
          fecha: ayer,
          producto_id: f.producto_id,
          punto_venta_id: f.punto_venta_id,
          cantidad: merma,
          tipo: "devolucion",
          motivo: "roto",
          nota: "Merma detectada al revisar sobrantes",
        });
      }
    }

    setGuardando(false);
    setMsg("Revisión guardada: el sobrante útil ya alimenta la producción de hoy.");
    cargar();
    if (onSaved) onSaved();
  }

  if (filas.length === 0) {
    return (
      <div className="card">
        <h2>1 · Sobrantes de ayer</h2>
        <p className="empty">La vendedora no registró sobrantes para el {ayer}.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>1 · Sobrantes de ayer · ¿cuánto sirve?</h2>
      <p className="sub" style={{ marginTop: -6 }}>
        Revisa lo que devolvieron. Lo que no se pueda vender se registra como merma.
      </p>

      {err && <div className="alert err">{err}</div>}
      {msg && <div className="alert ok">{msg}</div>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Punto</th>
              <th>Producto</th>
              <th className="num">Sobrante</th>
              <th className="num">Se reutiliza</th>
              <th className="num">Se merma</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => {
              const reutiliza = Math.min(Math.max(Number(f.reutilizable || 0), 0), f.cantidad);
              const merma = Math.max(0, f.cantidad - reutiliza);
              return (
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
                  <td className="num">{numero(f.cantidad)}</td>
                  <td className="num">
                    <input
                      className="input num"
                      type="number"
                      min="0"
                      max={f.cantidad}
                      step="1"
                      value={f.descartar ? "0" : f.reutilizable}
                      onChange={(e) => setReutiliza(f.id, e.target.value)}
                      disabled={f.descartar}
                      style={{ width: 76, padding: "6px 8px" }}
                    />
                  </td>
                  <td className="num">
                    {merma > 0 ? <span className="badge danger">{numero(merma)}</span> : <span className="badge ok">0</span>}
                  </td>
                </tr>
              );
            })}
            <tr>
              <td colSpan={2}><strong>Total</strong></td>
              <td className="num">{numero(totalSobrante)}</td>
              <td className="num">{numero(totalReutiliza)}</td>
              <td className="num">{numero(totalMerma)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={guardar} disabled={guardando}>
        {guardando ? "Guardando…" : "Guardar revisión"}
      </button>
    </div>
  );
}
