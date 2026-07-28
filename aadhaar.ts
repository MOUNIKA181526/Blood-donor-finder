// Verhoeff checksum for Aadhaar (self-declared verification only — no UIDAI call).
const d = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];
const p = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

export function digitsOnly(v: string) {
  return v.replace(/\D/g, "");
}

export function formatAadhaar(v: string) {
  const s = digitsOnly(v).slice(0, 12);
  return s.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

export function isValidAadhaar(v: string): boolean {
  const s = digitsOnly(v);
  if (s.length !== 12) return false;
  if (s[0] === "0" || s[0] === "1") return false; // UIDAI: cannot start with 0 or 1
  let c = 0;
  const rev = s.split("").reverse().map(Number);
  for (let i = 0; i < rev.length; i++) c = d[c][p[i % 8][rev[i]]];
  return c === 0;
}

export function aadhaarLast4(v: string) {
  return digitsOnly(v).slice(-4);
}
