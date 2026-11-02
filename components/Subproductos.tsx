"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase, numero } from "@/lib/supabase";

const ITEMS = [
  { clave: "plancha_hojaldre", nombre: "Planchas de hojaldre", unidad: "planchas" },
  { clave: "masa_empanada", nombre: "Masa de empanada", unidad: "kg" },
  { clave: "relleno_carne", nombre: "Relleno de carne", unidad: "porciones" },
  { clave: "relleno_pollo", nombre: "Relleno de pollo", unidad: "porciones" },
  { clave: "conos_horneados", nombre: "Conos horneados", unidad: "unidades" },
  { clave: "plancha_pionono", nombre: "Plancha de pionono", unidad: "planchas" },
  { clave: "masa_queque", nombre: "Masa de queque", unidad: "molde" },
];

type Fila = { clave: string; producido: string; usado: string; merma: string };

export default function Subproductos({ fecha }: { fecha: string }) {
  const [filas, setFilas] = useState<Record<string, Fila>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    const { data } = await supabase
      .from("subproductos_dia")
      .select("clave, producido, usado, merma")
      .eq("fecha", fecha);

    const m: Record<string, Fila> = {};
    ITEMS.forEach((i) => {
      m[i.clave] = { clave: i.clave, producido: "", usado: "", merma: "" };
    });
    ((data ?? []) as any[]).forEach((x) => {
      m[x.clave] = {
        clave: x.clave,
        producido: String(Number(x.producido)),
        usado: String(Number(x.usado)),
        merma: String(Number(x.merma)),
      };
    });
    setFilas(m);
    setCargando(false);
  }, [fecha]);

  useEffect(() => {
    cargar();
  }, [fecha]);

  function set(clave: string, campo: keyof Fila, v: string) {
    setFilas((f) => ({ ...f, [clave]: { ...f[clave], [campo]: v } }));
  }

  async function guardar() {
    setErr(null);
    setMsg(null);
    setGuardando(true);

    const valores = Object.values(filas)
      .filter((f) => Number(f.producido || 0) || Number(f.usado || 0) || Number(f.merma || 0))
      .map((f) => ({
        fecha,
        clave: f.clave,
        producido: Number(f.producido || 0),
        usado: Number(f.usado || 0),
        merma: Number(f.merma || 0),
      }));

    const { error } = valores.length
      ? await supabase.from("subproductos_dia").upsert(valores, { onConflict: "fecha,clave" })
      : { error: null };

    setGuardando(false);
    if (error) return setErr(error.message);
    setMsg("Subproductos guardados.");
    cargar();
  }

  if (cargando) {
    return (
      <div className="card">
        <h2>Subproductos y transformación</h2>
        <p className="empty">Cargando…</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>Subproductos y transformación</h2>
      <p className="sub" style={{ marginTop: -6 }}>
        Planchas, masas y rellenos. Aquí se registra la merma que ocurre antes de armar el producto final.
      </p>

      {err && <div className="alert err">{err}</div>}
      {msg && <div className="alert ok">{msg}</div>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Subproducto</th>
              <th className="num">Producido</th>
              <th className="num">Usado</th>
              <th className="num">Merma</th>
              <th className="num">Queda</th>
            </tr>
          </thead>
          <tbody>
            {ITEMS.map((it) => {
              const f = filas[it.clave];
              const queda =
                Number(f?.producido || 0) - Number(f?.usado || 0) - Number(f?.merma || 0);
              return (
                <tr key={it.clave}>
                  <td>
                    <strong>{it.nombre}</strong>{" "}
                    <span className="sub" style={{ fontSize: 12 }}>({it.unidad})</span>
                  </td>
                  <td className="num">
                    <input
                      className="input num"
                      type="number"
                      min="0"
                      step="1"
                      style={{ width: 80 }}
                      value={f?.producido ?? ""}
                      onChange={(e) => set(it.clave, "producido", e.target.value)}
                    />
                  </td>
                  <td className="num">
                    <input
                      className="input num"
                      type="number"
                      min="0"
                      step="1"
                      style={{ width: 80 }}
                      value={f?.usado ?? ""}
                      onChange={(e) => set(it.clave, "usado", e.target.value)}
                    />
                  </td>
                  <td className="num">
                    <input
                      className="input num"
                      type="number"
                      min="0"
                      step="1"
                      style={{ width: 70 }}
                      value={f?.merma ?? ""}
                      onChange={(e) => set(it.clave, "merma", e.target.value)}
                    />
                  </td>
                  <td className="num" style={{ fontWeight: 700 }}>
                    {queda === 0 ? "0" : numero(queda)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <button className="btn btn-sm btn-primary" onClick={guardar} disabled={guardando} style={{ marginTop: 10 }}>
        {guardando ? "Guardando…" : "Guardar subproductos"}
      </button>

      <p className="sub" style={{ margin: "8px 4px 0", fontSize: 12 }}>
        Ejemplo milhojas: produces 12 planchas, usas 8 para armar y 1 se quemó → quedan 3 para mañana.
      </p>
    </div>
  );
}
