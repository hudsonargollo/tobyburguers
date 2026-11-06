import type { Metadata } from "next";
import { BrandLogo } from "@/components/brand/logo";
import { ContactForm } from "@/components/contact-form";
import { getStoreSettings } from "@/lib/settings";
import { whatsappUrl, phoneHref } from "@/lib/settings-shared";
import { EmailLink } from "@/components/email-link";

export const metadata: Metadata = {
  title: "Contacto",
  description: "¿Dudas sobre tu pedido, delivery o un combo para tu evento? Escríbenos y te respondemos.",
  alternates: { canonical: "/contact" },
};

const TOPICS: Record<string, string> = {
  custom: "Pedido para evento",
};

export default async function ContactPage({ searchParams }: PageProps<"/contact">) {
  const sp = await searchParams;
  const raw = (Array.isArray(sp.topic) ? sp.topic[0] : sp.topic) ?? "";
  const topic = raw in TOPICS ? raw : undefined;
  const settings = await getStoreSettings();
  const CONTACT = { ...settings.contact, whatsappUrl: whatsappUrl(settings), phoneHref: phoneHref(settings) };

  return (
    <div className="mx-auto max-w-4xl px-5 py-16">
      <div className="text-center">
        <BrandLogo className="mx-auto h-11" />
        <span className="eyebrow mt-3 block">Estamos para ayudarte</span>
        <h1 className="mt-2 font-display text-4xl font-semibold text-ink sm:text-5xl">Contacto</h1>
        <p className="mx-auto mt-4 max-w-xl text-muted">
          {topic === "custom"
            ? "Cuéntanos qué combo necesitas — cuántas personas, qué te gustaría y para qué fecha — y nuestro equipo te contactará lo antes posible para coordinar disponibilidad, opciones y precio."
            : "¿Dudas sobre tu pedido, delivery o un combo para tu evento? Escríbenos, te respondemos con gusto."}
        </p>
      </div>

      <div className="mt-12 grid gap-10 md:grid-cols-[1fr_260px]">
        <ContactForm topic={topic} defaultSubject={topic ? TOPICS[topic] : undefined} />

        <aside className="space-y-6 text-sm">
          {CONTACT.email && (
            <div>
              <h3 className="eyebrow mb-2">Correo</h3>
              <EmailLink email={CONTACT.email} className="text-ink hover:text-accent-strong">
                {CONTACT.email}
              </EmailLink>
            </div>
          )}
          {CONTACT.phone && (
            <div>
              <h3 className="eyebrow mb-2">Teléfono</h3>
              <a href={CONTACT.phoneHref} className="text-ink hover:text-accent-strong">
                {CONTACT.phone}
              </a>
            </div>
          )}
          {CONTACT.whatsappUrl && (
            <div>
              <h3 className="eyebrow mb-2">WhatsApp</h3>
              <a href={CONTACT.whatsappUrl} target="_blank" rel="noopener noreferrer" className="text-ink hover:text-accent-strong">
                Escríbenos por WhatsApp →
              </a>
            </div>
          )}
          <div>
            <h3 className="eyebrow mb-2">Horario</h3>
            <p className="text-ink">{CONTACT.hours}</p>
          </div>
          <div>
            <h3 className="eyebrow mb-2">Ubicación</h3>
            <p className="text-ink">{CONTACT.city}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
