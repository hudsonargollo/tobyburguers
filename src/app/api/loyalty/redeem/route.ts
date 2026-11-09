import { NextResponse } from "next/server";
import { z } from "zod";
import { getStoreSettings } from "@/lib/settings";
import { getCustomerSession } from "@/lib/customer-auth";
import { getSelectedBranch } from "@/lib/branch";
import { redeemReward } from "@/lib/loyalty";
import { clientIp, rateLimit, TOO_MANY } from "@/lib/rate-limit";

const body = z.object({
  rewardId: z.string().min(1).max(100),
});

// Buys one rewards-shop prize with the customer's points. The branch on screen
// is stored as the pickup location so the counter knows where to hand it over.
export async function POST(request: Request) {
  if (!rateLimit(`loyalty-redeem:${await clientIp()}`, 8, 60_000)) {
    return NextResponse.json({ ok: false, error: TOO_MANY }, { status: 429 });
  }
  const session = await getCustomerSession();
  if (!session) {
    return NextResponse.json(
      { ok: false, error: "Inicia sesión para canjear tus puntos.", signIn: true },
      { status: 401 }
    );
  }
  let parsed: z.infer<typeof body>;
  try {
    parsed = body.parse(await request.json());
  } catch {
    return NextResponse.json({ ok: false, error: "Cuerpo inválido" }, { status: 400 });
  }

  const [settings, branch] = await Promise.all([getStoreSettings(), getSelectedBranch()]);
  const result = await redeemReward({
    customerId: session.id,
    rewardId: parsed.rewardId,
    branchId: branch?.id ?? null,
    rules: settings.loyalty,
  });
  return NextResponse.json(result, { status: result.ok ? 201 : 400 });
}
