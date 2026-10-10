// Versions in vX.Y.Z format (the release tags). No pre-releases on purpose:
// each release is a tag on main.
const VERSION = /^v(\d+)\.(\d+)\.(\d+)$/;

export function isVersion(value: string): boolean {
  return VERSION.test(value);
}

/** Negative if a < b, zero if equal, positive if a > b. */
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
