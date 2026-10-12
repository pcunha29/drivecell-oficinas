import type { Metadata } from "next";
import { AuthSplit } from "@/components/auth/auth-split";
import { ConfirmAccessForm } from "@/components/auth/confirm-access-form";
import { CONFIRM_MESSAGES, isOtpType } from "@/lib/auth-confirm";
import { safeNextPath } from "@/lib/safe-next-path";

export const metadata: Metadata = {
  title: "Confirmar acesso",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function firstParam(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

/**
 * Destino dos links de uso único (via /auth/confirm). Não usa o token ao abrir:
 * só o botão "Continuar" (POST) o troca por sessão, para as pré-visualizações não o gastarem.
 */
export default async function ContinuarPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const tokenHash = firstParam(params.token_hash);
  const type = firstParam(params.type);
  const next = safeNextPath(firstParam(params.next));
  const valid = Boolean(tokenHash) && isOtpType(type);

  return (
    <div className="min-h-dvh bg-paper text-ink">
      <AuthSplit
        headline={
          <>
            Falta só
            <br />
            <em className="text-accent-soft">um clique.</em>
          </>
        }
      >
        <ConfirmAccessForm
          tokenHash={tokenHash}
          type={type}
          next={next}
          initialError={valid ? null : CONFIRM_MESSAGES.expired}
        />
      </AuthSplit>
    </div>
  );
}
