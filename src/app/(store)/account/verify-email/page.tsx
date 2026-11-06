import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { OtpForm } from "@/components/auth/otp-form";
import { requireCustomer } from "@/lib/customer-auth";
import { getPending, maskEmail, resendWaitSeconds } from "@/lib/otp";
import { verifyEmailAction, resendEmailVerification } from "../../auth-actions";

export const metadata: Metadata = { title: "Verifica tu correo", robots: { index: false } };
export const dynamic = "force-dynamic";

// Email verification for an existing account (created before OTP, or at checkout).
export default async function VerifyEmailPage() {
  const session = await requireCustomer("/account");
  const pending = await getPending("verify");
  if (!pending || pending.email !== session.email.toLowerCase()) redirect("/account");
  const wait = await resendWaitSeconds(pending.email, "verify").catch(() => 0);

  return (
    <AuthShell backHref="/account" backLabel="Volver a la cuenta">
      <div className="text-center">
        <h1 className="font-display text-3xl font-bold text-ink">Verifica tu correo</h1>
      </div>
      <div className="mt-5">
        <OtpForm
          maskedEmail={maskEmail(pending.email)}
          verifyAction={verifyEmailAction}
          resendAction={resendEmailVerification}
          initialWait={wait}
          changeHref="/account"
          changeLabel="Volver a mi cuenta"
        />
      </div>
    </AuthShell>
  );
}
