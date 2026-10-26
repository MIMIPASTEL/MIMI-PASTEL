"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Shell from "@/components/Shell";
import { supabase, soles, hoyISO } from "@/lib/supabase";

type Mov = {
  id: string;
  fecha: string;
  tipo: string;
  categoria_codigo: string;
  monto: number;
  medio: string;
  concepto: string | null;
};

export default function CajaPage() {
  const [mes, setMes] = useState(hoyISO().slice(0, 7));
  const [movs, setMovs] = useState<Mov[]>([]);
  const [cats, setCats] = useState<any[]>([]);
  const [consumo, setConsumo] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const [fecha, setFecha] = useState(hoyISO());
  const [tipo, setTipo] = useState("salida");
  const [categoria, setCategoria] = useState("compra_insumo");
  const [monto, setMonto] = useState("");
  const [medio, setMedio] = useState("efectivo");
  const [concepto, setConcepto] = useState("");

  const cargar = useCallback(async () => {
    const [y, m] = mes.split("-").map(Number);
    const desde = `${mes}-01`;
    const hasta = new Date(y, m, 0).toISOString().slice(0, 10);

    const [mv, ct, cs, ins] = await Promise.all([
      supabase
        .from("movimientos_caja")
        .select("id, fecha, tipo, categoria_codigo, monto, medio, concepto")
        .gte("fecha", desde)
        .lte("fecha", hasta)
        .order("fecha", { ascending: false }),
      supabase.from("categorias_movimiento").select("codigo, nombre, tipo").order("nombre"),
      supabase.from("consumos_dia").select("insumo_id, cantidad").gte("fecha", desde).lte("fecha", hasta),
      supabase.from("insumos").select("id, precio_unitario"),
    ]);

    setMovs((mv.data ?? []) as Mov[]);
    setCats(ct.data ?? []);

    const precio: Record<string, number> = {};
    (ins.data ?? []).forEach((i: any) => (precio[i.id] = Number(i.precio_unitario)));
    const total = ((cs.data ?? []) as any[]).reduce(
      (a, c) => a + Number(c.cantidad) * (precio[c.insumo_id] ?? 0),
      0,
    );
    setConsumo(total);
  }, [mes]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const ingresos = useMemo(
    () => movs.filter((m) => m.tipo === "ingreso").reduce((a, m) => a + Number(m.monto), 0),
    [movs],
  );
  const salidas = useMemo(
    () => movs.filter((m) => m.tipo === "salida").reduce((a, m) => a + Number(m.monto), 0),
    [movs],
  );
  const comprasInsumos = useMemo(
    () =>
      movs
        .filter((m) => m.tipo === "salida" && m.categoria_codigo === "compra_insumo")
        .reduce((a, m) => a + Number(m.monto), 0),
    [movs],
  );

  const porCategoria = useMemo(() => {
    const acc: Record<string, number> = {};
    movs
      .filter((m) => m.tipo === "salida")
      .forEach((m) => {
        acc[m.categoria_codigo] = (acc[m.categoria_codigo] ?? 0) + Number(m.monto);
      });
    return Object.entries(acc).sort((a, b) => b[1] - a[1]);
  }, [movs]);

  function nombreCat(codigo: string) {
    return cats.find((c) => c.codigo === codigo)?.nombre ?? codigo;
  }

  async function registrar(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    const valor = Number(monto || 0);
    if (valor <= 0) return setErr("Escribe el monto.");

    setGuardando(true);
    const { error } = await supabase.from("movimientos_caja").insert({
      fecha,
      tipo,
      categoria_codigo: categoria,
      monto: valor,
      medio,
      concepto: concepto || null,
    });
    setGuardando(false);
    if (error) return setErr(error.message);
    setMonto("");
    setConcepto("");
    setMsg("Movimiento registrado.");
    cargar();
  }

  const catsTipo = cats.filter((c) => c.tipo === tipo);

  return (
    <Shell>
      <div className="card">
        <h2>Flujo de caja</h2>
        <div className="grid grid-3">
          <div className="field">
            <label className="f">Mes</label>
            <input className="input" type="month" value={mes} onChange={(e) => setMes(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-4" style={{ marginTop: 6 }}>
          <div className="kpi">
            <div className="label">Ingresos</div>
            <div className="value" style={{ fontSize: 17 }}>{soles(ingresos)}</div>
          </div>
          <div className="kpi">
            <div className="label">Salidas</div>
            <div className="value" style={{ fontSize: 17 }}>{soles(salidas)}</div>
          </div>
          <div className="kpi accent">
            <div className="label">Saldo del mes</div>
            <div className="value" style={{ fontSize: 17, color: ingresos - salidas >= 0 ? "var(--ok)" : "var(--danger)" }}>
              {soles(ingresos - salidas)}
            </div>
          </div>
          <div className="kpi">
            <div className="label">Compras de insumos</div>
            <div className="value" style={{ fontSize: 17 }}>{soles(comprasInsumos)}</div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Registrar movimiento</h2>
        {err && <div className="alert err">{err}</div>}
        {msg && <div className="alert ok">{msg}</div>}
        <form onSubmit={registrar}>
          <div className="grid grid-3">
            <div className="field">
              <label className="f">Fecha</label>
              <input className="input" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </div>
            <div className="field">
              <label className="f">Tipo</label>
              <select
                className="input"
                value={tipo}
                onChange={(e) => {
                  setTipo(e.target.value);
                  const primera = cats.find((c) => c.tipo === e.target.value);
                  setCategoria(primera?.codigo ?? "");
                }}
              >
                <option value="salida">Salida (gasto)</option>
                <option value="ingreso">Ingreso</option>
              </select>
            </div>
            <div className="field">
              <label className="f">Categoría</label>
              <select className="input" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
                {catsTipo.map((c) => (
                  <option key={c.codigo} value={c.codigo}>{c.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-3">
            <div className="field">
              <label className="f">Monto (S/)</label>
              <input className="input num" type="number" min="0" step="0.1" value={monto} onChange={(e) => setMonto(e.target.value)} />
            </div>
            <div className="field">
              <label className="f">Medio</label>
              <select className="input" value={medio} onChange={(e) => setMedio(e.target.value)}>
                <option value="efectivo">Efectivo</option>
                <option value="yape">Yape / Plin</option>
                <option value="transferencia">Transferencia</option>
              </select>
            </div>
            <div className="field">
              <label className="f">Concepto</label>
              <input className="input" value={concepto} onChange={(e) => setConcepto(e.target.value)} placeholder="Ej. harina 2 sacos" />
            </div>
          </div>

          <button className="btn btn-primary btn-block" disabled={guardando}>
            {guardando ? "Guardando…" : "Registrar"}
          </button>
        </form>
      </div>

      <div className="card">
        <h2>¿En qué se gasta?</h2>
        {porCategoria.length === 0 ? (
          <p className="empty">Sin salidas este mes.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Categoría</th><th className="num">Monto</th><th className="num">%</th></tr>
              </thead>
              <tbody>
                {porCategoria.map(([cod, monto]) => (
                  <tr key={cod}>
                    <td>{nombreCat(cod)}</td>
                    <td className="num">{soles(monto)}</td>
                    <td className="num">{salidas > 0 ? ((monto / salidas) * 100).toFixed(0) : 0}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <h2>Insumos: comprado vs consumido</h2>
        <div className="grid grid-3">
          <div className="kpi">
            <div className="label">Comprado</div>
            <div className="value" style={{ fontSize: 17 }}>{soles(comprasInsumos)}</div>
            <div className="hint">compras de insumos del mes</div>
          </div>
          <div className="kpi">
            <div className="label">Consumido</div>
            <div className="value" style={{ fontSize: 17 }}>{soles(consumo)}</div>
            <div className="hint">según recetas y registros</div>
          </div>
          <div className="kpi accent">
            <div className="label">Diferencia</div>
            <div className="value" style={{ fontSize: 17 }}>{soles(comprasInsumos - consumo)}</div>
            <div className="hint">debería quedar en almacén</div>
          </div>
        </div>
        <p className="sub" style={{ margin: "10px 4px 0", fontSize: 12 }}>
          Si la diferencia es muy grande, hay compras que no se están registrando o consumo que no se anota.
        </p>
      </div>

      <div className="card">
        <h2>Movimientos del mes</h2>
        {movs.length === 0 ? (
          <p className="empty">Sin movimientos.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Fecha</th><th>Tipo</th><th>Categoría</th><th>Concepto</th><th className="num">Monto</th></tr>
              </thead>
              <tbody>
                {movs.map((m) => (
                  <tr key={m.id}>
                    <td>{m.fecha}</td>
                    <td>{m.tipo === "ingreso" ? "Ingreso" : "Salida"}</td>
                    <td>{nombreCat(m.categoria_codigo)}</td>
                    <td>{m.concepto ?? "—"}</td>
                    <td className="num" style={{ color: m.tipo === "ingreso" ? "var(--ok)" : "var(--danger)" }}>
                      {soles(Number(m.monto))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Shell>
  );
}
