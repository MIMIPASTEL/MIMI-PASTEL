"""Ordena los productos segun el formato de la hoja (columna orden)."""
from pathlib import Path

cambios = [
    (
        "app/programacion/page.tsx",
        'supabase.from("productos").select("id, codigo, nombre").eq("activo", true).order("codigo"),',
        'supabase.from("productos").select("id, codigo, nombre").eq("activo", true).order("orden", { ascending: true }).order("codigo"),',
    ),
    (
        "app/produccion/page.tsx",
        'supabase.from("productos").select("id, nombre").eq("activo", true).order("nombre"),',
        'supabase.from("productos").select("id, nombre").eq("activo", true).order("orden", { ascending: true }),',
    ),
    (
        "app/ventas/page.tsx",
        'supabase.from("productos").select("id, nombre").eq("activo", true).order("nombre"),',
        'supabase.from("productos").select("id, nombre").eq("activo", true).order("orden", { ascending: true }),',
    ),
    (
        "app/pedidos/page.tsx",
        'supabase.from("productos").select("id, nombre").eq("activo", true).order("nombre"),',
        'supabase.from("productos").select("id, nombre").eq("activo", true).order("orden", { ascending: true }),',
    ),
    (
        "app/admin/page.tsx",
        'supabase.from("productos").select("id, nombre, codigo, unidad, activo").order("nombre"),',
        'supabase.from("productos").select("id, nombre, codigo, unidad, activo, orden").order("orden", { ascending: true }),',
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
