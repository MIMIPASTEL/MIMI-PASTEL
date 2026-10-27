from pathlib import Path

p = Path("components/InsumosProduccion.tsx")
s = p.read_text(encoding="utf-8")
orig = s

# encabezado: "Cantidad" pasa a ser "Mi consumo" + nueva columna total
s = s.replace(
    '<th className="num">Cantidad</th>\n                <th className="num">Costo</th>',
    '<th className="num">Mi consumo</th>\n                <th className="num">Total del día</th>\n                <th className="num">Costo</th>',
    1,
)

# fila: agregar celda con el total de todos los operadores
s = s.replace(
    '                <td className="num">{costo(i) > 0 ? soles(costo(i)) : ""}</td>',
    '                <td className="num">{totalOperadores[i.id] ? `${numero(totalOperadores[i.id], 2)}` : "—"}</td>\n'
    '                <td className="num">{costo(i) > 0 ? soles(costo(i)) : ""}</td>',
    1,
)

# el total de la fila de cierre abarca una columna mas
s = s.replace('<td colSpan={3}><strong>Total del día</strong></td>', '<td colSpan={4}><strong>Total del día</strong></td>', 1)

p.write_text(s, encoding="utf-8")
print("ok:", "Total del día" in s and "totalOperadores[i.id]" in s)
