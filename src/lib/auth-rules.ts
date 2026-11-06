// Field rules shared by the sign-in / sign-up / reset forms (live feedback in the
// browser) and their server actions (the real check). Dependency-free so it can
// load anywhere, including standalone scripts.

/** Minimum length for customer passwords (register, checkout sign-up, reset). */
export const MIN_PASSWORD = 8;

// name@domain.tld, strictly: local part of letters / digits / . _ % + - with no
// leading, trailing or doubled dots; after the @ letters only (owner's rule — no
// digits), labels that don't start or end with "-"; a TLD of 2–24 letters.
export const EMAIL_RE =
  /^[a-z0-9_%+-]+(?:\.[a-z0-9_%+-]+)*@(?:[a-z](?:[a-z-]{0,61}[a-z])?\.)+[a-z]{2,24}$/i;

// Real endings only: any 2-letter country code (.pk, .uk, .ae …) or one of
// these. Catches ".comm", ".con", ".cmo", ".coom" and friends.
const GENERIC_TLDS = new Set(
  "com net org edu gov mil int info biz name pro mobi asia aero coop jobs travel io co app dev me tv cc ai xyz online site store shop tech cloud live email digital agency studio design media news blog website space world life today company services solutions group global network systems academy center consulting".split(" ")
);
const TLD_TYPOS = new Set(["co", "cm", "om", "con", "cmo", "ocm", "comm", "coom", "vom", "xom", "cpm", "clm", "cim", "comn", "coml", "net1"]);

// Mailboxes people actually use — a near miss ("gmial.com", "gmail.co") is a typo.
const PROVIDERS = [
  "gmail.com", "googlemail.com", "yahoo.com", "ymail.com", "rocketmail.com", "hotmail.com", "outlook.com",
  "live.com", "msn.com", "icloud.com", "me.com", "aol.com", "protonmail.com", "proton.me", "mail.com", "zoho.com",
  "email.com", "gmx.com", "yandex.com",
];

function editDistance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  return d[a.length][b.length];
}

/** "ahmad@gmial.com" → "ahmad@gmail.com"; null when the domain looks deliberate. */
export function emailSuggestion(value: string): string | null {
  const v = value.trim().toLowerCase();
  const at = v.lastIndexOf("@");
  if (at < 1) return null;
  const domain = v.slice(at + 1);
  if (!domain || PROVIDERS.includes(domain)) return null;
  const sld = domain.split(".")[0];
  const tld = domain.slice(sld.length + 1);
  let best: string | null = null;
  let bestScore = Infinity;
  for (const p of PROVIDERS) {
    const pSld = p.split(".")[0];
    // Same provider name with a wrong ending (gmail.co, gmail.con, hotmail.comm) …
    if (sld === pSld && tld !== p.slice(pSld.length + 1) && (TLD_TYPOS.has(tld) || tld.startsWith("com") || tld === "")) return v.slice(0, at + 1) + p;
    // … or a misspelt provider name (gmial, gmai, yahooo, hotmial, outlok).
    if (pSld.length >= 5 && sld.length >= 4 && (tld === p.slice(pSld.length + 1) || TLD_TYPOS.has(tld))) {
      const dist = editDistance(sld, pSld);
      if (dist > 0 && dist <= 2 && dist < bestScore) [best, bestScore] = [p, dist];
    }
  }
  return best ? v.slice(0, at + 1) + best : null;
}

export function emailError(value: string): string | null {
  const v = value.trim();
  if (!v) return "Ingresa tu correo";
  if (/\s/.test(v)) return "El correo no puede tener espacios";
  const at = v.split("@").length - 1;
  if (at === 0) return "Falta el @, por ejemplo nombre@ejemplo.com";
  if (at > 1) return "El correo solo puede tener un @";
  const [local, domain] = v.split("@");
  if (!local) return "Escribe tu nombre antes del @";
  if (!domain) return "Agrega el dominio después del @, por ejemplo gmail.com";
  if (/[^a-z.-]/i.test(domain)) return "Usa solo letras después del @, por ejemplo gmail.com";
  if (!domain.includes(".")) return "Al dominio le falta una terminación, por ejemplo .com o .bo";
  if (v.length > 200 || local.length > 64 || !EMAIL_RE.test(v)) return "Ingresa un correo válido, por ejemplo nombre@ejemplo.com";
  const tld = domain.slice(domain.lastIndexOf(".") + 1).toLowerCase();
  const fix = emailSuggestion(v);
  if (fix) return `¿Quisiste decir ${fix}?`;
  if (tld.length !== 2 && !GENERIC_TLDS.has(tld)) return `".${tld}" no es una terminación real: revísala (ej. .com, .bo)`;
  return null;
}

// Letters in any script (Urdu too) plus spaces, dots, apostrophes and hyphens;
// starts with a letter.
export const NAME_RE = /^\p{L}[\p{L}\p{M} .'-]*$/u;

export function nameError(value: string): string | null {
  const v = value.trim();
  if (!v) return "Ingresa tu nombre";
  if (v.length < 2) return "El nombre es muy corto";
  if (v.length > 120) return "El nombre es muy largo";
  if (!NAME_RE.test(v)) return "Usa solo letras (espacios, . ' - están bien)";
  return null;
}

// Phone / WhatsApp. Bolivian numbers in any usual form — 71234567,
// 071234567, 591 71234567 or +591 71234567 — or any number with a "+" country
// code (E.164: 8–15 digits). Spaces and dashes are fine while typing.
export const PHONE_RE = /^\+[1-9]\d{7,14}$/;

/** Saved form: "071234567" / "591-71234567" → "+59171234567"; others lose spaces / dashes. */
export function normalizePhone(value: string): string {
  const v = value.trim().replace(/[\s-]/g, "");
  if (/^0\d{8}$/.test(v)) return `+591${v.slice(1)}`;
  if (/^591\d{8}$/.test(v)) return `+${v}`;
  return v;
}

export function phoneError(value: string): string | null {
  const v = value.trim().replace(/[\s-]/g, "");
  if (!v) return "Ingresa tu teléfono o WhatsApp";
  if (!/^\+?\d+$/.test(v)) return "Usa solo números (puedes empezar con +)";
  if (v.startsWith("0")) return /^0\d{8}$/.test(v) ? null : "Los números en Bolivia tienen 8 dígitos, como 71234567";
  if (v.startsWith("591")) return /^591\d{8}$/.test(v) ? null : "El código de Bolivia es +591, como +591 71234567";
  if (v.startsWith("+591")) return /^\+591\d{8}$/.test(v) ? null : "El código de Bolivia es +591, como +591 71234567";
  if (!v.startsWith("+")) return "Empieza con 0, 591 o tu código de país (como +44)";
  return PHONE_RE.test(v) ? null : "Escribe el número completo con código de país, como +591 71234567";
}

/** The checklist shown under a new-password field. */
export function passwordRules(value: string) {
  return [
    { id: "length", label: `Al menos ${MIN_PASSWORD} caracteres`, ok: value.length >= MIN_PASSWORD },
    { id: "letter", label: "Una letra", ok: /\p{L}/u.test(value) },
    { id: "number", label: "Un número", ok: /\d/.test(value) },
  ];
}

export function newPasswordError(value: string): string | null {
  if (!value) return "Elige una contraseña";
  if (value.length > 200) return "La contraseña es muy larga";
  const missing = passwordRules(value).find((r) => !r.ok);
  return missing ? `La contraseña necesita ${missing.label.toLowerCase()}` : null;
}

/** 0–4: drives the strength meter (rules met, plus a bonus for length / symbols). */
export function passwordStrength(value: string): number {
  if (!value) return 0;
  const met = passwordRules(value).filter((r) => r.ok).length;
  let score = met; // 0–3
  if (met === 3 && (value.length >= 12 || /[^\p{L}\d]/u.test(value))) score = 4;
  return score;
}
