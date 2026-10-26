"""Genera la migracion que cambia el tipo de precio y recrea las vistas."""
import re
from pathlib import Path

archivos = [
    "supabase/migrations/0004_vistas.sql",
    "supabase/migrations/0009_costos_dia.sql",
    "supabase/migrations/0010_cadena_turnos.sql",
    "supabase/migrations/0011_conciliacion.sql",
    "supabase/migrations/0013_promociones_y_cierre.sql",
    "supabase/migrations/0022_fix_costo_view.sql",
]

vistas = []
for a in archivos:
    txt = Path(a).read_text(encoding="utf-8")
    # cada bloque create ... view ... hasta el ; final (respeta parentesis)
    for m in re.finditer(r"create or replace view\s+(\w+)", txt, re.I):
        nombre = m.group(1)
        inicio = m.start()
        # buscar el ; que cierra el statement
        depth = 0
        i = inicio
        while i < len(txt):
            c = txt[i]
            if c == "(":
                depth += 1
            elif c == ")":
                depth -= 1
            elif c == ";" and depth == 0:
                break
            i += 1
        stmt = txt[inicio:i + 1]
        vistas.append((nombre, stmt))

print("vistas encontradas:", [v[0] for v in vistas])

partes = []
partes.append("-- =====================================================================")
partes.append("-- 0026_decimales_precio.sql  (generado)")
partes.append("-- Permite 4 decimales en los precios para que la docena cuadre exacta.")
partes.append("-- =====================================================================")
partes.append("")
partes.append("drop view if exists v_cierre_turno cascade;")
partes.append("drop view if exists v_conciliacion cascade;")
partes.append("drop view if exists v_cuadre_dinero cascade;")
partes.append("drop view if exists v_ventas_por_canal cascade;")
partes.append("drop view if exists v_utilidad_dia cascade;")
partes.append("drop view if exists v_costos_dia cascade;")
partes.append("drop view if exists v_cuadre_unidades cascade;")
partes.append("")
partes.append("alter table venta_items drop column if exists subtotal;")
partes.append("alter table venta_items alter column precio_unitario type numeric(12,4);")
partes.append("alter table venta_items")
partes.append("  add column subtotal numeric(12,2) generated always as (cantidad * precio_unitario) stored;")
partes.append("")
partes.append("alter table pedido_items alter column precio_unitario type numeric(12,4);")
partes.append("alter table precios alter column precio type numeric(12,4);")
partes.append("alter table precios_cliente alter column precio type numeric(12,4);")
partes.append("")
partes.append("update precios_cliente set precio = 1.6667")
partes.append(" where tipo_cliente = 'distribuidor' and round(precio, 2) = 1.67;")
partes.append("")
partes.append("update productos set tajadas_por_molde = 33 where codigo = 'T.CH';")
partes.append("")
partes.append("-- recrear vistas")
for nombre, stmt in vistas:
    partes.append(stmt)
    partes.append("")

Path("supabase/migrations/0026_decimales_precio.sql").write_text("\n".join(partes), encoding="utf-8")
print("escrito 0026")
