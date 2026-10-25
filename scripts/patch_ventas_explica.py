from pathlib import Path

# ---------- activar la promoción ----------
import subprocess, json, os

# ---------- parche de la pantalla ----------
p = Path("app/ventas/page.tsx")
s = p.read_text(encoding="utf-8")
orig = s

# KPI de efectivo a entregar + explicacion
viejo = """          <div className="kpi accent">
            <div className="label">Diferencia</div>
            <div
              className="value"
              style={{ fontSize: 17, color: Math.abs(diferenciaDinero) < 0.01 ? "var(--ok)" : "var(--danger)" }}
            >
              {soles(diferenciaDinero)}
            </div>
            <div className="hint">cobrado {soles(cobrado)}</div>
          </div>
        </div>"""

nuevo = """          <div className="kpi">
            <div className="label">Efectivo a entregar</div>
            <div className="value" style={{ fontSize: 17 }}>{soles(Number(efectivo || 0) - Number(gasto || 0))}</div>
            <div className="hint">efectivo − gasto {soles(Number(gasto || 0))}</div>
          </div>
          <div className="kpi accent">
            <div className="label">Diferencia</div>
            <div
              className="value"
              style={{ fontSize: 17, color: Math.abs(diferenciaDinero) < 0.01 ? "var(--ok)" : "var(--danger)" }}
            >
              {soles(diferenciaDinero)}
            </div>
            <div className="hint">cobrado {soles(cobrado)} − venta neta</div>
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
        </div>"""

if viejo not in s:
    raise SystemExit("no se encontro el bloque de KPIs")
s = s.replace(viejo, nuevo, 1)

p.write_text(s, encoding="utf-8")
print("ventas:", s != orig)
