import fs from "node:fs";

const env = fs.readFileSync(".env.local", "utf8");
const get = (k) => {
  const m = env.match(new RegExp(`^${k}=(.*)$`, "m"));
  return m ? m[1].trim().replace(/^"|"$/g, "") : "";
};

const url = get("NEXT_PUBLIC_SUPABASE_URL") || get("SUPABASE_URL");
const key = get("SUPABASE_SERVICE_ROLE_KEY");

const personas = [
  { nombre: "Estefani", email: "estefani@mimipastel.pe", pass: "Estefani2026!" },
  { nombre: "Yeison", email: "yeison@mimipastel.pe", pass: "Yeison2026!" },
  { nombre: "Melina", email: "melina@mimipastel.pe", pass: "Melina2026!" },
];

async function crear(p) {
  const r = await fetch(`${url}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: p.email,
      password: p.pass,
      email_confirm: true,
      user_metadata: { nombre: p.nombre },
    }),
  });
  const data = await r.json();
  if (!r.ok) {
    console.log(p.email, "->", r.status, data.msg || data.message || "");
    return null;
  }
  console.log(p.email, "-> creado", data.id);
  return data.id;
}

async function perfil(id, p) {
  const r = await fetch(`${url}/rest/v1/perfiles`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify({ id, nombre: p.nombre, rol: "produccion" }),
  });
  console.log("  perfil:", r.status);
}

for (const p of personas) {
  const id = await crear(p);
  if (id) await perfil(id, p);
}
