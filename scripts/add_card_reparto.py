from pathlib import Path

p = Path("app/pedidos/page.tsx")
s = p.read_text(encoding="utf-8")

if "Nuevo cliente fijo de reparto" not in s:
    ancla = '      <div className="card">\n        <h2>\u00daltimos pedidos</h2>'
    tarjeta = (
        '      <div className="card">\n'
        '        <h2>Nuevo cliente fijo de reparto</h2>\n'
        '        <p className="sub" style={{ marginTop: -6 }}>\n'
        '          Para clientes que quieren volverse fijos (tiendas, colegios). Queda en Programar y Repartos.\n'
        '        </p>\n'
        '        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>\n'
        '          <input\n'
        '            className="input"\n'
        '            style={{ flex: 1, minWidth: 180 }}\n'
        '            placeholder="Nombre del cliente (ej. Panaderia Lucero)"\n'
        '            value={nuevoReparto}\n'
        '            onChange={(e) => setNuevoReparto(e.target.value)}\n'
        '          />\n'
        '          <button className="btn btn-sm btn-primary" type="button" onClick={crearReparto}>\n'
        '            Agregar\n'
        '          </button>\n'
        '        </div>\n'
        '      </div>\n\n'
    ) + ancla

    if ancla in s:
        s = s.replace(ancla, tarjeta, 1)
        p.write_text(s, encoding="utf-8")
        print("tarjeta agregada")
    else:
        print("ANCLA NO ENCONTRADA")
else:
    print("ya existia")
