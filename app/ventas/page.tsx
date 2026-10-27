"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Shell, { usePerfil } from "@/components/Shell";
import { supabase, hoyISO, soles, numero, fechaCorta } from "@/lib/supabase";

type Punto = { id: string; codigo: string; turno: number | null; punto_anterior_id: string | null };
type Prod = { id: string; codigo?: string | null; nombre: string };

type Fila = {
  producto_id: string;
  codigo: string;
  inicial: number;
  enviado: number;
  contado: string;
  merma: string;
  sobrante: string;
  precio: string;
};

function restarDia(iso: string) {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() - 1);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

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
  const [gasto, setGasto] = useState("");
  const [gasSalario, setGasSalario] = useState("");
  const [gasChofer, setGasChofer] = useState("");
  const [gasBolsas, setGasBolsas] = useState("");
  const [gasPasaje, setGasPasaje] = useState("");
  const [gasComidos, setGasComidos] = useState("");

  const [promoGrupos, setPromoGrupos] = useState("");
  const [promo, setPromo] = useState<any>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [cierreData, setCierreData] = useState<any>(null);
  const [tocado, setTocado] = useState(false);

  useEffect(() => {
    (async () => {
      const [pv, pr] = await Promise.all([
        supabase
          .from("puntos_venta")
          .select("id, codigo, turno, punto_anterior_id")
          .eq("activo", true)
          .eq("tipo", "maxiahorro")
          .order("orden"),
        supabase
          .from("promociones")
          .select("id, nombre, cantidad, precio, promocion_productos(producto_id)")
          .eq("activo", true)
          .limit(1),
      ]);
      const lista = (pv.data ?? []) as Punto[];
      setPuntos(lista);
      if (lista.length > 0) setPuntoId(lista[0].id);
      if ((pr.data ?? []).length > 0) setPromo(pr.data![0]);
    })();
  }, []);

  const cargar = useCallback(async () => {
    if (!puntoId) return;
    setCargando(true);
    setMsg(null);
    setErr(null);

    const punto = puntos.find((p) => p.id === puntoId);
    const turno = punto?.turno ?? 0;

    const [prods, desp, precios] = await Promise.all([
      supabase.from("productos").select("id, codigo, nombre").eq("activo", true).order("orden"),
      supabase
        .from("despachos")
        .select("id, despacho_items(producto_id, cantidad_enviada, cantidad_recibida)")
        .eq("fecha", fecha)
        .eq("punto_venta_id", puntoId)
        .eq("turno", turno)
        .maybeSingle(),
      supabase.from("precios").select("producto_id, precio, punto_venta_id"),
    ]);

    const productos = (prods.data ?? []) as Prod[];

    // enviado por producto
    const enviado: Record<string, number> = {};
    ((desp.data?.despacho_items ?? []) as any[]).forEach((i) => {
      enviado[i.producto_id] = Number(i.cantidad_enviada);
    });

    // Solo el turno 2 arrastra el sobrante del turno 1.
    // En el turno 1 el stock anterior ya viene incluido en el envío de producción.
    const prevPunto = punto?.punto_anterior_id ?? null;
    const prevFecha = fecha;

    const inicial: Record<string, number> = {};
    if (prevPunto) {
      const { data: sob } = await supabase
        .from("sobrantes")
        .select("producto_id, cantidad, cantidad_reutilizable")
        .eq("fecha", prevFecha)
        .eq("punto_venta_id", prevPunto);
      (sob ?? []).forEach((s: any) => {
        inicial[s.producto_id] =
          s.cantidad_reutilizable === null ? Number(s.cantidad) : Number(s.cantidad_reutilizable);
      });
    }

    const precioMap: Record<string, number> = {};
    (precios.data ?? []).forEach((p: any) => {
      if (!p.punto_venta_id) precioMap[p.producto_id] = precioMap[p.producto_id] ?? Number(p.precio);
      else if (p.punto_venta_id === puntoId) precioMap[p.producto_id] = Number(p.precio);
    });

    // sobrantes ya guardados de este turno
    const { data: sobHoy } = await supabase
      .from("sobrantes")
      .select("producto_id, cantidad")
      .eq("fecha", fecha)
      .eq("punto_venta_id", puntoId);
    const sobMap: Record<string, number> = {};
    (sobHoy ?? []).forEach((s: any) => {
      sobMap[s.producto_id] = Number(s.cantidad);
    });

    // cierre de caja ya guardado de este turno
    const [pg, vt, mv, mr] = await Promise.all([
      supabase.from("pagos").select("medio, monto").eq("fecha", fecha).eq("punto_venta_id", puntoId),
      supabase
        .from("ventas")
        .select("promociones, descuento")
        .eq("fecha", fecha)
        .eq("punto_venta_id", puntoId)
        .eq("turno", turno)
        .order("creado_en", { ascending: false })
        .limit(1),
      supabase
        .from("movimientos_caja")
        .select("monto")
        .eq("fecha", fecha)
        .eq("punto_venta_id", puntoId)
        .eq("turno", turno)
        .eq("tipo", "salida"),
      supabase
        .from("mermas")
        .select("producto_id, cantidad")
        .eq("fecha", fecha)
        .eq("punto_venta_id", puntoId)
        .eq("tipo", "vitrina"),
    ]);

    // si ya hay un cierre guardado para este turno, se usa tal cual
    const { data: cierre } = await supabase
      .from("cuadres")
      .select("efectivo, yape, transferencia, gasto, promociones, descuento, dinero_esperado, dinero_contado")
      .eq("fecha", fecha)
      .eq("punto_venta_id", puntoId)
      .eq("turno", turno)
      .maybeSingle();

    setCierreData(cierre ?? null);
    setTocado(false);

    if (cierre) {
      setEfectivo(Number(cierre.efectivo) ? String(cierre.efectivo) : "");
      setYape(Number(cierre.yape) ? String(cierre.yape) : "");
      setTransferencia(Number(cierre.transferencia) ? String(cierre.transferencia) : "");
      setGasto(Number(cierre.gasto) ? String(cierre.gasto) : "");
      setPromoGrupos(Number(cierre.promociones) ? String(cierre.promociones) : "");
    }

    const porMedio: Record<string, number> = {};
    ((pg.data ?? []) as any[]).forEach((x) => {
      porMedio[x.medio] = (porMedio[x.medio] ?? 0) + Number(x.monto);
    });
    if (!cierre) {
      setEfectivo(porMedio["efectivo"] ? String(porMedio["efectivo"]) : "");
      setYape(porMedio["yape"] ? String(porMedio["yape"]) : "");
      setTransferencia(porMedio["transferencia"] ? String(porMedio["transferencia"]) : "");
    }

    if (!cierre) {
      const promoVendidas = Number(((vt.data ?? []) as any[])[0]?.promociones ?? 0);
      setPromoGrupos(promoVendidas ? String(promoVendidas) : "");

      const totalGastos = ((mv.data ?? []) as any[]).reduce((a, x) => a + Number(x.monto), 0);
      setGasto(totalGastos ? String(totalGastos) : "");
    }

    const mermaMap: Record<string, number> = {};
    ((mr.data ?? []) as any[]).forEach((m) => {
      mermaMap[m.producto_id] = (mermaMap[m.producto_id] ?? 0) + Number(m.cantidad);
    });

    setFilas(
      productos.map((p) => ({
        producto_id: p.id,
        codigo: p.codigo ?? p.nombre,
        inicial: inicial[p.id] ?? 0,
        enviado: enviado[p.id] ?? 0,
        contado:
          enviado[p.id] !== undefined && desp.data
            ? String((desp.data as any).despacho_items.find((x: any) => x.producto_id === p.id)?.cantidad_recibida ?? "")
            : "",
        merma: mermaMap[p.id] !== undefined ? String(mermaMap[p.id]) : "",
        sobrante: sobMap[p.id] !== undefined ? String(sobMap[p.id]) : "",
        precio: precioMap[p.id] ? String(precioMap[p.id]) : "2",
      })),
    );
    setCargando(false);
  }, [fecha, puntoId, puntos]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  function setCampo(i: number, campo: keyof Fila, v: string) {
    setTocado(true);
    setFilas((f) => f.map((x, j) => (j === i ? { ...x, [campo]: v } : x)));
  }

  const de = (f: Fila, campo: "contado" | "merma" | "sobrante" | "precio") =>
    Number((f[campo] as string) || 0);

  const disponible = (f: Fila) => f.inicial + f.enviado;
  const diferencia = (f: Fila) => (f.contado === "" ? 0 : de(f, "contado") - disponible(f));
  const vendido = (f: Fila) =>
    Math.max(0, de(f, "contado") - de(f, "merma") - de(f, "sobrante"));

  const totalVendido = filas.reduce((a, f) => a + vendido(f), 0);
  const ventaBruta = filas.reduce((a, f) => a + vendido(f) * de(f, "precio"), 0);

  // Descuento de promociones: usa el precio real de los productos que participan
  useEffect(() => {
    const t = Number(gasSalario || 0) + Number(gasChofer || 0) + Number(gasBolsas || 0) + Number(gasPasaje || 0) + Number(gasComidos || 0);
    setGasto(t > 0 ? String(t) : "");
  }, [gasSalario, gasChofer, gasBolsas, gasPasaje, gasComidos]);

  const descuentoPromo = useMemo(() => {
    const grupos = Number(promoGrupos || 0);
    if (!promo || grupos === 0 || ventaBruta <= 0) return 0;

    const ids = new Set(((promo.promocion_productos ?? []) as any[]).map((x) => x.producto_id));
    let unidades = 0;
    let valor = 0;
    filas.forEach((f) => {
      if (ids.size > 0 && !ids.has(f.producto_id)) return;
      const c = vendido(f);
      unidades += c;
      valor += c * de(f, "precio");
    });
    if (unidades === 0) return 0;

    const promedio = valor / unidades;
    const porGrupo = Number(promo.cantidad) * promedio - Number(promo.precio);
    return Math.max(0, grupos * Math.max(0, porGrupo));
  }, [promo, promoGrupos, ventaBruta, filas]);

  const ventaNeta = ventaBruta - descuentoPromo;
  const cobrado = Number(efectivo || 0) + Number(yape || 0) + Number(transferencia || 0);
  const diferenciaDinero = cobrado - ventaNeta;

  // si hay un cierre guardado y no se tocó nada, se muestra tal cual quedó
  const usaCierre = Boolean(cierreData) && !tocado;
  const brutaVer = usaCierre
    ? Number(cierreData.dinero_esperado) + Number(cierreData.descuento)
    : ventaBruta;
  const promoVer = usaCierre ? Number(cierreData.descuento) : descuentoPromo;
  const netaVer = usaCierre ? Number(cierreData.dinero_esperado) : ventaNeta;
  const cobradoVer = usaCierre ? Number(cierreData.dinero_contado) : cobrado;
  const difVer = cobradoVer - netaVer;

  // Guarda solo el conteo del turno: lo recibido, la merma y los sobrantes.
  async function guardarConteo(): Promise<boolean> {
    if (!puntoId) return false;
    const punto = puntos.find((p) => p.id === puntoId)!;
    const turno = punto.turno ?? 0;

    const { data: desp, error: e1 } = await supabase
      .from("despachos")
      .upsert(
        { fecha, punto_venta_id: puntoId, turno, estado: "recibido", recibido_por: perfil?.id, recibido_en: new Date().toISOString() },
        { onConflict: "fecha,punto_venta_id,turno" },
      )
      .select("id")
      .single();
    if (e1 || !desp) {
      setErr(e1?.message ?? "No se pudo guardar el conteo");
      return false;
    }

    const items = filas
      .filter((f) => f.enviado > 0 || f.contado !== "")
      .map((f) => ({
        despacho_id: desp.id,
        producto_id: f.producto_id,
        cantidad_enviada: f.enviado,
        cantidad_recibida: f.contado === "" ? null : Number(f.contado),
      }));
    if (items.length > 0) {
      const { error } = await supabase.from("despacho_items").upsert(items, { onConflict: "despacho_id,producto_id" });
      if (error) {
        setErr(error.message);
        return false;
      }
    }

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
        return false;
      }
    }

    for (const f of filas) {
      await supabase
        .from("mermas")
        .delete()
        .eq("fecha", fecha)
        .eq("producto_id", f.producto_id)
        .eq("punto_venta_id", puntoId)
        .eq("tipo", "vitrina");
    }
    const mermas = filas.filter((f) => de(f, "merma") > 0);
    if (mermas.length > 0) {
      const { error } = await supabase.from("mermas").insert(
        mermas.map((f) => ({
          fecha,
          producto_id: f.producto_id,
          punto_venta_id: puntoId,
          cantidad: de(f, "merma"),
          tipo: "vitrina",
          motivo: "roto",
          usuario_id: perfil?.id,
        })),
      );
      if (error) {
        setErr("Merma: " + error.message);
        return false;
      }
    }

    return true;
  }

  async function soloConteo() {
    setErr(null);
    setMsg(null);
    setGuardando(true);
    const ok = await guardarConteo();
    setGuardando(false);
    if (ok) {
      setMsg("Conteo guardado. Puedes cerrar el turno cuando termines de vender.");
      cargar();
    }
  }

  async function guardar() {
    setErr(null);
    setMsg(null);
    if (!puntoId) return;
    const faltanPrecios = filas.some((f) => vendido(f) > 0 && de(f, "precio") <= 0);
    if (faltanPrecios) return setErr("Hay productos vendidos sin precio.");

    setGuardando(true);
    const punto = puntos.find((p) => p.id === puntoId)!;
    const turno = punto.turno ?? 0;

    const okConteo = await guardarConteo();
    if (!okConteo) {
      setGuardando(false);
      return;
    }

    // se limpia el cierre anterior de este turno (si se vuelve a cerrar)
    await supabase.from("ventas").delete().eq("fecha", fecha).eq("punto_venta_id", puntoId).eq("turno", turno);

    // 4. venta
    const vendidos = filas.filter((f) => vendido(f) > 0);
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
          descuento: descuentoPromo,
          promociones: Number(promoGrupos || 0),
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
          cantidad: vendido(f),
          precio_unitario: de(f, "precio"),
        })),
      );
      if (e2) {
        setErr("Detalle de venta: " + e2.message);
        setGuardando(false);
        return;
      }
    }

    // 5. pagos
    const pagos = [
      { medio: "efectivo", monto: Number(efectivo || 0) },
      { medio: "yape", monto: Number(yape || 0) },
      { medio: "transferencia", monto: Number(transferencia || 0) },
    ].filter((p) => p.monto > 0);

    if (pagos.length > 0) {
      const { error } = await supabase.from("pagos").insert(
        pagos.map((p) => ({ venta_id: ventaId, punto_venta_id: puntoId, fecha, medio: p.medio, monto: p.monto })),
      );
      if (error) {
        setErr("Pagos: " + error.message);
        setGuardando(false);
        return;
      }
    }

    // 6. gastos clasificados del turno
    const conceptosGasto = ["Salario vendedora", "Chofer", "Bolsas", "Pasaje", "Pasteles comidos"];
    await supabase
      .from("movimientos_caja")
      .delete()
      .eq("fecha", fecha)
      .eq("punto_venta_id", puntoId)
      .in("concepto", conceptosGasto);

    if (Number(gasSalario || 0) > 0) {
      await supabase.from("movimientos_caja").insert({
        fecha,
        categoria_codigo: "planilla",
        monto: Number(gasSalario),
        medio: "efectivo",
        turno,
        concepto: "Salario vendedora",
        punto_venta_id: puntoId,
        creado_por: perfil?.id,
        tipo: "salida",
      });
    }
    if (Number(gasChofer || 0) > 0) {
      await supabase.from("movimientos_caja").insert({
        fecha,
        categoria_codigo: "planilla",
        monto: Number(gasChofer),
        medio: "efectivo",
        turno,
        concepto: "Chofer",
        punto_venta_id: puntoId,
        creado_por: perfil?.id,
        tipo: "salida",
      });
    }
    if (Number(gasBolsas || 0) > 0) {
      await supabase.from("movimientos_caja").insert({
        fecha,
        categoria_codigo: "gasto_negocio",
        monto: Number(gasBolsas),
        medio: "efectivo",
        turno,
        concepto: "Bolsas",
        punto_venta_id: puntoId,
        creado_por: perfil?.id,
        tipo: "salida",
      });
    }
    if (Number(gasPasaje || 0) > 0) {
      await supabase.from("movimientos_caja").insert({
        fecha,
        categoria_codigo: "movilidad",
        monto: Number(gasPasaje),
        medio: "efectivo",
        turno,
        concepto: "Pasaje",
        punto_venta_id: puntoId,
        creado_por: perfil?.id,
        tipo: "salida",
      });
    }
    if (Number(gasComidos || 0) > 0) {
      await supabase.from("movimientos_caja").insert({
        fecha,
        categoria_codigo: "otro_gasto",
        monto: Number(gasComidos),
        medio: "efectivo",
        turno,
        concepto: "Pasteles comidos",
        punto_venta_id: puntoId,
        creado_por: perfil?.id,
        tipo: "salida",
      });
    }

    // guardar el cierre de caja del turno
    await supabase.from("cuadres").upsert(
      {
        fecha,
        punto_venta_id: puntoId,
        turno,
        unidades_esperadas: filas.reduce((a, f) => a + disponible(f), 0),
        unidades_contadas: filas.reduce((a, f) => a + (f.contado === "" ? 0 : Number(f.contado)), 0),
        dinero_esperado: ventaNeta,
        dinero_contado: cobrado,
        efectivo: Number(efectivo || 0),
        yape: Number(yape || 0),
        transferencia: Number(transferencia || 0),
        gasto: Number(gasto || 0),
        promociones: Number(promoGrupos || 0),
        descuento: descuentoPromo,
        estado:
          Math.abs(diferenciaDinero) < 0.01
            ? "ok"
            : Math.abs(diferenciaDinero) <= 5
              ? "diferencia_leve"
              : "diferencia_grave",
        cerrado_por: perfil?.id,
        cerrado_en: new Date().toISOString(),
      },
      { onConflict: "fecha,punto_venta_id,turno" },
    );

    await cargar();

    setGuardando(false);
    setMsg(
      `Turno cerrado · vendido ${numero(totalVendido)} unid. · venta neta ${soles(netaVer)} · ${
        Math.abs(diferenciaDinero) < 0.01 ? "caja cuadrada" : "diferencia " + soles(diferenciaDinero)
      }`,
    );
  }

  const puntoActual = puntos.find((p) => p.id === puntoId);
  const tieneInicial = Boolean(puntoActual?.punto_anterior_id);
  const turnoNum = puntoActual?.turno === 2 ? "Turno 2" : "Turno 1";

  return (
    <>
      <h1>Ventas</h1>
      <p className="sub">
        {fechaCorta(fecha)} · {puntoActual?.codigo ?? "—"} · {turnoNum}
      </p>

      <div className="card">
        <div className="grid grid-2">
          <div className="field">
            <label className="f">Fecha</label>
            <input className="input" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>
          <div className="field">
            <label className="f">Turno</label>
            <select className="input" value={puntoId} onChange={(e) => setPuntoId(e.target.value)}>
              {puntos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.codigo} · Turno {p.turno ?? 1}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {err && <div className="alert err">{err}</div>}
      {msg && <div className="alert ok">{msg}</div>}

      <div className="card" style={{ padding: 10 }}>
        <div className="row" style={{ marginBottom: 8, padding: "0 4px" }}>
          <h2 style={{ margin: 0 }}>Conteo del turno</h2>
          <button
            className="btn btn-sm"
            type="button"
            onClick={() => setFilas((fs) => fs.map((f) => ({ ...f, contado: String(disponible(f)) })))}
          >
            Copiar disponible a todos
          </button>
        </div>

        {cargando ? (
          <p className="empty">Cargando…</p>
        ) : (
          <div className="table-wrap">
            <table className="grid-prog">
              <thead>
                <tr>
                  <th className="sticky" style={{ minWidth: 70 }}>Prod.</th>
                  {tieneInicial && <th className="num">Inicial</th>}
                  <th className="num">Enviado</th>
                  <th className="num">Disponible</th>
                  <th className="num">Contado</th>
                  <th className="num">Dif.</th>
                  <th className="num">Merma</th>
                  <th className="num">Sobrante</th>
                  <th className="num">Vendido</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((f, i) => {
                  const dif = diferencia(f);
                  return (
                    <tr key={f.producto_id}>
                      <td className="sticky">{f.codigo}</td>
                      {tieneInicial && (
                        <td className="num" style={{ fontSize: 12.5 }}>{f.inicial || ""}</td>
                      )}
                      <td className="num" style={{ fontSize: 12.5 }}>{f.enviado || ""}</td>
                      <td
                        className="num"
                        onClick={() => setCampo(i, "contado", String(disponible(f)))}
                        title="Toca para copiar en Contado"
                        style={{ cursor: "pointer", color: "var(--accent)", fontWeight: 600 }}
                      >
                        {disponible(f) || ""}
                      </td>
                      <td style={{ padding: 2 }}>
                        <input
                          className="num"
                          type="number"
                          min="0"
                          step="1"
                          value={f.contado}
                          onChange={(e) => setCampo(i, "contado", e.target.value)}
                          style={{ width: "100%", minWidth: 62 }}
                        />
                      </td>
                      <td className="num">
                        {f.contado === "" ? (
                          ""
                        ) : (
                          <span className={`badge ${dif === 0 ? "ok" : "danger"}`}>
                            {dif > 0 ? "+" : ""}
                            {numero(dif)}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: 2 }}>
                        <input
                          className="num"
                          type="number"
                          min="0"
                          step="1"
                          value={f.merma}
                          onChange={(e) => setCampo(i, "merma", e.target.value)}
                          style={{ width: "100%", minWidth: 58 }}
                        />
                      </td>
                      <td style={{ padding: 2 }}>
                        <input
                          className="num"
                          type="number"
                          min="0"
                          step="1"
                          value={f.sobrante}
                          onChange={(e) => setCampo(i, "sobrante", e.target.value)}
                          style={{ width: "100%", minWidth: 62 }}
                        />
                      </td>
                      <td className="num"><strong>{vendido(f) || ""}</strong></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ marginTop: 10 }}>
          <button className="btn" onClick={soloConteo} disabled={guardando}>
            {guardando ? "Guardando…" : "Guardar conteo"}
          </button>
        </div>
      </div>

      <div className="card">
        <h2>Cierre de caja</h2>

        <div className="grid grid-3" style={{ marginTop: 12 }}>
          <div className="field">
            <label className="f">Efectivo</label>
            <input className="input num" type="number" min="0" step="0.1" value={efectivo} onChange={(e) => { setTocado(true); setEfectivo(e.target.value); }} placeholder="0.00" />
          </div>
          <div className="field">
            <label className="f">Yape</label>
            <input className="input num" type="number" min="0" step="0.1" value={yape} onChange={(e) => { setTocado(true); setYape(e.target.value); }} placeholder="0.00" />
          </div>
          <div className="field">
            <label className="f">Transferencia</label>
            <input className="input num" type="number" min="0" step="0.1" value={transferencia} onChange={(e) => { setTocado(true); setTransferencia(e.target.value); }} placeholder="0.00" />
          </div>
        </div>

        <div className="grid grid-2">
          <div className="field">
            <label className="f">Promociones vendidas (grupos)</label>
            <input className="input num" type="number" min="0" step="1" value={promoGrupos} onChange={(e) => { setTocado(true); setPromoGrupos(e.target.value); }} placeholder="0" />
            {promo && (
              <p className="sub" style={{ margin: "4px 0 0", fontSize: 12 }}>
                {promo.nombre} · descuento {soles(promoVer)}
              </p>
            )}
          </div>
          <div className="field">
            <label className="f">Salario vendedora</label>
            <input className="input num" type="number" min="0" step="0.1" value={gasSalario} onChange={(e) => { setTocado(true); setGasSalario(e.target.value); }} placeholder="0.00" />
          </div>
          <div className="field">
            <label className="f">Chofer</label>
            <input className="input num" type="number" min="0" step="0.1" value={gasChofer} onChange={(e) => { setTocado(true); setGasChofer(e.target.value); }} placeholder="0.00" />
          </div>
          <div className="field">
            <label className="f">Bolsas</label>
            <input className="input num" type="number" min="0" step="0.1" value={gasBolsas} onChange={(e) => { setTocado(true); setGasBolsas(e.target.value); }} placeholder="0.00" />
          </div>
          <div className="field">
            <label className="f">Pasaje</label>
            <input className="input num" type="number" min="0" step="0.1" value={gasPasaje} onChange={(e) => { setTocado(true); setGasPasaje(e.target.value); }} placeholder="0.00" />
          </div>
          <div className="field">
            <label className="f">Pasteles comidos</label>
            <input className="input num" type="number" min="0" step="0.1" value={gasComidos} onChange={(e) => { setTocado(true); setGasComidos(e.target.value); }} placeholder="0.00" />
          </div>
        </div>

        <div className="grid grid-4" style={{ marginTop: 4 }}>
          <div className="kpi">
            <div className="label">Venta bruta</div>
            <div className="value" style={{ fontSize: 17 }}>{soles(brutaVer)}</div>
          </div>
          <div className="kpi">
            <div className="label">Promociones</div>
            <div className="value" style={{ fontSize: 17 }}>−{soles(promoVer)}</div>
            <div className="hint">{promoGrupos || 0} grupo(s)</div>
          </div>
          <div className="kpi">
            <div className="label">Venta neta</div>
            <div className="value" style={{ fontSize: 17 }}>{soles(netaVer)}</div>
          </div>
          <div className="kpi">
            <div className="label">Efectivo a entregar</div>
            <div className="value" style={{ fontSize: 17 }}>{soles(Number(efectivo || 0) - Number(gasto || 0))}</div>
            <div className="hint">efectivo − gasto {soles(Number(gasto || 0))}</div>
          </div>
          <div className="kpi accent">
            <div className="label">Diferencia</div>
            <div
              className="value"
              style={{ fontSize: 17, color: Math.abs(difVer) < 0.01 ? "var(--ok)" : "var(--danger)" }}
            >
              {soles(difVer)}
            </div>
            <div className="hint">cobrado {soles(cobradoVer)} − venta neta</div>
          </div>
        </div>

        <div className="card" style={{ background: "#faf7f4", marginTop: 14, marginBottom: 0, boxShadow: "none" }}>
          <h2 style={{ marginBottom: 6, fontSize: 13 }}>Cómo cuadra la caja</h2>
          <p className="sub" style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6 }}>
            <strong>Vendido</strong> = contado − merma − sobrante.<br />
            <strong>Venta bruta</strong> = vendido × precio. &nbsp;
            <strong>Venta neta</strong> = bruta − promociones.<br />
            <strong>Cobrado</strong> = efectivo + Yape + transferencia.<br />
            <strong>Diferencia</strong> = cobrado − venta neta. Debe ser S/ 0.00.<br />
            <strong>Efectivo a entregar</strong> = efectivo cobrado − gastos pagados de ese efectivo.
          </p>
          <p className="sub" style={{ margin: "8px 0 0", fontSize: 12 }}>
            Si registras merma, baja el vendido y por lo tanto baja lo que deberías tener en caja: la
            diferencia sube. Eso es correcto — significa que ese pastel no se vendió.
          </p>
        </div>

        <button className="btn btn-primary btn-block" style={{ marginTop: 14 }} onClick={guardar} disabled={guardando}>
          {guardando ? "Guardando…" : "Cerrar turno"}
        </button>
      </div>
    </>
  );
}
