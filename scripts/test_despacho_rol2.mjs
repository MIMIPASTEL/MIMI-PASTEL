import fs from "node:fs";
const env = fs.readFileSync(".env.local", "utf8");
const get = (k) => {
  const m = env.match(new RegExp(`^${k}=(.*)$`, "m"));
  return m ? m[1].trim().replace(/^"|"$/g, "") : "";
};
const url = get("NEXT_PUBLIC_SUPABASE_URL") || get("SUPABASE_URL");
const anon = get("NEXT_PUBLIC_SUPABASE_ANON_KEY") || get("SUPABASE_ANON_KEY");
const service = get("SUPABASE_SERVICE_ROLE_KEY");

const login = await fetch(`${url}/auth/v1/token?grant_type=password`, {
  method: "POST",
  headers: { apikey: anon, "Content-Type": "application/json" },
  body: JSON.stringify({ email: "estefani@mimipastel.pe", password: "Estefani2026!" }),
});
const t = await login.json();
const H = { apikey: anon, Authorization: `Bearer ${t.access_token}`, "Content-Type": "application/json" };

const puntoId = "52aad083-164f-4c67-9423-bedff086a104";

const ins = await fetch(`${url}/rest/v1/despachos`, {
  method: "POST",
  headers: { ...H, Prefer: "return=representation" },
  body: JSON.stringify({ fecha: "1999-12-31", punto_venta_id: puntoId, turno: 2, estado: "enviado" }),
});
console.log("insert despacho:", ins.status, (await ins.text()).slice(0, 300));

const del = await fetch(`${url}/rest/v1/despachos?fecha=eq.1999-12-31`, {
  method: "DELETE",
  headers: { apikey: service, Authorization: `Bearer ${service}` },
});
console.log("limpieza:", del.status);
