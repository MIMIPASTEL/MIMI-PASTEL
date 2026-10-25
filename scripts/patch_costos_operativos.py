from pathlib import Path

p = Path("components/CostosAdmin.tsx")
s = p.read_text(encoding="utf-8")
orig = s

# guardar tambien los operativos
viejo_save = """        otros_dia: num("otros_dia"),
        unidades_dia: Math.max(1, num("unidades_dia")),"""
nuevo_save = """        otros_dia: num("otros_dia"),
        ventas_dia: num("ventas_dia"),
        chofer_dia: num("chofer_dia"),
        unidades_dia: Math.max(1, num("unidades_dia")),"""
if viejo_save not in s:
    raise SystemExit("no se encontro el update")
s = s.replace(viejo_save, nuevo_save, 1)

marca = """      <div className="table-wrap" style={{ marginTop: 14 }}>"""
bloque = """      <h2 style={{ marginTop: 18 }}>Gastos operativos (van al resultado del día)</h2>
      <p className="sub" style={{ marginTop: -6 }}>
        No entran al costo unitario: se restan de la utilidad del día.
      </p>
      <div className="grid grid-3">
        <div className="field">
          <label className="f">Vendedoras (S/ por día)</label>
          <input className="input num" type="number" min="0" step="0.5" value={params?.ventas_dia ?? ""} onChange={(e) => set("ventas_dia", e.target.value)} />
        </div>
        <div className="field">
          <label className="f">Chofer (S/ por día)</label>
          <input className="input num" type="number" min="0" step="0.5" value={params?.chofer_dia ?? ""} onChange={(e) => set("chofer_dia", e.target.value)} />
        </div>
        <div className="field">
          <label className="f">Total operativo por día</label>
          <div className="input num" style={{ background: "#f7f3ef" }}>
            {soles(num("ventas_dia") + num("chofer_dia"))}
          </div>
        </div>
      </div>

      <button className="btn btn-sm" onClick={guardar} disabled={guardando}>
        {guardando ? "Guardando…" : "Guardar parámetros"}
      </button>

""" + marca

if marca not in s:
    raise SystemExit("no se encontro la tabla")
s = s.replace(marca, bloque, 1)

p.write_text(s, encoding="utf-8")
print("costos:", s != orig, "| operativos:", "ventas_dia" in s)
