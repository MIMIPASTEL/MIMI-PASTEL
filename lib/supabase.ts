import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: true, autoRefreshToken: true } },
);

export type Rol = "admin" | "produccion" | "ventas";

export type Perfil = {
  id: string;
  nombre: string;
  rol: Rol;
};

/** Fecha local en formato YYYY-MM-DD (zona del negocio, no UTC). */
export function hoyISO(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function soles(n: number | null | undefined): string {
  const v = Number(n ?? 0);
  return "S/ " + v.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function numero(n: number | null | undefined, dec = 0): string {
  const v = Number(n ?? 0);
  return v.toLocaleString("es-PE", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

export function fechaCorta(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
