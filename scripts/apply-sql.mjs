/**
 * Aplica archivos SQL a Supabase mediante la Management API.
 * Divide el archivo en sentencias respetando bloques $$ ... $$, comillas y comentarios.
 *
 * Uso:
 *   node scripts/apply-sql.mjs supabase/migrations/0001_schema.sql [...]
 *
 * Variables (se leen de .env.local o del entorno):
 *   SUPABASE_ACCESS_TOKEN  -> token sbp_...
 *   SUPABASE_PROJECT_REF   -> rxwmobaoxwlzxeivfplu
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

// --- carga simple de .env.local ---
function loadEnv(file = ".env.local") {
  if (!existsSync(file)) return;
  for (const raw of readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i === -1) continue;
    const k = line.slice(0, i).trim();
    const v = line.slice(i + 1).trim();
    if (!(k in process.env)) process.env[k] = v;
  }
}
loadEnv();

const token = process.env.SUPABASE_ACCESS_TOKEN;
const ref = process.env.SUPABASE_PROJECT_REF;
if (!token || !ref) {
  console.error("Faltan SUPABASE_ACCESS_TOKEN o SUPABASE_PROJECT_REF");
  process.exit(1);
}

/** Divide SQL en sentencias completas. */
function splitStatements(sql) {
  const out = [];
  let buf = "";
  let i = 0;
  let dollarTag = null; // ej: "$$" o "$fn$"
  let inSingle = false;
  let inLineComment = false;
  let inBlockComment = false;
  let blockDepth = 0;

  while (i < sql.length) {
    const c = sql[i];
    const next = sql[i + 1];

    if (inLineComment) {
      buf += c;
      if (c === "\n") inLineComment = false;
      i++;
      continue;
    }
    if (inBlockComment) {
      buf += c;
      if (c === "/" && next === "*") { blockDepth++; buf += next; i += 2; continue; }
      if (c === "*" && next === "/") {
        blockDepth--;
        buf += next; i += 2;
        if (blockDepth === 0) inBlockComment = false;
        continue;
      }
      i++;
      continue;
    }
    if (dollarTag) {
      if (sql.startsWith(dollarTag, i)) {
        buf += dollarTag;
        i += dollarTag.length;
        dollarTag = null;
        continue;
      }
      buf += c;
      i++;
      continue;
    }
    if (inSingle) {
      buf += c;
      if (c === "'" && next === "'") { buf += next; i += 2; continue; }
      if (c === "'") inSingle = false;
      i++;
      continue;
    }

    // fuera de todo contexto
    if (c === "-" && next === "-") { inLineComment = true; buf += c + next; i += 2; continue; }
    if (c === "/" && next === "*") { inBlockComment = true; blockDepth = 1; buf += c + next; i += 2; continue; }
    if (c === "'") { inSingle = true; buf += c; i++; continue; }
    if (c === "$") {
      const m = /^\$[A-Za-z_]*\$/.exec(sql.slice(i));
      if (m) { dollarTag = m[0]; buf += dollarTag; i += dollarTag.length; continue; }
    }
    if (c === ";") {
      const s = buf.trim();
      if (s && !/^(--[^\n]*\n?)*$/.test(s)) out.push(s);
      buf = "";
      i++;
      continue;
    }
    buf += c;
    i++;
  }
  const tail = buf.trim();
  if (tail && !/^(--[^\n]*\n?)*$/.test(tail)) out.push(tail);
  return out;
}

async function run(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}\n${text || "(sin cuerpo)"}\n--- SQL ---\n${sql.slice(0, 800)}`);
  }
  return text;
}

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error("Indica al menos un archivo .sql");
  process.exit(1);
}

for (const f of files) {
  const abs = resolve(f);
  const sql = readFileSync(abs, "utf8");
  const stmts = splitStatements(sql);
  console.log(`\n▶ ${f} — ${stmts.length} sentencias`);
  let n = 0;
  for (const s of stmts) {
    n++;
    const head = s.replace(/\s+/g, " ").slice(0, 70);
    try {
      await run(s + ";");
      console.log(`  ✓ ${String(n).padStart(2)} ${head}`);
    } catch (e) {
      console.error(`  ✗ ${String(n).padStart(2)} ${head}`);
      console.error(String(e.message));
      process.exit(1);
    }
  }
}
console.log("\n✔ Listo");
