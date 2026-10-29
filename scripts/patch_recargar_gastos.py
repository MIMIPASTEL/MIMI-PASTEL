from pathlib import Path

p = Path("app/ventas/page.tsx")
s = p.read_text(encoding="utf-8")
orig = s

ancla = """    const porMedio: Record<string, number> = {};"""

bloque = """    // recuperar los gastos clasificados del turno
    const { data: gastosMov } = await supabase
      .from("movimientos_caja")
      .select("concepto, monto")
      .eq("fecha", fecha)
      .eq("punto_venta_id", puntoId)
      .eq("turno", turno);

    const g: Record<string, number> = {};
    ((gastosMov ?? []) as any[]).forEach((x) => {
      g[x.concepto] = (g[x.concepto] ?? 0) + Number(x.monto);
    });
    setGasSalario(g["Salario vendedora"] ? String(g["Salario vendedora"]) : "");
    setGasChofer(g["Chofer"] ? String(g["Chofer"]) : "");
    setGasBolsas(g["Bolsas"] ? String(g["Bolsas"]) : "");
    setGasPasaje(g["Pasaje"] ? String(g["Pasaje"]) : "");
    setGasComidos(g["Pasteles comidos"] ? String(g["Pasteles comidos"]) : "");

    if (cierre) {
      const totalG = Object.values(g).reduce((a, b) => a + b, 0);
      const neto = Number(cierre.efectivo) - totalG;
      setEfectivo(neto > 0 ? String(neto) : "");
    }

""" + ancla

if "recuperar los gastos clasificados" not in s:
    s = s.replace(ancla, bloque, 1)

p.write_text(s, encoding="utf-8")
print("ok:", "recuperar los gastos" in s)
