"""Parche puntual de la pantalla de programacion (fijos vs eventuales)."""
from pathlib import Path

p = Path("app/programacion/page.tsx")
s = p.read_text(encoding="utf-8")
original = s

# 1. traer es_fijo
s = s.replace('.select("id, codigo, tipo")', '.select("id, codigo, tipo, es_fijo")')

# 2. lista visible
ancla = '  const clave = (puntoId: string, prodId: string) => `${puntoId}|${prodId}`;\n'
if ancla not in s:
    raise SystemExit("no se encontro el ancla de clave()")
s = s.replace(ancla, ancla + """
  const visibles = useMemo(
    () => (verEventuales ? puntos : puntos.filter((p) => p.es_fijo)),
    [puntos, verEventuales],
  );
""", 1)

# 3. totales sobre visibles
s = s.replace("puntos.reduce(", "visibles.reduce(")
s = s.replace("{puntos.map((pv) => (", "{visibles.map((pv) => (")

# 4. interruptor
marca = '      <div className="card" style={{ padding: 10 }}>'
if marca not in s:
    raise SystemExit("no se encontro la tarjeta de la parrilla")
s = s.replace(marca, """      <div className="card" style={{ padding: "10px 14px" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600 }}>
          <input
            type="checkbox"
            checked={verEventuales}
            onChange={(e) => setVerEventuales(e.target.checked)}
            style={{ width: 16, height: 16 }}
          />
          Mostrar clientes eventuales ({puntos.filter((p) => !p.es_fijo).length})
        </label>
      </div>

""" + marca, 1)

p.write_text(s, encoding="utf-8")
print("cambios aplicados:", s != original)
print("visibles:", s.count("visibles"))
print("es_fijo en select:", 'select("id, codigo, tipo, es_fijo")' in s)
