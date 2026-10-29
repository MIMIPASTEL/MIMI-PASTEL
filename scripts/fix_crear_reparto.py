from pathlib import Path

p = Path("app/pedidos/page.tsx")
lineas = p.read_text(encoding="utf-8").splitlines(keepends=True)

nuevo = '''  async function crearReparto() {
    const nombre = nuevoReparto.trim();
    if (!nombre) return;
    const codigo = nombre
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\\u0300-\\u036f]/g, "")
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 20);
    const { error } = await supabase
      .from("puntos_venta")
      .insert({ codigo, nombre, tipo: "repartos", es_fijo: true });
    if (error) return setErr(error.message);
    setNuevoReparto("");
    setMsg(codigo + " agregado como cliente fijo de reparto.");
    cargar();
  }

'''

# reemplaza desde "async function crearReparto" hasta la linea en blanco posterior a su cierre
ini = next(i for i, l in enumerate(lineas) if "async function crearReparto" in l)
fin = next(i for i in range(ini, len(lineas)) if lineas[i].strip() == "}" ) + 1

lineas[ini:fin] = [nuevo]
p.write_text("".join(lineas), encoding="utf-8")
print("reemplazado", ini, fin)
