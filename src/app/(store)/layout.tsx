import { ConditionalHeader } from "@/components/conditional-header";
import { ConditionalFooter } from "@/components/conditional-footer";
import { SupportChat } from "@/components/support-chat";
import { BranchPickerProvider } from "@/components/branch-picker";
import { getStoreSettings, renderAnnouncements } from "@/lib/settings";
import { getBranches, getSelectedBranch } from "@/lib/branch";

// Store-wide settings (Admin → Settings) are loaded once here and passed to the
// client-side header / footer / chat. Branches feed the location popup so it can
// open from any screen without a round-trip.
export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const [settings, branch, branches] = await Promise.all([
    getStoreSettings(),
    getSelectedBranch(),
    getBranches(),
  ]);

  return (
    <BranchPickerProvider
      branches={branches.map((b) => ({
        slug: b.slug,
        name: b.name,
        address: b.address,
        city: b.city,
        whatsapp: b.whatsapp,
        hours: b.hours,
        latitude: b.latitude,
        longitude: b.longitude,
        deliveryEnabled: b.deliveryEnabled,
        pickupEnabled: b.pickupEnabled,
      }))}
      selectedSlug={branch?.slug ?? null}
    >
      <ConditionalHeader
        announcements={renderAnnouncements(settings)}
        branch={branch ? { name: branch.name } : null}
      />
      <main className="flex-1">{children}</main>
      <ConditionalFooter settings={settings} />
      <SupportChat settings={settings} />
    </BranchPickerProvider>
  );
}
