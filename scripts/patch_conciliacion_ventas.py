"""Conciliacion en la pantalla de Ventas: descuentos y gastos del efectivo."""
from pathlib import Path

p = Path("app/ventas/page.tsx")
s = p.read_text(encoding="utf-8")
orig = s

# 1. estados
s = s.replace(
    '  const [transferencia, setTransferencia] = useState("");',
    '  const [transferencia, setTransferencia] = useState("");\n'
    '  const [descuento, setDescuento] = useState("");\n'
    '  const [gastoMonto, setGastoMonto] = useState("");\n'
    '  const [gastoConcepto, setGastoConcepto] = useState("");\n'
    '  const [gastoCategoria, setGastoCategoria] = useState("movilidad");',
    1,
)

# 2. calculos
viejo_calc = """  const totalCobrado = Number(efectivo || 0) + Number(yape || 0) + Number(transferencia || 0);
  const diferenciaDinero = totalCobrado - totalVendido;"""
nuevo_calc = """  const totalCobrado = Number(efectivo || 0) + Number(yape || 0) + Number(transferencia || 0);
  const montoDescuento = Number(descuento || 0);
  const ventaNeta = totalVendido - montoDescuento;
  const gastoEfectivo = Number(gastoMonto || 0);
  const efectivoAEntregar = Number(efectivo || 0) - gastoEfectivo;
  const diferenciaDinero = totalCobrado - ventaNeta;"""
if viejo_calc not in s:
    raise SystemExit("no se encontro el bloque de calculos")
s = s.replace(viejo_calc, nuevo_calc, 1)

# 3. guardar descuento en la venta
s = s.replace(
    """          usuario_id: perfil?.id,
          total: totalVendido,
        })""",
    """          usuario_id: perfil?.id,
          total: ventaNeta,
          descuento: montoDescuento,
        })""",
    1,
)

# 4. registrar el gasto pagado con el efectivo
ancla = """    setGuardando(false);
    borrarBorrador(`mip:ventas:${fecha}:${puntoId}`);"""
if ancla not in s:
    raise SystemExit("no se encontro el cierre del guardado")

gasto = """    if (gastoEfectivo > 0) {
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

"""
s = s.replace(ancla, gasto + ancla, 1)

# 5. borrador: guardar y recuperar los campos nuevos
s = s.replace(
    "() => guardarBorrador(`mip:ventas:${fecha}:${puntoId}`, { filas, efectivo, yape, transferencia }),",
    "() => guardarBorrador(`mip:ventas:${fecha}:${puntoId}`, { filas, efectivo, yape, transferencia, descuento, gastoMonto, gastoConcepto, gastoCategoria }),",
    1,
)
s = s.replace(
    "  }, [draftListo, filas, efectivo, yape, transferencia, fecha, puntoId]);",
    "  }, [draftListo, filas, efectivo, yape, transferencia, descuento, gastoMonto, gastoConcepto, gastoCategoria, fecha, puntoId]);",
    1,
)
s = s.replace(
    """      if (typeof d.transferencia === "string") setTransferencia(d.transferencia);""",
    """      if (typeof d.transferencia === "string") setTransferencia(d.transferencia);
      if (typeof d.descuento === "string") setDescuento(d.descuento);
      if (typeof d.gastoMonto === "string") setGastoMonto(d.gastoMonto);
      if (typeof d.gastoConcepto === "string") setGastoConcepto(d.gastoConcepto);
      if (typeof d.gastoCategoria === "string") setGastoCategoria(d.gastoCategoria);""",
    1,
)

# 6. tarjeta de dinero completa
ini = s.index("<h2>Dinero cobrado</h2>")
fin_marca = "</button>\n      </div>"
fin = s.index(fin_marca, ini) + len("</button>")

nueva = """<h2>Conciliación del día</h2>
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
        </button>"""

s = s[:ini] + nueva + s[fin:]
p.write_text(s, encoding="utf-8")
print("aplicado:", s != orig)
print("descuento:", "montoDescuento" in s, "| gasto:", "gastoEfectivo" in s)
