from pathlib import Path

p = Path("components/ProduccionDia.tsx")
s = p.read_text(encoding="utf-8")
orig = s

# leer la merma que registra "Mermas del dia"
s = s.replace('.eq("tipo", "proceso"),', '.eq("tipo", "produccion"),', 1)

# no volver a escribir mermas desde aqui
i = s.find('    await supabase.from("mermas").delete().eq("fecha", fecha).eq("tipo", "proceso");')
if i > 0:
    j = s.find("    setGuardando(false);\n    setMsg(", i)
    s = s[:i] + s[j:]

# columna de merma solo lectura
viejo = """                  <td className="num">
                    <input
                      className="input num"
                      type="number"
                      min="0"
                      step="1"
                      style={{ width: 70 }}
                      value={merma[p.id] ?? ""}
                      onChange={(e) => setMerma((x) => ({ ...x, [p.id]: e.target.value }))}
                    />
                  </td>"""
nuevo = """                  <td className="num">{mer || "—"}</td>"""
if viejo in s:
    s = s.replace(viejo, nuevo, 1)

s = s.replace(
    "Lo que realmente salió del horno. Producido − merma − enviado − ventas de taller = stock.",
    "Lo que realmente salió del horno. La merma se registra en \\u00abMermas del día\\u00bb.",
    1,
)

p.write_text(s, encoding="utf-8")
print("ok:", 'tipo", "produccion' in s, "| sin input:", 'value={merma[p.id]' not in s)
