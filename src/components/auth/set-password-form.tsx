"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { AuthError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { buttonClasses } from "@/components/marketing/button-link";
import { TERMS_REQUIRED_MESSAGE, TermsCheckbox } from "@/components/auth/terms-checkbox";
import { acceptCurrentTerms } from "@/lib/terms";

const MIN_LENGTH = 8;

/** needsTerms: primeira vez (convite) ou versão nova dos termos; numa recuperação de conta já aceite não aparece. */
function buildSchema(needsTerms: boolean) {
  return z
    .object({
      password: z
        .string()
        .min(MIN_LENGTH, `A palavra-passe precisa de pelo menos ${MIN_LENGTH} caracteres.`),
      confirm: z.string().min(1, "Repete a palavra-passe."),
      terms: z.boolean(),
    })
    .refine((values) => values.password === values.confirm, {
      path: ["confirm"],
      message: "As palavras-passe não coincidem.",
    })
    .refine((values) => !needsTerms || values.terms, {
      path: ["terms"],
      message: TERMS_REQUIRED_MESSAGE,
    });
}
type Values = z.infer<ReturnType<typeof buildSchema>>;

function mapError(error: AuthError): string {
  const code = error.code ?? "";
  const message = error.message.toLowerCase();
  if (code === "same_password" || message.includes("different from the old")) {
    return "A nova palavra-passe tem de ser diferente da atual.";
  }
  if (code === "weak_password" || message.includes("weak")) {
    return "Palavra-passe demasiado fraca. Usa uma mais longa ou menos comum.";
  }
  if (code === "session_not_found" || code === "session_expired" || message.includes("session")) {
    return "O link expirou. Pede um novo link de recuperação na página de entrada.";
  }
  if (error.status === 429) {
    return "Demasiadas tentativas. Espera um pouco e tenta outra vez.";
  }
  return "Não foi possível guardar a palavra-passe. Tenta outra vez dentro de momentos.";
}

const inputClass =
  "h-12 w-full rounded-[4px] border border-field bg-white px-3.5 font-sans text-[15px] text-ink placeholder:text-ink-muted/70 focus:outline-2 focus:outline-offset-1 focus:outline-ink aria-invalid:border-danger";
const fieldErrorClass = "m-0 text-[13px] text-danger";
const submitClass = `${buttonClasses("primary", "md")} w-full cursor-pointer disabled:cursor-wait disabled:opacity-70`;

const describedBy = (...ids: (string | false | undefined)[]) => ids.filter(Boolean).join(" ") || undefined;

export function SetPasswordForm({ email, needsTerms = false }: { email: string; needsTerms?: boolean }) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const schema = useMemo(() => buildSchema(needsTerms), [needsTerms]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirm: "", terms: false },
  });

  const onSubmit = async (values: Values) => {
    setFormError(null);
    const supabase = createClient();

    // Primeiro a aceitação (fica registada com a hora do servidor), depois a palavra-passe.
    if (needsTerms) {
      const termsError = await acceptCurrentTerms(supabase);
      if (termsError) {
        setFormError(termsError);
        return;
      }
    }

    const { error } = await supabase.auth.updateUser({ password: values.password });

    if (error) {
      setFormError(mapError(error));
      return;
    }

    setRedirecting(true);
    router.replace("/app");
    router.refresh();
  };

  const busy = isSubmitting || redirecting;

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-[22px]">
      <div className="flex flex-col gap-2.5">
        <span className="eyebrow">A tua conta</span>
        <h2 className="display-serif m-0 text-[40px] leading-[1.05] sm:text-[48px]">
          Define a tua palavra-passe
        </h2>
      </div>
      <p className="m-0 text-[16px] leading-[1.6] text-ink-2">
        É com ela que passas a entrar{email ? <> como <strong className="font-medium text-ink">{email}</strong></> : null}.
        Usa pelo menos {MIN_LENGTH} caracteres.
      </p>

      {/* Ajuda os gestores de palavras-passe a associar a conta. */}
      <input type="email" name="email" autoComplete="username" value={email} readOnly hidden />

      <div className="flex flex-col gap-2">
        <label htmlFor="sp-pass" className="text-[14px] font-medium">
          Nova palavra-passe
        </label>
        <input
          id="sp-pass"
          type="password"
          autoComplete="new-password"
          aria-invalid={errors.password ? true : undefined}
          aria-describedby={describedBy(errors.password && "sp-pass-error")}
          className={inputClass}
          {...register("password")}
        />
        {errors.password ? (
          <p id="sp-pass-error" className={fieldErrorClass}>
            {errors.password.message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="sp-confirm" className="text-[14px] font-medium">
          Confirmar palavra-passe
        </label>
        <input
          id="sp-confirm"
          type="password"
          autoComplete="new-password"
          aria-invalid={errors.confirm ? true : undefined}
          aria-describedby={describedBy(errors.confirm && "sp-confirm-error")}
          className={inputClass}
          {...register("confirm")}
        />
        {errors.confirm ? (
          <p id="sp-confirm-error" className={fieldErrorClass}>
            {errors.confirm.message}
          </p>
        ) : null}
      </div>

      {needsTerms ? <TermsCheckbox id="sp-terms" error={errors.terms?.message} {...register("terms")} /> : null}

      <div role="alert" className="empty:hidden">
        {formError ? (
          <p className="m-0 rounded-[4px] border border-danger/40 bg-danger-soft px-3.5 py-3 text-[14px] leading-[1.5] text-danger">
            {formError}
          </p>
        ) : null}
      </div>

      <button type="submit" disabled={busy} aria-busy={busy || undefined} className={submitClass}>
        {busy ? "A guardar…" : "Guardar e entrar"}
      </button>
    </form>
  );
}
