// Store contact details & social links — one place, configured via env (set in
// `.env`, see `.env.example`). Anything left blank is HIDDEN on the site instead
// of showing a placeholder number or a generic instagram.com link.
// NEXT_PUBLIC_* values are inlined at build time, so this is safe in client code.

/** Where the shop is — default address shown in the footer, contact page and chat. */
export const STORE_LOCATION = "Santa Cruz, Bolivia";

function clean(v: string | undefined): string {
  return (v ?? "").trim();
}

const whatsapp = clean(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER).replace(/[^0-9]/g, "");
const phone = clean(process.env.NEXT_PUBLIC_CONTACT_PHONE);

export const CONTACT = {
  /** International format, digits only (e.g. 59170000000). */
  whatsapp,
  whatsappUrl: whatsapp ? `https://wa.me/${whatsapp}` : "",
  /** Display format (e.g. "+591 70 000 000"). */
  phone,
  phoneHref: phone ? `tel:${phone.replace(/[^0-9+]/g, "")}` : "",
  email: clean(process.env.NEXT_PUBLIC_CONTACT_EMAIL),
  city: clean(process.env.NEXT_PUBLIC_CONTACT_CITY) || STORE_LOCATION,
  hours: clean(process.env.NEXT_PUBLIC_CONTACT_HOURS) || "Lunes a domingo · trasnoche en Cristóbal de Mendoza",
  instagram: clean(process.env.NEXT_PUBLIC_INSTAGRAM_URL),
  facebook: clean(process.env.NEXT_PUBLIC_FACEBOOK_URL),
  tiktok: clean(process.env.NEXT_PUBLIC_TIKTOK_URL),
} as const;
