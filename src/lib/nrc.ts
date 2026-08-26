export function formatNrc(input: string): string {
  const digits = input.replace(/\D/g, "").slice(0, 9);
  if (digits.length <= 6) return digits;
  if (digits.length <= 8) return `${digits.slice(0, 6)}/${digits.slice(6)}`;
  return `${digits.slice(0, 6)}/${digits.slice(6, 8)}/${digits.slice(8)}`;
}

export function normalizeNrc(input: string): string {
  return input.replace(/\D/g, "").slice(0, 9);
}

export function isValidNrc(input: string): boolean {
  return /^\d{6}\/\d{2}\/\d$/.test(input);
}

export function maskNrc(input: string): string {
  const normalized = normalizeNrc(input);
  if (normalized.length !== 9) return "******/**/*";
  return `******/**/${normalized.slice(-1)}`;
}
