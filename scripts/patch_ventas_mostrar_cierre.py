from pathlib import Path

p = Path("app/ventas/page.tsx")
s = p.read_text(encoding="utf-8")
orig = s

# 1. estados
s = s.replace(
    "  const [gastosOper, setGastosOper] = useState(0);",
    "  const [gastosOper, setGastosOper] = useState(0);\n  const [cierreData, setCierreData] = useState<any>(null);\n  const [tocado, setTocado] = useState(false);",
    1,
)

# 2. la consulta trae tambien el dinero guardado
s = s.replace(
    '.select("efectivo, yape, transferencia, gasto, promociones, descuento")',
    '.select("efectivo, yape, transferencia, gasto, promociones, descuento, dinero_esperado, dinero_contado")',
    1,
)

# 3. guardar el cierre y marcar como no tocado
s = s.replace(
    "    if (cierre) {\n      setEfectivo(",
    "    setCierreData(cierre ?? null);\n    setTocado(false);\n\n    if (cierre) {\n      setEfectivo(",
    1,
)

# 4. marcar cambios del usuario
s = s.replace(
    "  function setCampo(i: number, campo: keyof Fila, v: string) {",
    "  function setCampo(i: number, campo: keyof Fila, v: string) {\n    setTocado(true);",
    1,
)
for campo in ["setEfectivo", "setYape", "setTransferencia", "setGasto", "setPromoGrupos"]:
    s = s.replace(
        f'onChange={{(e) => {campo}(e.target.value)}}',
        f'onChange={{(e) => {{ setTocado(true); {campo}(e.target.value); }}}}',
    )

# 5. valores a mostrar
ancla = "  const diferenciaDinero = cobrado - ventaNeta;"
nuevo = """  const diferenciaDinero = cobrado - ventaNeta;

  // si hay un cierre guardado y no se tocó nada, se muestra tal cual quedó
  const usaCierre = Boolean(cierreData) && !tocado;
  const brutaVer = usaCierre
    ? Number(cierreData.dinero_esperado) + Number(cierreData.descuento)
    : ventaBruta;
  const promoVer = usaCierre ? Number(cierreData.descuento) : descuentoPromo;
  const netaVer = usaCierre ? Number(cierreData.dinero_esperado) : ventaNeta;
  const cobradoVer = usaCierre ? Number(cierreData.dinero_contado) : cobrado;
  const difVer = cobradoVer - netaVer;"""
if ancla not in s:
    raise SystemExit("no se encontro diferenciaDinero")
s = s.replace(ancla, nuevo, 1)

# 6. usar los valores en los indicadores
s = s.replace("{soles(ventaBruta)}", "{soles(brutaVer)}")
s = s.replace("−{soles(descuentoPromo)}", "−{soles(promoVer)}")
s = s.replace("{soles(ventaNeta)}", "{soles(netaVer)}")
s = s.replace("− venta neta {soles(ventaNeta)}", "− venta neta {soles(netaVer)}")
s = s.replace("cobrado {soles(cobrado)} − venta neta", "cobrado {soles(cobradoVer)} − venta neta")
s = s.replace('style={{ fontSize: 17, color: Math.abs(diferenciaDinero) < 0.01 ? "var(--ok)" : "var(--danger)" }}',
              'style={{ fontSize: 17, color: Math.abs(difVer) < 0.01 ? "var(--ok)" : "var(--danger)" }}', 1)
s = s.replace("{soles(diferenciaDinero)}", "{soles(difVer)}")
s = s.replace("descuento {soles(descuentoPromo)}", "descuento {soles(promoVer)}")

p.write_text(s, encoding="utf-8")
print("ok:", s != orig)
print("cierre:", "usaCierre" in s, "| kpi:", s.count("brutaVer"), "| promo:", s.count("promoVer"))
