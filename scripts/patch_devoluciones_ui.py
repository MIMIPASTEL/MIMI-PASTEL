from pathlib import Path

p = Path("app/repartos/page.tsx")
s = p.read_text(encoding="utf-8")

# encabezado
s = s.replace(
    '<th className="num">Cantidad</th>\n                  <th className="num">Subtotal</th>',
    '<th className="num">Enviado</th>\n                  <th className="num">Devuelto</th>\n                  <th className="num">Subtotal</th>',
    1,
)

# fila
s = s.replace(
    '<td className="num"><strong>{f.cantidad}</strong></td>\n                    <td className="num">{soles(f.cantidad * Number(f.precio))}</td>',
    '<td className="num"><strong>{f.cantidad}</strong></td>\n'
    '                    <td className="num">\n'
    '                      <input\n'
    '                        className="input num"\n'
    '                        type="number"\n'
    '                        min="0"\n'
    '                        step="1"\n'
    '                        style={{ width: 70 }}\n'
    '                        value={devueltos[f.producto_id] ?? ""}\n'
    '                        onChange={(e) =>\n'
    '                          setDevueltos((d) => ({ ...d, [f.producto_id]: e.target.value }))\n'
    '                        }\n'
    '                      />\n'
    '                    </td>\n'
    '                    <td className="num">\n'
    '                      {soles(\n'
    '                        Math.max(0, f.cantidad - Number(devueltos[f.producto_id] || 0)) *\n'
    '                          Number(f.precio),\n'
    '                      )}\n'
    '                    </td>',
    1,
)

# selector de destino antes del boton guardar
ancla = '          <button className="btn btn-primary btn-block" onClick={guardar}'
selector = '''          <div className="field" style={{ marginTop: 8 }}>
            <label className="f">¿Qué se hace con lo devuelto?</label>
            <select
              className="input"
              value={destinoDev}
              onChange={(e) => setDestinoDev(e.target.value as any)}
            >
              <option value="revender">Se revende (vuelve al stock)</option>
              <option value="descartar">Se descarta (merma)</option>
            </select>
          </div>

''' + ancla
if ancla in s:
    s = s.replace(ancla, selector, 1)

p.write_text(s, encoding="utf-8")
print("ok:", "Devuelto" in s and "Se revende" in s)
