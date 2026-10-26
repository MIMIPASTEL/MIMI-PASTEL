from pathlib import Path

p = Path("components/Shell.tsx")
s = p.read_text(encoding="utf-8")
orig = s

# guardia: si el rol no tiene permiso para la ruta actual, se redirige
ancla = "  const rol = perfil?.rol ?? \"ventas\";"
guardia = """  useEffect(() => {
    if (!perfil) return;
    const entrada = NAV.find((n) => n.href === path);
    if (entrada && !entrada.roles.includes(perfil.rol)) {
      const destino =
        perfil.rol === "produccion" ? "/produccion" : perfil.rol === "ventas" ? "/ventas" : "/hoy";
      router.replace(destino);
    }
  }, [perfil, path, router]);

""" + ancla

if "const entrada = NAV.find" not in s:
    s = s.replace(ancla, guardia, 1)

p.write_text(s, encoding="utf-8")
print("shell:", "NAV.find" in s)

# las paginas sensibles tambien se protegen individualmente
hoy = Path("app/hoy/page.tsx")
t = hoy.read_text(encoding="utf-8")
if "SoloAdmin" not in t:
    if "usePerfil" not in t:
        t = t.replace('import Shell from "@/components/Shell";', 'import Shell, { usePerfil } from "@/components/Shell";', 1)
    t = t.replace(
        "export default function",
        'function SoloAdmin({ children }: { children: React.ReactNode }) {\n'
        "  const perfil = usePerfil();\n"
        '  if (perfil && perfil.rol !== "admin") return null;\n'
        "  return <>{children}</>;\n"
        "}\n\n"
        "export default function",
        1,
    )
    hoy.write_text(t, encoding="utf-8")
print("hoy:", "SoloAdmin" in t)
