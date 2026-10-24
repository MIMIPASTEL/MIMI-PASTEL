from pathlib import Path

p = Path("app/pedidos/page.tsx")
s = p.read_text(encoding="utf-8")
viejo = 'import { sincronizarPedido } from "@/lib/pedidos";'
nuevo = 'import { quitarPedidoDeProduccion, sincronizarPedido } from "@/lib/pedidos";'
if viejo in s:
    s = s.replace(viejo, nuevo, 1)
    p.write_text(s, encoding="utf-8")
    print("import actualizado")
else:
    print("ya estaba o no se encontro")
print("tiene quitar:", "quitarPedidoDeProduccion" in s)
