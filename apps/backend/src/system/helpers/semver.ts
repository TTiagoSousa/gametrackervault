// Versões no formato vX.Y.Z (as tags de release). Sem pré-releases de propósito:
// cada release é uma tag no main.
const VERSION = /^v(\d+)\.(\d+)\.(\d+)$/;

export function isVersion(value: string): boolean {
  return VERSION.test(value);
}

/** Negativo se a < b, zero se iguais, positivo se a > b. */
export function compareVersions(a: string, b: string): number {
  const pa = VERSION.exec(a);
  const pb = VERSION.exec(b);
  if (!pa || !pb) return a.localeCompare(b);
  for (let i = 1; i <= 3; i++) {
    const diff = Number(pa[i]) - Number(pb[i]);
    if (diff !== 0) return diff;
  }
  return 0;
}
