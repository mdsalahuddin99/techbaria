/**
 * Barcode helpers — fully offline.
 * Generates EAN-13 codes with a `200` prefix (in-store reserved range).
 */

/** Compute EAN-13 check digit for the first 12 digits. */
export function ean13CheckDigit(first12: string): number {
  if (!/^\d{12}$/.test(first12)) {
    throw new Error("ean13CheckDigit requires 12 digits");
  }
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const d = first12.charCodeAt(i) - 48;
    sum += i % 2 === 0 ? d : d * 3;
  }
  return (10 - (sum % 10)) % 10;
}

/** Returns true if the string is a valid EAN-13 code. */
export function isValidEan13(code: string): boolean {
  if (!/^\d{13}$/.test(code)) return false;
  return ean13CheckDigit(code.slice(0, 12)) === Number(code[12]);
}

/**
 * Generate a unique EAN-13 barcode in the in-store `200` range.
 * `existing` is the set of barcodes already used so we don't collide.
 */
export function generateEan13(existing: Iterable<string> = []): string {
  const used = new Set(existing);
  for (let attempt = 0; attempt < 50; attempt++) {
    // 200 + 9 random digits = 12, then check digit.
    let body = "200";
    for (let i = 0; i < 9; i++) body += Math.floor(Math.random() * 10);
    const code = body + String(ean13CheckDigit(body));
    if (!used.has(code)) return code;
  }
  // Fallback to timestamp-based, still valid EAN-13.
  const ts = String(Date.now()).slice(-9).padStart(9, "0");
  const body = "200" + ts;
  return body + String(ean13CheckDigit(body));
}
