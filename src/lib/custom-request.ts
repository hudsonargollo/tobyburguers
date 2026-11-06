// Options for the custom-order request form (shared by the form + server action).
export const PIECE_TYPES = ["Hamburguesas", "Combos", "Línea Premium", "Baldes de pollo", "Nuggets y alitas", "Philly", "Pedido para evento", "Otro"] as const;
export const FINISHES = ["Individual", "Combo personal", "Combo familiar", "Bandeja para compartir", "No estoy seguro"] as const;
export const BUDGETS = ["Menos de Bs 100", "Bs 100 – 300", "Bs 300 – 600", "Bs 600 o más", "No estoy seguro"] as const;

// Reference photos attached to a custom-order request.
export const MAX_REFERENCE_PHOTOS = 3;
/** Per photo, after the browser shrinks it (originals it can't shrink must fit too). */
export const MAX_REFERENCE_BYTES = 3 * 1024 * 1024;
/** Heading the server writes above the photo links in the saved message. */
export const REFERENCE_PHOTOS_HEADING = "Fotos de referencia:";

// Only links to our own reference uploads are treated as photos (a customer
// could type the heading into their description).
const OWN_REFERENCE_URL =
  /^(\/uploads\/references\/[a-z0-9-]+\.(jpg|png|webp|avif)|https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\/references\/[a-z0-9-]+\.(jpg|png|webp|avif))$/;

/** Splits a saved custom-request message into its text and reference-photo URLs. */
export function splitReferencePhotos(message: string): { text: string; photos: string[] } {
  const at = message.lastIndexOf(`\n${REFERENCE_PHOTOS_HEADING}\n`);
  if (at === -1) return { text: message, photos: [] };
  const lines = message.slice(at + REFERENCE_PHOTOS_HEADING.length + 2).split("\n").map((l) => l.trim());
  const photos = lines.filter((l) => OWN_REFERENCE_URL.test(l));
  if (photos.length === 0 || photos.length !== lines.filter(Boolean).length) return { text: message, photos: [] };
  return { text: message.slice(0, at).trimEnd(), photos };
}
