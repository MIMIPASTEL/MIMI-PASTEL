import fs from "node:fs";
const env = fs.readFileSync(".env.local", "utf8");
const get = (k) => {
  const m = env.match(new RegExp(`^${k}=(.*)$`, "m"));
  return m ? m[1].trim().replace(/^"|"$/g, "") : "";
};
const url = get("NEXT_PUBLIC_SUPABASE_URL") || get("SUPABASE_URL");
const anon = get("NEXT_PUBLIC_SUPABASE_ANON_KEY") || get("SUPABASE_ANON_KEY");

async function probar(email, pass, tabla) {
  const r = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anon, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: pass }),
  });
  const t = await r.json();
  if (!t.access_token) return `${email}: login fallo`;

  const q = await fetch(`${url}/rest/v1/${tabla}?select=*&limit=3`, {
    headers: { apikey: anon, Authorization: `Bearer ${t.access_token}` },
  });
  const rows = await q.json();
  return `${email} -> ${tabla}: ${Array.isArray(rows) ? rows.length + " filas" : JSON.stringify(rows)}`;
}

console.log(await probar("produccion@mimipastel.pe", "Produccion2026!", "ventas"));
console.log(await probar("produccion@mimipastel.pe", "Produccion2026!", "pagos"));
console.log(await probar("mariana@mimipastel.pe", "Mariana2026!", "ventas"));
console.log(await probar("mariana@mimipastel.pe", "Mariana2026!", "puntos_venta"));
console.log(await probar("admin@mimipastel.pe", "MimiPastel2026!", "ventas"));
