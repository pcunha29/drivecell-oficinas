"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { AuthError } from "@supabase/supabase-js";
import { safeNextPath } from "@/lib/safe-next-path";
import { createClient } from "@/lib/supabase/client";
import { buttonClasses } from "@/components/marketing/button-link";
import { Turnstile, TURNSTILE_SITE_KEY } from "@/components/auth/turnstile";

/** Página onde o link de recuperação (fluxo PKCE via /auth/callback) deixa o utilizador. */
const RESET_PASSWORD_PATH = "/conta/definir-palavra-passe";

const emailField = z
  .string()
  .trim()
  .min(1, "Indica o teu email.")
  .pipe(z.email("Indica um email válido."));

const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Indica a tua palavra-passe."),
});
type LoginValues = z.infer<typeof loginSchema>;

const recoverSchema = z.object({ email: emailField });
type RecoverValues = z.infer<typeof recoverSchema>;

const MESSAGES = {
  invalid: "Email ou palavra-passe incorretos.",
  unconfirmed: "Confirma primeiro o teu email - enviámos-te um link.",
  captcha: "A verificação de segurança falhou. Tenta outra vez.",
  captcha_missing: "Conclui a verificação de segurança antes de continuar.",
  rate_limit: "Demasiadas tentativas. Espera um pouco e tenta outra vez.",
  login_generic: "Não foi possível entrar. Tenta outra vez dentro de momentos.",
  recover_generic:
    "Não foi possível enviar o link. Tenta outra vez dentro de momentos.",
} as const;

function mapCommonError(error: AuthError): string | null {
  const code = error.code ?? "";
  const message = error.message.toLowerCase();
  if (code === "captcha_failed" || message.includes("captcha"))
    return MESSAGES.captcha;
  if (
    code === "over_email_send_rate_limit" ||
    code === "over_request_rate_limit" ||
    error.status === 429
  ) {
    return MESSAGES.rate_limit;
  }
  return null;
}

function mapLoginError(error: AuthError): string {
  const code = error.code ?? "";
  const message = error.message.toLowerCase();
  if (
    code === "invalid_credentials" ||
    message.includes("invalid login credentials")
  )
    return MESSAGES.invalid;
  if (code === "email_not_confirmed" || message.includes("email not confirmed"))
    return MESSAGES.unconfirmed;
  return mapCommonError(error) ?? MESSAGES.login_generic;
}

function mapRecoverError(error: AuthError): string {
  // Erros que revelariam se a conta existe não são mostrados (ver onRecover).
  return mapCommonError(error) ?? MESSAGES.recover_generic;
}

const inputClass =
  "h-12 w-full rounded-[4px] border border-field bg-white px-3.5 font-sans text-[15px] text-ink placeholder:text-ink-muted/70 focus:outline-2 focus:outline-offset-1 focus:outline-ink aria-invalid:border-danger";
const fieldErrorClass = "m-0 text-[13px] text-danger";
const textButtonClass =
  "cursor-pointer border-0 bg-transparent p-0 font-[inherit] underline hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";
const headingClass =
  "display-serif m-0 text-[40px] leading-[1.05] outline-none sm:text-[48px]";
const submitClass = `${buttonClasses("primary", "md")} w-full cursor-pointer disabled:cursor-wait disabled:opacity-70`;

/** Login com Google só aparece quando o provider está ativo no Supabase. */
const GOOGLE_ENABLED = process.env.NEXT_PUBLIC_AUTH_GOOGLE_ENABLED === "true";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8l4-3.1z"
      />
      <path
        fill="#EA4335"
        d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z"
      />
    </svg>
  );
}

/** Caixa de erro do mockup (borda laranja, fundo rosado). */
function ErrorBox({ message }: { message: string | null }) {
  return (
    <div role="alert" className="empty:hidden">
      {message ? (
        <p className="m-0 rounded-[4px] border border-danger/40 bg-danger-soft px-3.5 py-3 text-[14px] leading-[1.5] text-danger">
          {message}
        </p>
      ) : null}
    </div>
  );
}

const describedBy = (...ids: (string | false | undefined)[]) =>
  ids.filter(Boolean).join(" ") || undefined;

type Mode = "login" | "recover";

type LoginFormProps = {
  /** Caminho para onde ir depois do login (validado aqui). */
  next?: string;
  /** Mensagem vinda de `?error=` (ex.: falha no callback OAuth). */
  initialError?: string;
};

export function LoginForm({ next, initialError }: LoginFormProps) {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  // A mensagem de `?error=` só aparece na primeira visita ao modo de login.
  const [showInitialError, setShowInitialError] = useState(true);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const switched = useRef(false);

  useEffect(() => {
    if (switched.current) headingRef.current?.focus();
  }, [mode]);

  const switchTo = (target: Mode, currentEmail: string) => {
    switched.current = true;
    setShowInitialError(false);
    setEmail(currentEmail.trim());
    setMode(target);
  };

  return mode === "login" ? (
    <LoginMode
      headingRef={headingRef}
      next={safeNextPath(next)}
      initialError={showInitialError ? initialError : undefined}
      defaultEmail={email}
      onForgot={(currentEmail) => switchTo("recover", currentEmail)}
    />
  ) : (
    <RecoverMode
      headingRef={headingRef}
      defaultEmail={email}
      onBack={(currentEmail) => switchTo("login", currentEmail)}
    />
  );
}

type ModeProps = {
  headingRef: RefObject<HTMLHeadingElement | null>;
  defaultEmail: string;
};

function LoginMode({
  headingRef,
  next,
  initialError,
  defaultEmail,
  onForgot,
}: ModeProps & {
  next: string;
  initialError?: string;
  onForgot: (email: string) => void;
}) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(
    initialError ?? null,
  );
  const [googleLoading, setGoogleLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaResetKey, setCaptchaResetKey] = useState(0);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: defaultEmail, password: "" },
  });

  const onSubmit = async (values: LoginValues) => {
    setFormError(null);
    if (TURNSTILE_SITE_KEY && !captchaToken) {
      setFormError(MESSAGES.captcha_missing);
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
      options: { captchaToken: captchaToken ?? undefined },
    });

    // Os tokens do Turnstile só servem uma vez.
    if (TURNSTILE_SITE_KEY) setCaptchaResetKey((key) => key + 1);

    if (error) {
      setFormError(mapLoginError(error));
      return;
    }

    setRedirecting(true);
    router.replace(next);
    router.refresh();
  };

  const onGoogle = async () => {
    setFormError(null);
    setGoogleLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      setGoogleLoading(false);
      setFormError(MESSAGES.login_generic);
    }
    // Sem erro, o navegador é redirecionado para a Google.
  };

  const busy = isSubmitting || redirecting || googleLoading;

  return (
    <form
      noValidate
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-[22px]"
    >
      <div className="flex flex-col gap-2.5">
        <span className="eyebrow">Entrar</span>
        <h2 ref={headingRef} tabIndex={-1} className={headingClass}>
          Entra na tua oficina
        </h2>
      </div>

      {GOOGLE_ENABLED && (
        <>
          <button
            type="button"
            onClick={onGoogle}
            disabled={busy}
            className="flex h-[52px] cursor-pointer items-center justify-center gap-3 rounded-[4px] border border-ink bg-transparent font-sans text-[15px] font-medium text-ink transition-colors hover:bg-ink/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-wait disabled:opacity-70"
          >
            <GoogleIcon />
            {googleLoading ? "A abrir a Google…" : "Continuar com Google"}
          </button>

          <div
            className="flex items-center gap-3.5 text-[13px] text-ink-muted"
            aria-hidden="true"
          >
            <div className="h-px grow bg-line" />
            <span>ou com email</span>
            <div className="h-px grow bg-line" />
          </div>
        </>
      )}

      <div className="flex flex-col gap-2">
        <label htmlFor="l-email" className="text-[14px] font-medium">
          Email
        </label>
        <input
          id="l-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="oficina@exemplo.pt"
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={describedBy(errors.email && "l-email-error")}
          className={inputClass}
          {...register("email")}
        />
        {errors.email ? (
          <p id="l-email-error" className={fieldErrorClass}>
            {errors.email.message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-4">
          <label htmlFor="l-pass" className="text-[14px] font-medium">
            Palavra-passe
          </label>
          <button
            type="button"
            onClick={() => onForgot(getValues("email"))}
            className={`${textButtonClass} text-[13px] text-ink-muted`}
          >
            Esqueceste-te?
          </button>
        </div>
        <input
          id="l-pass"
          type="password"
          autoComplete="current-password"
          aria-invalid={errors.password ? true : undefined}
          aria-describedby={describedBy(errors.password && "l-pass-error")}
          className={inputClass}
          {...register("password")}
        />
        {errors.password ? (
          <p id="l-pass-error" className={fieldErrorClass}>
            {errors.password.message}
          </p>
        ) : null}
      </div>

      <ErrorBox message={formError} />

      <Turnstile onToken={setCaptchaToken} resetKey={captchaResetKey} />

      <button
        type="submit"
        disabled={busy}
        aria-busy={isSubmitting || redirecting || undefined}
        className={submitClass}
      >
        {isSubmitting || redirecting ? "A entrar…" : "Entrar"}
      </button>
    </form>
  );
}

function RecoverMode({
  headingRef,
  defaultEmail,
  onBack,
}: ModeProps & { onBack: (email: string) => void }) {
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (sent) headingRef.current?.focus();
  }, [sent, headingRef]);
  const [formError, setFormError] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaResetKey, setCaptchaResetKey] = useState(0);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<RecoverValues>({
    resolver: zodResolver(recoverSchema),
    defaultValues: { email: defaultEmail },
  });

  const onRecover = async (values: RecoverValues) => {
    setFormError(null);
    if (TURNSTILE_SITE_KEY && !captchaToken) {
      setFormError(MESSAGES.captcha_missing);
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(RESET_PASSWORD_PATH)}`,
      captchaToken: captchaToken ?? undefined,
    });

    if (TURNSTILE_SITE_KEY) setCaptchaResetKey((key) => key + 1);

    // Só mostramos erros que não revelam se a conta existe (captcha, limite,
    // falha de rede). Tudo o resto segue para a confirmação neutra.
    const status = error?.status ?? 0;
    if (error && (mapCommonError(error) || status < 400 || status >= 500)) {
      setFormError(mapRecoverError(error));
      return;
    }

    setSent(true);
  };

  const backButton = (
    <button
      type="button"
      onClick={() => onBack(getValues("email"))}
      className={`${textButtonClass} text-[14px] text-ink`}
    >
      Voltar a entrar
    </button>
  );

  if (sent) {
    return (
      <div className="flex flex-col gap-[22px]">
        <div className="flex flex-col gap-2.5">
          <span className="eyebrow">Recuperar palavra-passe</span>
          <h2 ref={headingRef} tabIndex={-1} className={headingClass}>
            Vê o teu email
          </h2>
        </div>
        <p role="status" className="m-0 text-[16px] leading-[1.6] text-ink-2">
          Se existir uma conta com este email, enviámos um link para definires
          uma nova palavra-passe.
        </p>
        <p className="m-0">{backButton}</p>
      </div>
    );
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit(onRecover)}
      className="flex flex-col gap-[22px]"
    >
      <div className="flex flex-col gap-2.5">
        <span className="eyebrow">Recuperar palavra-passe</span>
        <h2 ref={headingRef} tabIndex={-1} className={headingClass}>
          Esqueceste-te da palavra-passe?
        </h2>
      </div>
      <p className="m-0 text-[16px] leading-[1.6] text-ink-2">
        Indica o email da tua conta. Enviamos-te um link para definires uma nova
        palavra-passe.
      </p>

      <div className="flex flex-col gap-2">
        <label htmlFor="rc-email" className="text-[14px] font-medium">
          Email
        </label>
        <input
          id="rc-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="oficina@exemplo.pt"
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={describedBy(errors.email && "rc-email-error")}
          className={inputClass}
          {...register("email")}
        />
        {errors.email ? (
          <p id="rc-email-error" className={fieldErrorClass}>
            {errors.email.message}
          </p>
        ) : null}
      </div>

      <ErrorBox message={formError} />

      <Turnstile onToken={setCaptchaToken} resetKey={captchaResetKey} />

      <button
        type="submit"
        disabled={isSubmitting}
        aria-busy={isSubmitting || undefined}
        className={submitClass}
      >
        {isSubmitting ? "A enviar…" : "Enviar link"}
      </button>

      <p className="m-0 text-center">{backButton}</p>
    </form>
  );
}
