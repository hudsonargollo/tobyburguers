import type { Metadata } from "next";
import { getBranches, getSelectedBranch } from "@/lib/branch";
import { getStoreSettings } from "@/lib/settings";
import { BranchMapExperience } from "@/components/branch-map/branch-map-experience";

export const metadata: Metadata = {
  title: "Mapa de sucursales",
  description:
    "Explora las sucursales de Toby en Santa Cruz y La Paz, ubica la más cercana y elige dónde preparar tu pedido.",
};

export const dynamic = "force-dynamic";

export default async function BranchMapPage({ searchParams }: PageProps<"/sucursal">) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.next) ? sp.next[0] : sp.next;
  const next = raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/shop";
  const [branches, selected, settings] = await Promise.all([
    getBranches(),
    getSelectedBranch(),
    getStoreSettings(),
  ]);

  return (
    <BranchMapExperience
      branches={branches.map((branch) => ({
        slug: branch.slug,
        name: branch.name,
        address: branch.address,
        city: branch.city,
        phone: branch.phone,
        whatsapp: branch.whatsapp,
        hours: branch.hours,
        image: branch.image,
        mapsUrl: branch.mapsUrl,
        latitude: branch.latitude,
        longitude: branch.longitude,
        deliveryEnabled: branch.deliveryEnabled,
        pickupEnabled: branch.pickupEnabled,
      }))}
      selectedSlug={selected?.slug ?? null}
      next={next}
      city={settings.contact.city}
    />
  );
}
