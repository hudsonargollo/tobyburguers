import type { Metadata } from "next";

// The cart page is a client component, so its metadata lives here.
export const metadata: Metadata = {
  title: "Carrito",
  robots: { index: false },
};

export default function CartLayout({ children }: LayoutProps<"/cart">) {
  return children;
}
