import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";

export const metadata: Metadata = {
  title: "Criar a oficina — DriveCell Oficinas",
  description: "Dá um nome à tua oficina e começa os 7 dias de teste do DriveCell Oficinas, sem cartão.",
  robots: { index: false, follow: false },
};

// Depende da sessão: nunca pré-renderizar.
export const dynamic = "force-dynamic";

const TRIAL_DAYS = 7;

/** Data de fim prevista do teste (a real vem de `create_workshop`). */
function previewTrialEnd(): string {
  return new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/entrar?next=/onboarding");

  const { data: membership } = await supabase
    .from("workshop_members")
    .select("workshop_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (membership) redirect("/app");

  const termsVersion: unknown = user.user_metadata?.terms_version;
  const termsAccepted = typeof termsVersion === "string" && termsVersion.length > 0;

  return (
    <OnboardingFlow
      email={user.email ?? ""}
      termsAccepted={termsAccepted}
      trialEndsAtPreview={previewTrialEnd()}
    />
  );
}
