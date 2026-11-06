import { emailError, phoneError } from "./auth-rules";
import { PIECE_TYPES, FINISHES, BUDGETS } from "./custom-request";

// Field rules for the event-order and Contact forms: checked live in the
// browser and enforced again by the server actions (inbound-actions.ts).

type Validators = Record<string, (value: string) => string | null>;

/** 5–10 letters (A–Z), single spaces between words allowed. */
export const PERSON_NAME_RE = /^[A-Za-z]+(?: [A-Za-z]+)*$/;

export function personNameError(value: string): string | null {
  const v = value.trim();
  if (!v) return "Ingresa tu nombre";
  if (!PERSON_NAME_RE.test(v)) return /\s{2,}/.test(v) ? "Usa un solo espacio entre palabras" : "Usa solo letras (A–Z)";
  const letters = v.replace(/ /g, "").length;
  if (letters < 5) return "El nombre necesita al menos 5 letras";
  if (letters > 10) return "El nombre puede tener máximo 10 letras";
  return null;
}

const oneOf = (options: readonly string[], message: string) => (v: string) => (options.includes(v) ? null : message);
const optional = (rule: (v: string) => string | null) => (v: string) => (v.trim() ? rule(v) : null);
const maxLen = (n: number, message: string) => (v: string) => (v.trim().length > n ? message : null);
const textBetween = (min: number, max: number, short: string) => (v: string) => {
  const t = v.trim();
  if (t.length < min) return short;
  if (t.length > max) return `Máximo ${max.toLocaleString("es-BO")} caracteres`;
  return null;
};

export const CUSTOM_VALIDATORS: Validators = {
  name: personNameError,
  email: emailError,
  phone: phoneError,
  pieceType: oneOf(PIECE_TYPES, "Elige qué necesitas"),
  finish: oneOf(FINISHES, "Elige un formato"),
  budget: oneOf(BUDGETS, "Elige un presupuesto"),
  neededBy: maxLen(60, "Máximo 60 caracteres"),
  details: textBetween(10, 3000, "Cuéntanos un poco sobre tu pedido (al menos una frase)"),
};

export const CONTACT_VALIDATORS: Validators = {
  name: personNameError,
  email: emailError,
  phone: optional(phoneError),
  subject: maxLen(200, "Máximo 200 caracteres"),
  message: textBetween(5, 5000, "Escribe un mensaje breve (al menos 5 caracteres)"),
};

/** Runs the rules over submitted values: the bad fields (in form order) and the first message. */
export function checkFields(rules: Validators, values: Record<string, string>) {
  const fields = Object.keys(rules).filter((k) => rules[k](values[k] ?? ""));
  return fields.length ? { fields, error: rules[fields[0]](values[fields[0]] ?? "")! } : null;
}
