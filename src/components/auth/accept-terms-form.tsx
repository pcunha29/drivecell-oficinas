"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { buttonClasses } from "@/components/marketing/button-link";
import { TERMS_REQUIRED_MESSAGE, TermsCheckbox } from "@/components/auth/terms-checkbox";
import { acceptCurrentTerms } from "@/lib/terms";

const submitClass = `${buttonClasses("primary", "md")} w-full cursor-pointer disabled:cursor-wait disabled:opacity-70`;

/** Aceitação dos termos para contas já ativas (primeiro acesso sem checkbox ou versão nova). */
export function AcceptTermsForm({ email, isUpdate }: { email: string; isUpdate: boolean }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    if (!checked) {
      setFieldError(TERMS_REQUIRED_MESSAGE);
      return;
    }
    setBusy(true);
    const error = await acceptCurrentTerms(createClient());
    if (error) {
      setFormError(error);
      setBusy(false);
      return;
    }
    router.replace("/app");
    router.refresh();
  };

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-[22px]">
      <div className="flex flex-col gap-2.5">
        <span className="eyebrow">A tua conta</span>
        <h2 className="display-serif m-0 text-[40px] leading-[1.05] sm:text-[48px]">
          {isUpdate ? "Atualizámos os termos" : "Antes de começares"}
        </h2>
      </div>
      <p className="m-0 text-[16px] leading-[1.6] text-ink-2">
        {isUpdate
          ? "Para continuares a usar o DriveCell Oficinas, lê e aceita a nova versão."
          : "Para usares o DriveCell Oficinas, lê e aceita os termos de utilização e a política de privacidade."}
        {email ? (
          <>
            {" "}
            Entraste como <strong className="font-medium text-ink">{email}</strong>.
          </>
        ) : null}
      </p>

      <TermsCheckbox
        id="at-terms"
        checked={checked}
        error={fieldError}
        onChange={(e) => {
          setChecked(e.target.checked);
          if (e.target.checked) setFieldError(undefined);
        }}
      />

      <div role="alert" className="empty:hidden">
        {formError ? (
          <p className="m-0 rounded-[4px] border border-danger/40 bg-danger-soft px-3.5 py-3 text-[14px] leading-[1.5] text-danger">
            {formError}
          </p>
        ) : null}
      </div>

      <button type="submit" disabled={busy} aria-busy={busy || undefined} className={submitClass}>
        {busy ? "A guardar…" : "Aceitar e continuar"}
      </button>

      <p className="m-0 text-center text-[14px] text-ink-muted">
        Não queres continuar?{" "}
        <a href="/auth/signout" className="font-medium text-ink underline underline-offset-2 hover:text-accent">
          Terminar sessão
        </a>
      </p>
    </form>
  );
}
