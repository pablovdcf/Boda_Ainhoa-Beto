export function normalizeToken(raw: string): string {
  return String(raw || "").trim();
}

export function isValidToken(raw: string): boolean {
  return /^[a-z0-9]{4,20}$/i.test(normalizeToken(raw));
}

export function isValidEmail(raw: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(raw || "").trim());
}

export function clampNumber(raw: unknown, min: number, max: number): number {
  const value = Number(raw);
  if (Number.isNaN(value)) return min;
  return Math.max(min, Math.min(max, value));
}

