"use client";

import { useEffect } from "react";

/** Borradores locales: sobreviven a recargas y cierres del navegador. */

export function leerBorrador<T>(clave: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(clave);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function guardarBorrador(clave: string, valor: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    /* cuota llena o modo privado: se ignora */
  }
}

export function borrarBorrador(clave: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(clave);
  } catch {
    /* nada */
  }
}

/** Guarda automáticamente tras 600 ms sin teclear. */
export function useBorradorAutomatico(clave: string, valor: unknown, activo: boolean) {
  useEffect(() => {
    if (!activo) return;
    const t = setTimeout(() => guardarBorrador(clave, valor), 600);
    return () => clearTimeout(t);
  }, [clave, valor, activo]);
}
