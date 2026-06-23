// Normalize a phone number for matching: digits only, last 10 (ignores country
// code / formatting differences so "+1 (555) 123-4567" matches "5551234567").
export function normalizePhone(raw: string | null | undefined): string | null {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (digits.length < 7) return null;
  return digits.slice(-10);
}
