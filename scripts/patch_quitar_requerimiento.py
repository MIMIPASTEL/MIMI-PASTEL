from pathlib import Path

p = Path("app/produccion/page.tsx")
s = p.read_text(encoding="utf-8")
orig = s

ini = s.index('<div className="card">\n        <div className="row" style={{ marginBottom: 10 }}>\n          <h2 style={{ margin: 0 }}>Requerimiento')
fin = s.index("{pedidosDia.length > 0 && (", ini)

nuevo = """<div className="card" style={{ padding: "10px 14px" }}>
        <span style={{ fontSize: 13, color: "var(--muted)" }}>
          La programación se edita en la pestaña <strong>Programar</strong>. Aquí solo se registra
          lo que se produce y lo que se envía.
        </span>
      </div>

      """

s = s[:ini] + nuevo + s[fin:]
p.write_text(s, encoding="utf-8")
print("ok:", s != orig, "| requerimiento list:", "Requerimiento ·" in s)
