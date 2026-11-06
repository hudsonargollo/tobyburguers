import type { Metadata } from "next";
import { siteUrl } from "@/lib/site";
import "./globals.css";
import { CartProvider } from "@/components/cart/cart-provider";
import { ToastProvider } from "@/components/ui/toast";
import { FlashToast } from "@/components/ui/flash-toast";

// Type is self-hosted: Titan One (display) and DM Sans (body) are declared with
// @font-face in globals.css and served from /public/fonts under the SIL Open
// Font License, so the site carries no third-party licensed fonts.

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Toby ¡Mi Hamburguesa! | Hamburguesas en Santa Cruz",
    template: "%s | Toby ¡Mi Hamburguesa!",
  },
  description:
    "Hamburguesas clásicas, premium, plato, Philly, boxes, pollo y postres. Pide en línea con delivery de trasnoche en Santa Cruz o retira en tienda.",
  keywords: [
    "Toby ¡Mi Hamburguesa!",
    "hamburguesas Santa Cruz",
    "hamburguesa a domicilio",
    "combo de hamburguesas",
    "hamburguesa doble",
    "Philly cheesesteak",
    "balde de pollo",
    "comida rápida Santa Cruz",
    "delivery de trasnoche",
    "retiro en tienda",
    "sucursales Toby",
    "Santa Cruz",
    "Bolivia",
  ],
  applicationName: "Toby ¡Mi Hamburguesa!",
  openGraph: {
    title: "Toby ¡Mi Hamburguesa! | Hamburguesas en Santa Cruz",
    description:
      "Hamburguesas clásicas, premium, plato, Philly y boxes con delivery de trasnoche en Santa Cruz o retiro en tienda.",
    type: "website",
    siteName: "Toby ¡Mi Hamburguesa!",
    url: siteUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: "Toby ¡Mi Hamburguesa! | Hamburguesas en Santa Cruz",
    description:
      "Hamburguesas clásicas, premium, plato, Philly y boxes con delivery de trasnoche en Santa Cruz o retiro en tienda.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col bg-cream text-ink">
        <noscript>
          <style>{`.split-word{opacity:1 !important;filter:none !important;transform:none !important}`}</style>
        </noscript>
        {/* Apply saved theme before paint to avoid a flash of the wrong theme */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var t=localStorage.getItem('toby-theme');if(t==='dark'){document.documentElement.setAttribute('data-theme','dark');}else if(t==='light'){document.documentElement.setAttribute('data-theme','light');}}catch(e){}})();",
          }}
        />
        <ToastProvider>
          <FlashToast />
          <CartProvider>{children}</CartProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
