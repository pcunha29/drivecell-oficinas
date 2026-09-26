"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { AuthError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { TERMS_VERSION } from "@/content/legal";
import { buttonClasses } from "@/components/marketing/button-link";
import { Turnstile, TURNSTILE_SITE_KEY } from "@/components/auth/turnstile";

const signupSchema = z.object({
  name: z.string().trim().min(1, "Indica o teu nome."),
  email: z.string().trim().min(1, "Indica o teu email.").pipe(z.email("Indica um email válido.")),
  password: z.string().min(8, "A palavra-passe tem de ter pelo menos 8 caracteres."),
  terms: z.boolean().refine((value) => value === true, {
    error: "Tens de aceitar os termos para continuar.",
  }),
});

type SignupValues = z.infer<typeof signupSchema>;

type FormError = "exists" | "weak_password" | "captcha" | "captcha_missing" | "rate_limit" | "generic";

const AFTER_AUTH_PATH = "/onboarding";

function mapSignupError(error: AuthError): FormError {
  const code = error.code ?? "";
  const message = error.message.toLowerCase();
  if (code === "user_already_exists" || code === "email_exists" || message.includes("already registered")) {
    return "exists";
  }
  if (code === "weak_password" || message.includes("password")) return "weak_password";
  if (code === "captcha_failed" || message.includes("captcha")) return "captcha";
  if (code === "over_email_send_rate_limit" || code === "over_request_rate_limit" || error.status === 429) {
    return "rate_limit";
  }
  return "generic";
}

function ErrorMessage({ error }: { error: FormError }) {
  switch (error) {
    case "exists":
      return (
        <>
          Já existe uma conta com este email.{" "}
          <Link href="/entrar" className="font-medium text-ink underline hover:text-accent">
            Entra
          </Link>{" "}
          ou recupera a palavra-passe.
        </>
      );
    case "weak_password":
      return <>A palavra-passe é demasiado fraca. Usa pelo menos 8 caracteres, com letras e números.</>;
    case "captcha":
      return <>A verificação de segurança falhou. Tenta outra vez.</>;
    case "captcha_missing":
      return <>Conclui a verificação de segurança antes de continuar.</>;
    case "rate_limit":
      return <>Demasiadas tentativas. Espera um pouco e tenta outra vez.</>;
    default:
      return <>Não foi possível criar a conta. Tenta outra vez dentro de momentos.</>;
  }
}

const inputClass =
  "h-12 w-full rounded-[4px] border border-field bg-white px-3.5 font-sans text-[15px] text-ink placeholder:text-ink-muted/70 focus:outline-2 focus:outline-offset-1 focus:outline-ink aria-invalid:border-danger";
const fieldErrorClass = "m-0 text-[13px] text-danger";
const inlineLinkClass = "text-ink underline hover:text-accent";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8l4-3.1z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z" />
    </svg>
  );
}

export function SignupForm() {
  const router = useRouter();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [formError, setFormError] = useState<FormError | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaResetKey, setCaptchaResetKey] = useState(0);
  const doneHeadingRef = useRef<HTMLHeadingElement>(null);
  const formHeadingRef = useRef<HTMLHeadingElement>(null);
  const returnedToForm = useRef(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: "", email: "", password: "", terms: false },
  });

  useEffect(() => {
    if (sentTo) {
      doneHeadingRef.current?.focus();
    } else if (returnedToForm.current) {
      formHeadingRef.current?.focus();
    }
  }, [sentTo]);

  const redirectTo = () =>
    `${window.location.origin}/auth/callback?next=${encodeURIComponent(AFTER_AUTH_PATH)}`;

  const onSubmit = async (values: SignupValues) => {
    setFormError(null);
    if (TURNSTILE_SITE_KEY && !captchaToken) {
      setFormError("captcha_missing");
      return;
    }

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: {
          full_name: values.name,
          terms_version: TERMS_VERSION,
          terms_accepted_at: new Date().toISOString(),
        },
        emailRedirectTo: redirectTo(),
        captchaToken: captchaToken ?? undefined,
      },
    });

    // Os tokens do Turnstile só servem uma vez.
    if (TURNSTILE_SITE_KEY) setCaptchaResetKey((key) => key + 1);

    if (error) {
      setFormError(mapSignupError(error));
      return;
    }

    // Com confirmação de email ativa, um email já registado devolve um
    // utilizador sem identidades (e sem erro).
    if (data.user && data.user.identities?.length === 0) {
      setFormError("exists");
      return;
    }

    if (data.session) {
      setRedirecting(true);
      router.push(AFTER_AUTH_PATH);
      router.refresh();
      return;
    }

    setSentTo(values.email);
  };

  const onGoogle = async () => {
    setFormError(null);
    setGoogleLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirectTo() },
    });
    if (error) {
      setGoogleLoading(false);
      setFormError("generic");
    }
    // Sem erro, o navegador é redirecionado para a Google.
  };

  if (sentTo) {
    return (
      <div className="flex flex-col gap-[22px]">
        <div className="flex size-14 items-center justify-center rounded-full bg-night">
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="text-on-dark"
          >
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="M3 7l9 6 9-6" />
          </svg>
        </div>
        <h2
          ref={doneHeadingRef}
          tabIndex={-1}
          className="display-serif m-0 text-[40px] leading-[1.05] outline-none sm:text-[48px]"
        >
          Confirma o teu email
        </h2>
        <p className="m-0 text-[16px] leading-[1.6] text-ink-2" role="status">
          Enviámos um link para <strong className="font-semibold break-all text-ink">{sentTo}</strong>. Abre-o
          para ativar a conta e criar a tua oficina.
        </p>
        <p className="m-0 text-[14px] text-ink-muted">
          Não chegou? Vê a pasta de spam ou{" "}
          <button
            type="button"
            onClick={() => {
              returnedToForm.current = true;
              setSentTo(null);
            }}
            className="cursor-pointer border-0 bg-transparent p-0 font-[inherit] text-ink underline hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            tenta outra vez
          </button>
          .
        </p>
      </div>
    );
  }

  const busy = isSubmitting || redirecting || googleLoading;
  const describedBy = (...ids: (string | false | undefined)[]) => ids.filter(Boolean).join(" ") || undefined;

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-[22px]">
      <div className="flex flex-col gap-2.5">
        <span className="eyebrow">Criar conta</span>
        <h2
          ref={formHeadingRef}
          tabIndex={-1}
          className="display-serif m-0 text-[40px] leading-[1.05] outline-none sm:text-[48px]"
        >
          Começa o teu teste
        </h2>
      </div>

      <button
        type="button"
        onClick={onGoogle}
        disabled={busy}
        className="flex h-[52px] cursor-pointer items-center justify-center gap-3 rounded-[4px] border border-ink bg-transparent font-sans text-[15px] font-medium text-ink transition-colors hover:bg-ink/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-wait disabled:opacity-70"
      >
        <GoogleIcon />
        {googleLoading ? "A abrir a Google…" : "Continuar com Google"}
      </button>

      <div className="flex items-center gap-3.5 text-[13px] text-ink-muted" aria-hidden="true">
        <div className="h-px grow bg-line" />
        <span>ou com email</span>
        <div className="h-px grow bg-line" />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="r-name" className="text-[14px] font-medium">
          O teu nome
        </label>
        <input
          id="r-name"
          type="text"
          autoComplete="name"
          placeholder="Ex.: João Ferreira"
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={describedBy(errors.name && "r-name-error")}
          className={inputClass}
          {...register("name")}
        />
        {errors.name ? (
          <p id="r-name-error" className={fieldErrorClass}>
            {errors.name.message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="r-email" className="text-[14px] font-medium">
          Email
        </label>
        <input
          id="r-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="oficina@exemplo.pt"
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={describedBy(errors.email && "r-email-error")}
          className={inputClass}
          {...register("email")}
        />
        {errors.email ? (
          <p id="r-email-error" className={fieldErrorClass}>
            {errors.email.message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="r-pass" className="text-[14px] font-medium">
          Palavra-passe
        </label>
        <input
          id="r-pass"
          type="password"
          autoComplete="new-password"
          aria-invalid={errors.password ? true : undefined}
          aria-describedby={describedBy("r-pass-hint", errors.password && "r-pass-error")}
          className={inputClass}
          {...register("password")}
        />
        {errors.password ? (
          <p id="r-pass-error" className={fieldErrorClass}>
            {errors.password.message}
          </p>
        ) : null}
        <span id="r-pass-hint" className="text-[13px] text-ink-muted">
          Pelo menos 8 caracteres.
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <label className="flex items-start gap-3 text-[14px] leading-[1.5] text-ink-2">
          <input
            type="checkbox"
            aria-invalid={errors.terms ? true : undefined}
            aria-describedby={describedBy(errors.terms && "r-terms-error")}
            className="mt-px size-[18px] shrink-0 accent-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            {...register("terms")}
          />
          <span>
            Aceito os{" "}
            <Link href="/termos" target="_blank" className={inlineLinkClass}>
              Termos de serviço
              <span className="sr-only"> (abre num novo separador)</span>
            </Link>
            , o acordo de subcontratação e a{" "}
            <Link href="/termos#privacidade" target="_blank" className={inlineLinkClass}>
              Política de privacidade
              <span className="sr-only"> (abre num novo separador)</span>
            </Link>
            .
          </span>
        </label>
        {errors.terms ? (
          <p id="r-terms-error" className={fieldErrorClass}>
            {errors.terms.message}
          </p>
        ) : null}
      </div>

      <Turnstile onToken={setCaptchaToken} resetKey={captchaResetKey} />

      <button
        type="submit"
        disabled={busy}
        aria-busy={isSubmitting || undefined}
        className={`${buttonClasses("primary", "md")} w-full cursor-pointer disabled:cursor-wait disabled:opacity-70`}
      >
        {isSubmitting || redirecting ? "A criar conta…" : "Criar conta"}
      </button>

      <div role="alert" className="-mt-2 empty:hidden">
        {formError ? (
          <p className="m-0 rounded-[4px] border border-accent/30 bg-accent/5 px-3.5 py-3 text-[14px] leading-[1.5] text-ink-2">
            <ErrorMessage error={formError} />
          </p>
        ) : null}
      </div>
    </form>
  );
}
