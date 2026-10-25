"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase, numero, soles } from "@/lib/supabase";

type Prod = { id: string; codigo?: string | null; nombre: string };

function restarDia(iso: string) {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() - 1);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export default function MermasResumen({
  fecha,
  productos,
}: {
  fecha: string;
  productos: Prod[];
}) {
  const ayer = restarDia(fecha);
  const [cant, setCant] = useState<Record<string, string>>({});
  const [sob, setSob] = useState<Record<string, number>>({});
  const [costos, setCostos] = useState<Record<string, number>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    const [hoy, ayerQ, lot] = await Promise.all([
      supabase.from("mermas").select("producto_id, cantidad").eq("fecha", fecha).eq("tipo", "produccion"),
      supabase.from("mermas").select("producto_id, cantidad").eq("fecha", ayer).eq("tipo", "devolucion"),
      supabase.from("lotes_produccion").select("producto_id, costo_unitario").order("fecha", { ascending: false }),
    ]);

    const c: Record<string, string> = {};
    ((hoy.data ?? []) as any[]).forEach((x) => {
      c[x.producto_id] = String(Number(x.cantidad));
    });
    setCant(c);

    const s: Record<string, number> = {};
    ((ayerQ.data ?? []) as any[]).forEach((x) => {
      s[x.producto_id] = (s[x.producto_id] ?? 0) + Number(x.cantidad);
    });
    setSob(s);

    const co: Record<string, number> = {};
    ((lot.data ?? []) as any[]).forEach((x) => {
      if (co[x.producto_id] === undefined) co[x.producto_id] = Number(x.costo_unitario ?? 0);
    });
    setCostos(co);
    setCargando(false);
  }, [fecha, ayer]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const de = (id: string) => Number(cant[id] || 0);
  const totalUnid = productos.reduce((a, p) => a + de(p.id) + (sob[p.id] ?? 0), 0);
  const totalSoles = productos.reduce(
    (a, p) => a + (de(p.id) + (sob[p.id] ?? 0)) * (costos[p.id] ?? 0),
    0,
  );

  const visibles = productos.filter((p) => de(p.id) > 0 || (sob[p.id] ?? 0) > 0);

  async function guardar() {
    setErr(null);
    setMsg(null);
    setGuardando(true);

    for (const p of productos) {
      await supabase.from("mermas").delete().eq("fecha", fecha).eq("producto_id", p.id).eq("tipo", "produccion");
      const q = de(p.id);
      if (q > 0) {
        await supabase.from("mermas").insert({
          fecha,
          producto_id: p.id,
          cantidad: q,
          tipo: "produccion",
          motivo: "otro",
          nota: "Merma registrada del día",
        });
      }
    }

    setGuardando(false);
    setMsg("Mermas guardadas.");
    cargar();
  }

  return (
    <div className="card">
      <div className="row" style={{ marginBottom: 10 }}>
        <h2 style={{ margin: 0 }}>4 · Mermas del día</h2>
        <button className="btn btn-sm" onClick={cargar} type="button">
          Actualizar
        </button>
      </div>
      <p className="sub" style={{ marginTop: -6 }}>
        Escribe las unidades rotas o quemadas de hoy. La merma de sobrante se calcula sola al revisar
        los sobrantes de ayer.
      </p>

      {err && <div className="alert err">{err}</div>}
      {msg && <div className="alert ok">{msg}</div>}

      {cargando ? (
        <p className="empty">Cargando…</p>
      ) : (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th className="num">Merma de sobrante</th>
                  <th className="num">Merma de producción</th>
                  <th className="num">Total unid.</th>
                  <th className="num">Costo unit.</th>
                  <th className="num">Pérdida</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((p) => {
                  const a = de(p.id);
                  const b = sob[p.id] ?? 0;
                  const cu = costos[p.id] ?? 0;
                  return (
                    <tr key={p.id}>
                      <td><strong>{p.codigo ?? p.nombre}</strong></td>
                      <td className="num">{b ? numero(b) : ""}</td>
                      <td className="num">
                        <input
                          className="input num"
                          type="number"
                          min="0"
                          step="1"
                          value={cant[p.id] ?? ""}
                          onChange={(e) => setCant((c) => ({ ...c, [p.id]: e.target.value }))}
                          style={{ width: 76, padding: "6px 8px" }}
                        />
                      </td>
                      <td className="num">{numero(a + b) || ""}</td>
                      <td className="num">{cu ? soles(cu) : "—"}</td>
                      <td className="num">{cu ? soles((a + b) * cu) : "—"}</td>
                    </tr>
                  );
                })}
                <tr>
                  <td colSpan={3}><strong>Total</strong></td>
                  <td className="num"><strong>{numero(totalUnid)}</strong></td>
                  <td className="num"></td>
                  <td className="num"><strong>{soles(totalSoles)}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>

          {visibles.length === 0 && (
            <p className="sub" style={{ marginTop: 10 }}>
              Aún no hay mermas. Escribe las unidades en la tabla cuando ocurran — o espera a que se
              revisen los sobrantes de ayer.
            </p>
          )}

          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={guardar} disabled={guardando}>
            {guardando ? "Guardando…" : "Guardar mermas"}
          </button>
        </>
      )}
    </div>
  );
}
