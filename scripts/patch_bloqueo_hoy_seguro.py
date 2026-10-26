from pathlib import Path

p = Path("components/Shell.tsx")
s = p.read_text(encoding="utf-8")
orig = s

# marca de acceso denegado (sin hooks nuevos)
s = s.replace(
    '  const visible = NAV.filter((n) => n.roles.includes(rol));',
    '  const visible = NAV.filter((n) => n.roles.includes(rol));\n'
    '  const sinAcceso = path === "/hoy" && rol !== "admin";',
    1,
)

viejo = "<PerfilCtx.Provider value={perfil}>{children}</PerfilCtx.Provider>"
nuevo = (
    "<PerfilCtx.Provider value={perfil}>\n"
    "        {sinAcceso ? (\n"
    '          <div className="card">\n'
    "            <h2>Sin acceso</h2>\n"
    '            <p className="sub">\n'
    "              Esta pantalla es solo para el administrador.\n"
    "              {rol === \"produccion\" ? \" Ve a Producción.\" : \" Ve a Ventas.\"}\n"
    "            </p>\n"
    "            <a className=\"btn btn-sm\" href={rol === \"produccion\" ? \"/produccion\" : \"/ventas\"}>\n"
    "              Ir a mi pantalla\n"
    "            </a>\n"
    "          </div>\n"
    "        ) : (\n"
    "          children\n"
    "        )}\n"
    "      </PerfilCtx.Provider>"
)

if viejo in s:
    s = s.replace(viejo, nuevo, 1)

p.write_text(s, encoding="utf-8")
print("ok:", "sinAcceso" in s and "Sin acceso" in s)
