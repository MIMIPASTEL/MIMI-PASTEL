import re
from pathlib import Path

# ---------- usuarios ----------
Path("scripts/usuarios2.mjs").write_text('''import fs from "node:fs";
const env = fs.readFileSync(".env.local", "utf8");
const get = (k) => { const m = env.match(new RegExp(`^${k}=(.*)$`, "m")); return m ? m[1].trim().replace(/^"|"$/g, "") : ""; };
const url = get("NEXT_PUBLIC_SUPABASE_URL") || get("SUPABASE_URL");
const key = get("SUPABASE_SERVICE_ROLE_KEY");

const nuevos = [
  { nombre: "Aaron", email: "aaron@mimipastel.pe", pass: "Aaron2026!", rol: "produccion" },
  { nombre: "Mariana", email: "mariana@mimipastel.pe", pass: "Mariana2026!", rol: "ventas" },
  { nombre: "Enoelis", email: "enoelis@mimipastel.pe", pass: "Enoelis2026!", rol: "ventas" },
];

async function crear(p) {
  const r = await fetch(`${url}/auth/v1/admin/users`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email: p.email, password: p.pass, email_confirm: true, user_metadata: { nombre: p.nombre } }),
  });
  const d = await r.json();
  if (!r.ok) { console.log(p.email, "->", r.status, d.msg || d.message || ""); return null; }
  console.log(p.email, "-> creado");
  return d.id;
}

for (const p of nuevos) {
  const id = await crear(p);
  if (id) {
    const r = await fetch(`${url}/rest/v1/perfiles`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify({ id, nombre: p.nombre, rol: p.rol }),
    });
    console.log("  perfil:", r.status);
  }
}
''', encoding="utf-8")
print("script de usuarios listo")

# ---------- menu ----------
q = Path("components/Shell.tsx")
t = q.read_text(encoding="utf-8")
t = t.replace('roles: ["admin", "produccion", "ventas"] },\n  { href: "/programacion"', 'roles: ["admin"] },\n  { href: "/programacion"', 1)
t = t.replace('roles: ["admin", "produccion"] },\n  { href: "/produccion"', 'roles: ["admin"] },\n  { href: "/produccion"', 1)
q.write_text(t, encoding="utf-8")
print("menu actualizado")
