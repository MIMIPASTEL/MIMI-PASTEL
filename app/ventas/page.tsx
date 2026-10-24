"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Shell, { usePerfil } from "@/components/Shell";
import { supabase, hoyISO, soles, numero, fechaCorta } from "@/lib/supabase";
import { borrarBorrador, guardarBorrador, leerBorrador } from "@/lib/draft";

type Punto = { id: string; codigo: string; nombre: string; turno: number | null };
type Prod = { id: string; nombre: string };
type Fila = {
  producto_id: string;
  nombre: string;
  enviado: number;
  recibido: string;
  vendido: string;
  precio: string;
  sobrante: string;
  merma: string;
};

export default function VentasPage() {
  return (
    <Shell>
      <Contenido />
    </Shell>
  );
}

function Contenido() {
  const perfil = usePerfil();
  const [fecha, setFecha] = useState(hoyISO());
  const [puntos, setPuntos] = useState<Punto[]>([]);
  const [puntoId, setPuntoId] = useState("");
  const [filas, setFilas] = useState<Fila[]>([]);
  const [efectivo, setEfectivo] = useState("");
  const [yape, setYape] = useState("");
  const [transferencia, setTransferencia] = useState("");
  const [descuento, setDescuento] = useState("");
  const [gastoMonto, setGastoMonto] = useState("");
  const [gastoConcepto, setGastoConcepto] = useState("");
  const [gastoCategoria, setGastoCategoria] = useState("movilidad");
  const [mostrarEnviado, setMostrarEnviado] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [draftListo, setDraftListo] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("puntos_venta")
        .select("id, codigo, nombre, turno")
        .eq("activo", true)
        .order("codigo");
      setPuntos((data ?? []) as Punto[]);
      if (data && data.length > 0) setPuntoId(data[0].id);
    })();
  }, []);

  const cargar = useCallback(async () => {
    if (!puntoId) return;
    setMsg(null);
    setErr(null);

    const { data: prods } = await supabase
      .from("productos")
      .select("id, nombre")
      .eq("activo", true)
      .order("orden", { ascending: true });
    const productos = (prods ?? []) as Prod[];

    const { data: desp } = await supabase
      .from("despachos")
      .select("id")
      .eq("fecha", fecha)
      .eq("punto_venta_id", puntoId)
      .maybeSingle();

    let enviados: Record<string, number> = {};
    let recibidos: Record<string, number> = {};
    if (desp) {
      const { data: its } = await supabase
        .from("despacho_items")
        .select("producto_id, cantidad_enviada, cantidad_recibida")
        .eq("despacho_id", desp.id);
      (its ?? []).forEach((i: any) => {
        enviados[i.producto_id] = Number(i.cantidad_enviada);
        if (i.cantidad_recibida !== null) recibidos[i.producto_id] = Number(i.cantidad_recibida);
      });
    }

    const { data: sob } = await supabase
      .from("sobrantes")
      .select("producto_id, cantidad")
      .eq("fecha", fecha)
      .eq("punto_venta_id", puntoId);

    const { data: precios } = await supabase
      .from("precios")
      .select("producto_id, precio, punto_venta_id")
      .or(`punto_venta_id.eq.${puntoId},punto_venta_id.is.null`);

    const precioMap: Record<string, number> = {};
    (precios ?? []).forEach((p: any) => {
      if (!p.punto_venta_id) precioMap[p.producto_id] = precioMap[p.producto_id] ?? Number(p.precio);
      else precioMap[p.producto_id] = Number(p.precio);
    });

    const { data: ventas } = await supabase
      .from("ventas")
      .select("id")
      .eq("fecha", fecha)
      .eq("punto_venta_id", puntoId);

    const vendidos: Record<string, number> = {};
    if (ventas && ventas.length > 0) {
      const ids = ventas.map((v: any) => v.id);
      const { data: vi } = await supabase
        .from("venta_items")
        .select("producto_id, cantidad")
        .in("venta_id", ids);
      (vi ?? []).forEach((i: any) => {
        vendidos[i.producto_id] = (vendidos[i.producto_id] ?? 0) + Number(i.cantidad);
      });
    }

    const base = productos.length > 0 ? productos : [];
    const filasBase = base.map((p) => ({
        producto_id: p.id,
        nombre: p.nombre,
        enviado: enviados[p.id] ?? 0,
        recibido: recibidos[p.id] !== undefined ? String(recibidos[p.id]) : "",
        vendido: vendidos[p.id] ? String(vendidos[p.id]) : "",
        precio: precioMap[p.id] ? String(precioMap[p.id]) : "",
        sobrante: sob?.find((s: any) => s.producto_id === p.id)
          ? String((sob as any[]).find((s: any) => s.producto_id === p.id).cantidad)
          : "",
        merma: "",
      }));

    const d = leerBorrador<any>(`mip:ventas:${fecha}:${puntoId}`);
    if (d && Array.isArray(d.filas) && d.filas.length > 0) {
      setFilas(d.filas);
      if (typeof d.efectivo === "string") setEfectivo(d.efectivo);
      if (typeof d.yape === "string") setYape(d.yape);
      if (typeof d.transferencia === "string") setTransferencia(d.transferencia);
      if (typeof d.descuento === "string") setDescuento(d.descuento);
      if (typeof d.gastoMonto === "string") setGastoMonto(d.gastoMonto);
      if (typeof d.gastoConcepto === "string") setGastoConcepto(d.gastoConcepto);
      if (typeof d.gastoCategoria === "string") setGastoCategoria(d.gastoCategoria);
    } else {
      setFilas(filasBase);
    }
    setMostrarEnviado(Boolean(desp));
    setDraftListo(true);
  }, [fecha, puntoId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    if (!draftListo) return;
    const t = setTimeout(
      () => guardarBorrador(`mip:ventas:${fecha}:${puntoId}`, { filas, efectivo, yape, transferencia, descuento, gastoMonto, gastoConcepto, gastoCategoria }),
      700,
    );
    return () => clearTimeout(t);
  }, [draftListo, filas, efectivo, yape, transferencia, descuento, gastoMonto, gastoConcepto, gastoCategoria, fecha, puntoId]);

  function setCampo(idx: number, campo: keyof Fila, valor: string) {
    setFilas((f) => f.map((x, i) => (i === idx ? { ...x, [campo]: valor } : x)));
  }

  const totalVendido = useMemo(
    () =>
      filas.reduce((a, f) => {
        const c = Number(f.vendido || 0);
        const p = Number(f.precio || 0);
        return a + c * p;
      }, 0),
    [filas],
  );

  const totalCobrado = Number(efectivo || 0) + Number(yape || 0) + Number(transferencia || 0);
  const montoDescuento = Number(descuento || 0);
  const ventaNeta = totalVendido - montoDescuento;
  const gastoEfectivo = Number(gastoMonto || 0);
  const efectivoAEntregar = Number(efectivo || 0) - gastoEfectivo;
  const diferenciaDinero = totalCobrado - ventaNeta;

  const puntosInvalidos = useMemo(
    () =>
      filas.filter((f) => {
        const vendido = Number(f.vendido || 0);
        const precio = Number(f.precio || 0);
        return vendido > 0 && precio <= 0;
      }),
    [filas],
  );

  async function guardar() {
    setErr(null);
    setMsg(null);
    if (!puntoId) return;
    if (puntosInvalidos.length > 0) {
      setErr("Hay productos vendidos sin precio. Completa el precio antes de guardar.");
      return;
    }
    setGuardando(true);

    const punto = puntos.find((p) => p.id === puntoId);
    const turno = punto?.turno ?? 0;

    // 1. despacho
    let despachoId: string | null = null;
    const { data: existente } = await supabase
      .from("despachos")
      .select("id")
      .eq("fecha", fecha)
      .eq("punto_venta_id", puntoId)
      .eq("turno", turno)
      .maybeSingle();

    if (existente) {
      despachoId = existente.id;
    } else {
      const { data: nuevo, error } = await supabase
        .from("despachos")
        .insert({ fecha, punto_venta_id: puntoId, turno, estado: "recibido", recibido_por: perfil?.id })
        .select("id")
        .single();
      if (error) {
        setErr("Despacho: " + error.message);
        setGuardando(false);
        return;
      }
      despachoId = nuevo.id;
    }

    // 2. items del despacho (conteo de lo recibido)
    for (const f of filas) {
      if (f.recibido === "" && f.enviado === 0) continue;
      const { error } = await supabase.from("despacho_items").upsert(
        {
          despacho_id: despachoId,
          producto_id: f.producto_id,
          cantidad_enviada: f.enviado,
          cantidad_recibida: f.recibido === "" ? null : Number(f.recibido),
        },
        { onConflict: "despacho_id,producto_id" },
      );
      if (error) {
        setErr("Recibido: " + error.message);
        setGuardando(false);
        return;
      }
    }

    // 3. sobrantes
    for (const f of filas) {
      if (f.sobrante === "") continue;
      const { error } = await supabase.from("sobrantes").upsert(
        {
          fecha,
          punto_venta_id: puntoId,
          producto_id: f.producto_id,
          cantidad: Number(f.sobrante),
          registrado_por: perfil?.id,
        },
        { onConflict: "fecha,punto_venta_id,producto_id" },
      );
      if (error) {
        setErr("Sobrante: " + error.message);
        setGuardando(false);
        return;
      }
    }

    // 4. mermas de vitrina
    const mermas = filas.filter((f) => Number(f.merma || 0) > 0);
    if (mermas.length > 0) {
      const { error } = await supabase.from("mermas").insert(
        mermas.map((f) => ({
          fecha,
          producto_id: f.producto_id,
          punto_venta_id: puntoId,
          cantidad: Number(f.merma),
          tipo: "vitrina",
          motivo: "roto",
          usuario_id: perfil?.id,
        })),
      );
      if (error) {
        setErr("Merma: " + error.message);
        setGuardando(false);
        return;
      }
    }

    // 5. venta + detalle
    const vendidos = filas.filter((f) => Number(f.vendido || 0) > 0);
    let ventaId: string | null = null;
    if (vendidos.length > 0) {
      const { data: venta, error } = await supabase
        .from("ventas")
        .insert({
          fecha,
          punto_venta_id: puntoId,
          turno,
          usuario_id: perfil?.id,
          total: ventaNeta,
          descuento: montoDescuento,
        })
        .select("id")
        .single();
      if (error) {
        setErr("Venta: " + error.message);
        setGuardando(false);
        return;
      }
      ventaId = venta.id;

      const { error: e2 } = await supabase.from("venta_items").insert(
        vendidos.map((f) => ({
          venta_id: venta.id,
          producto_id: f.producto_id,
          cantidad: Number(f.vendido),
          precio_unitario: Number(f.precio),
        })),
      );
      if (e2) {
        setErr("Detalle de venta: " + e2.message);
        setGuardando(false);
        return;
      }
    }

    // 6. pagos
    const pagos = [
      { medio: "efectivo", monto: Number(efectivo || 0) },
      { medio: "yape", monto: Number(yape || 0) },
      { medio: "transferencia", monto: Number(transferencia || 0) },
    ].filter((p) => p.monto > 0);

    if (pagos.length > 0) {
      const { error } = await supabase.from("pagos").insert(
        pagos.map((p) => ({
          venta_id: ventaId,
          punto_venta_id: puntoId,
          fecha,
          medio: p.medio,
          monto: p.monto,
        })),
      );
      if (error) {
        setErr("Pagos: " + error.message);
        setGuardando(false);
        return;
      }
    }

    if (gastoEfectivo > 0) {
      const { error: eg } = await supabase.from("movimientos_caja").insert({
        fecha,
        tipo: "salida",
        categoria_codigo: gastoCategoria,
        monto: gastoEfectivo,
        medio: "efectivo",
        turno,
        concepto: gastoConcepto || "Gasto pagado del efectivo",
        punto_venta_id: puntoId,
        creado_por: perfil?.id,
      });
      if (eg) {
        setErr("Gasto: " + eg.message);
        setGuardando(false);
        return;
      }
    }

    setGuardando(false);
    borrarBorrador(`mip:ventas:${fecha}:${puntoId}`);
    setMsg("Cierre guardado. Revisa las diferencias abajo.");
    setMostrarEnviado(true);
    cargar();
  }

  return (
    <>
      <h1>Ventas</h1>
      <p className="sub">Conteo de lo recibido, ventas del día y dinero</p>

      <div className="card">
        <div className="grid grid-2">
          <div className="field">
            <label className="f">Fecha</label>
            <input className="input" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>
          <div className="field">
            <label className="f">Punto de venta</label>
            <select className="input" value={puntoId} onChange={(e) => setPuntoId(e.target.value)}>
              {puntos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.codigo} · {p.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="sub" style={{ margin: 0 }}>
          {fechaCorta(fecha)} · {mostrarEnviado ? "envío visible" : "conteo ciego: escribe lo que contaste"}
        </p>
      </div>

      {err && <div className="alert err">{err}</div>}
      {msg && <div className="alert ok">{msg}</div>}

      <div className="card">
        <h2>Conteo y venta por producto</h2>
        {filas.length === 0 ? (
          <p className="empty">No hay productos activos. Créalos en Ajustes.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Producto</th>
                  {mostrarEnviado && <th className="num">Enviado</th>}
                  <th className="num">Recibí</th>
                  <th className="num">Vendí</th>
                  <th className="num">Precio</th>
                  <th className="num">Sobró</th>
                  <th className="num">Merma</th>
                  {mostrarEnviado && <th className="num">Dif.</th>}
                </tr>
              </thead>
              <tbody>
                {filas.map((f, i) => {
                  const dif =
                    Number(f.recibido || 0) -
                    Number(f.vendido || 0) -
                    Number(f.sobrante || 0) -
                    Number(f.merma || 0);
                  return (
                    <tr key={f.producto_id}>
                      <td>{f.nombre}</td>
                      {mostrarEnviado && <td className="num">{numero(f.enviado)}</td>}
                      <td>
                        <input
                          className="input num"
                          type="number"
                          min="0"
                          step="1"
                          value={f.recibido}
                          onChange={(e) => setCampo(i, "recibido", e.target.value)}
                          style={{ width: 76, padding: "6px 8px" }}
                        />
                      </td>
                      <td>
                        <input
                          className="input num"
                          type="number"
                          min="0"
                          step="1"
                          value={f.vendido}
                          onChange={(e) => setCampo(i, "vendido", e.target.value)}
                          style={{ width: 76, padding: "6px 8px" }}
                        />
                      </td>
                      <td>
                        <input
                          className="input num"
                          type="number"
                          min="0"
                          step="0.1"
                          value={f.precio}
                          onChange={(e) => setCampo(i, "precio", e.target.value)}
                          style={{ width: 86, padding: "6px 8px" }}
                        />
                      </td>
                      <td>
                        <input
                          className="input num"
                          type="number"
                          min="0"
                          step="1"
                          value={f.sobrante}
                          onChange={(e) => setCampo(i, "sobrante", e.target.value)}
                          style={{ width: 70, padding: "6px 8px" }}
                        />
                      </td>
                      <td>
                        <input
                          className="input num"
                          type="number"
                          min="0"
                          step="1"
                          value={f.merma}
                          onChange={(e) => setCampo(i, "merma", e.target.value)}
                          style={{ width: 70, padding: "6px 8px" }}
                        />
                      </td>
                      {mostrarEnviado && (
                        <td className="num">
                          {f.recibido === "" ? (
                            "—"
                          ) : (
                            <span className={`badge ${dif === 0 ? "ok" : dif > 0 ? "danger" : "warn"}`}>
                              {dif > 0 ? "+" : ""}
                              {numero(dif)}
                            </span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <h2>Conciliación del día</h2>
        <div className="grid grid-3">
          <div className="field">
            <label className="f">Efectivo cobrado</label>
            <input className="input num" type="number" min="0" step="0.1" value={efectivo} onChange={(e) => setEfectivo(e.target.value)} placeholder="0.00" />
          </div>
          <div className="field">
            <label className="f">Yape (va directo a la dueña)</label>
            <input className="input num" type="number" min="0" step="0.1" value={yape} onChange={(e) => setYape(e.target.value)} placeholder="0.00" />
          </div>
          <div className="field">
            <label className="f">Transferencia</label>
            <input className="input num" type="number" min="0" step="0.1" value={transferencia} onChange={(e) => setTransferencia(e.target.value)} placeholder="0.00" />
          </div>
        </div>

        <div className="grid grid-2">
          <div className="field">
            <label className="f">Descuentos y promociones (S/)</label>
            <input className="input num" type="number" min="0" step="0.1" value={descuento} onChange={(e) => setDescuento(e.target.value)} placeholder="0.00" />
            <p className="sub" style={{ margin: "4px 0 0", fontSize: 12 }}>
              Ej. promoción 3 pasteles por S/ 5
            </p>
          </div>
          <div className="field">
            <label className="f">Gasto pagado con este efectivo (S/)</label>
            <input className="input num" type="number" min="0" step="0.1" value={gastoMonto} onChange={(e) => setGastoMonto(e.target.value)} placeholder="0.00" />
            <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
              <select className="input" value={gastoCategoria} onChange={(e) => setGastoCategoria(e.target.value)}>
                <option value="movilidad">Pasaje / movilidad</option>
                <option value="gasto_negocio">Bolsas / insumos</option>
                <option value="otro_gasto">Otro gasto</option>
              </select>
              <input className="input" placeholder="Concepto" value={gastoConcepto} onChange={(e) => setGastoConcepto(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="grid grid-4" style={{ marginTop: 4 }}>
          <div className="kpi">
            <div className="label">Venta neta</div>
            <div className="value" style={{ fontSize: 18 }}>{soles(ventaNeta)}</div>
            <div className="hint">bruta {soles(totalVendido)} − desc. {soles(montoDescuento)}</div>
          </div>
          <div className="kpi">
            <div className="label">Cobrado</div>
            <div className="value" style={{ fontSize: 18 }}>{soles(totalCobrado)}</div>
            <div className="hint">efectivo + yape + transf.</div>
          </div>
          <div className="kpi">
            <div className="label">Diferencia</div>
            <div className="value" style={{ fontSize: 18, color: Math.abs(diferenciaDinero) < 0.01 ? "var(--ok)" : "var(--danger)" }}>
              {soles(diferenciaDinero)}
            </div>
            <div className="hint">cobrado − venta neta</div>
          </div>
          <div className="kpi accent">
            <div className="label">Efectivo a entregar</div>
            <div className="value" style={{ fontSize: 18 }}>{soles(efectivoAEntregar)}</div>
            <div className="hint">cobrado − gastos {soles(gastoEfectivo)}</div>
          </div>
        </div>

        <button className="btn btn-primary btn-block" style={{ marginTop: 14 }} onClick={guardar} disabled={guardando}>
          {guardando ? "Guardando…" : "Guardar cierre del día"}
        </button>
      </div>
    </>
  );
}
