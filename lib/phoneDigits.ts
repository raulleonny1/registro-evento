/** Solo dígitos, para indexar y buscar por últimos 4. */
export function soloDigitos(s: string): string {
  return s.replace(/\D/g, "");
}

/** Últimos n dígitos del teléfono (normalizado). Si hay menos de n, devuelve todos. */
export function ultimosDigitos(s: string, n = 4): string {
  const d = soloDigitos(s);
  if (d.length <= n) return d;
  return d.slice(-n);
}
