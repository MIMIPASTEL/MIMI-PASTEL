from pathlib import Path

p = Path("app/produccion/page.tsx")
s = p.read_text(encoding="utf-8")
orig = s

# estado de refresco
if "const [v, setV]" not in s:
    s = s.replace(
        "  const [puntos, setPuntos] = useState<Punto[]>([]);",
        "  const [puntos, setPuntos] = useState<Punto[]>([]);\n  const [v, setV] = useState(0);",
        1,
    )

# fecha en la cabecera y sobrantes como primera tarjeta
viejo = """      <h1>Producción</h1>
      <p className="sub">{fechaCorta(fecha)} · lo que hay que producir y enviar</p>

      <div className="card">
        <label className="f">Fecha</label>
        <input
          className="input"
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          style={{ maxWidth: 200 }}
        />
      </div>

      <SobrantesRevision fecha={fecha} productos={productos} puntos={puntos} />

      <ParrillaPrograma fecha={fecha} productos={productos} puntos={puntos} />"""

nuevo = """      <div className="row" style={{ alignItems: "flex-start", marginBottom: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ marginBottom: 2 }}>Producción</h1>
          <p className="sub" style={{ margin: 0 }}>{fechaCorta(fecha)} · producir y enviar</p>
        </div>
        <input
          className="input"
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          style={{ maxWidth: 170 }}
        />
      </div>

      <SobrantesRevision
        fecha={fecha}
        productos={productos}
        puntos={puntos}
        onSaved={() => setV((x) => x + 1)}
      />

      <ParrillaPrograma key={v} fecha={fecha} productos={productos} puntos={puntos} />"""

if viejo not in s:
    raise SystemExit("no se encontro el bloque de cabecera")
s = s.replace(viejo, nuevo, 1)

p.write_text(s, encoding="utf-8")
print("ok:", s != orig, "| onSaved:", "onSaved" in s, "| key:", "key={v}" in s)
