import fs from "node:fs";
const env = fs.readFileSync(".env.local", "utf8");
const g = (k) => {
  const m = env.match(new RegExp("^" + k + "=(.*)$", "m"));
  return m ? m[1].trim().replace(/^"|"$/g, "") : "";
};
const url = g("NEXT_PUBLIC_SUPABASE_URL") || g("SUPABASE_URL");
const anon = g("NEXT_PUBLIC_SUPABASE_ANON_KEY") || g("SUPABASE_ANON_KEY");
const service = g("SUPABASE_SERVICE_ROLE_KEY");

const r = await fetch(url + "/auth/v1/token?grant_type=password", {
  method: "POST",
  headers: { apikey: anon, "Content-Type": "application/json" },
  body: JSON.stringify({ email: "estefani@mimipastel.pe", password: "Estefani2026!" }),
});
const t = await r.json();
const H = { apikey: anon, Authorization: "Bearer " + t.access_token, "Content-Type": "application/json" };

const prod = await fetch(url + "/rest/v1/productos?select=id&limit=1", { headers: H });
const prodId = (await prod.json())[0]?.id;

const ins = await fetch(url + "/rest/v1/lotes_produccion", {
  method: "POST",
  headers: H,
  body: JSON.stringify({ fecha: "2026-11-06", producto_id: prodId, cantidad_producida: 1 }),
});
console.log("insertar lote como produccion:", ins.status, (await ins.text()).slice(0, 160));

const sub = await fetch(url + "/rest/v1/subproductos_dia", {
  method: "POST",
  headers: { ...H, Prefer: "resolution=merge-duplicates" },
  body: JSON.stringify({ fecha: "2026-11-06", clave: "prueba", producido: 1, usado: 0, merma: 0 }),
});
console.log("insertar subproducto:", sub.status, (await sub.text()).slice(0, 160));

await fetch(url + "/rest/v1/lotes_produccion?fecha=eq.2026-11-06&cantidad_producida=eq.1", {
  method: "DELETE",
  headers: { apikey: service, Authorization: "Bearer " + service },
});
await fetch(url + "/rest/v1/subproductos_dia?clave=eq.prueba", {
  method: "DELETE",
  headers: { apikey: service, Authorization: "Bearer " + service },
});
console.log("limpieza ok");
