import fs from "node:fs";
const env = fs.readFileSync(".env.local", "utf8");
const g = (k) => {
  const m = env.match(new RegExp("^" + k + "=(.*)$", "m"));
  return m ? m[1].trim().replace(/^"|"$/g, "") : "";
};
const url = g("NEXT_PUBLIC_SUPABASE_URL") || g("SUPABASE_URL");
const anon = g("NEXT_PUBLIC_SUPABASE_ANON_KEY") || g("SUPABASE_ANON_KEY");

const r = await fetch(url + "/auth/v1/token?grant_type=password", {
  method: "POST",
  headers: { apikey: anon, "Content-Type": "application/json" },
  body: JSON.stringify({ email: "estefani@mimipastel.pe", password: "Estefani2026!" }),
});
const t = await r.json();

const q = await fetch(url + "/rest/v1/pedidos?select=id,cliente,fecha_entrega&limit=3", {
  headers: { apikey: anon, Authorization: "Bearer " + t.access_token },
});
console.log("pedidos como produccion:", q.status, await q.text());

const vi = await fetch(url + "/rest/v1/ventas?select=id&limit=2", {
  headers: { apikey: anon, Authorization: "Bearer " + t.access_token },
});
console.log("ventas como produccion (debe estar vacio):", vi.status, await vi.text());
