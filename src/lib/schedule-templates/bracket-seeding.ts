/** Orden clásico de cabezas de serie en bracket de tamaño potencia de 2 (1 vs último en mitades). */
export function bracketSeedLines(bracketSize: number): number[] {
  if (bracketSize < 2 || (bracketSize & (bracketSize - 1)) !== 0) {
    throw new Error("bracketSize debe ser potencia de 2 >= 2");
  }
  let lines = [1];
  while (lines.length < bracketSize) {
    const nextSize = lines.length * 2;
    const next: number[] = [];
    for (const s of lines) {
      next.push(s);
      next.push(nextSize + 1 - s);
    }
    lines = next;
  }
  return lines;
}

export function nextPowerOfTwo(n: number): number {
  if (n <= 1) return 1;
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}
