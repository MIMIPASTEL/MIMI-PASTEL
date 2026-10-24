"""Ordena los puntos de venta por la columna orden."""
from pathlib import Path

cambios = [
    (
        "app/admin/page.tsx",
        'supabase.from("puntos_venta").select("id, codigo, nombre, tipo, es_fijo").order("codigo"),',
        'supabase.from("puntos_venta").select("id, codigo, nombre, tipo, es_fijo, orden").order("orden", { ascending: true }).order("codigo"),',
    ),
    (
        "app/ventas/page.tsx",
        '        .order("codigo");',
        '        .order("orden", { ascending: true })\n        .order("codigo");',
    ),
    (
        "app/pedidos/page.tsx",
        'supabase.from("puntos_venta").select("id, codigo").eq("activo", true).order("codigo"),',
        'supabase.from("puntos_venta").select("id, codigo").eq("activo", true).order("orden", { ascending: true }).order("codigo"),',
    ),
    (
        "app/produccion/page.tsx",
        'supabase.from("puntos_venta").select("id, codigo, nombre").eq("activo", true).order("codigo"),',
        'supabase.from("puntos_venta").select("id, codigo, nombre").eq("activo", true).order("orden", { ascending: true }).order("codigo"),',
    ),
    (
        "app/programacion/page.tsx",
        '        .in("tipo", ["maxiahorro", "repartos"])\n        .order("codigo"),',
        '        .in("tipo", ["maxiahorro", "repartos"])\n        .order("orden", { ascending: true })\n        .order("codigo"),',
    ),
]

for archivo, viejo, nuevo in cambios:
    p = Path(archivo)
    s = p.read_text(encoding="utf-8")
    if viejo not in s:
        print(f"NO ENCONTRADO en {archivo}")
        continue
    s = s.replace(viejo, nuevo, 1)
    p.write_text(s, encoding="utf-8")
    print(f"ok {archivo}")
