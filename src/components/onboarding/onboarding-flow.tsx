"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { TERMS_VERSION } from "@/content/legal";
import { buttonClasses } from "@/components/marketing/button-link";
import { DrivecellLogo } from "@/components/brand/drivecell-logo";

const APP_PATH = "/app";

/* ------------------------------------------------------------------ */
/* Validação                                                           */
/* ------------------------------------------------------------------ */

const stripSeparators = (value: string) => value.replace(/[\s.\-()]/g, "");

/** Telefone PT (fixo/móvel, com ou sem +351) ou internacional com indicativo. Tolerante a espaços. */
export function isValidPhone(value: string): boolean {
  const digits = stripSeparators(value);
  return /^(?:\+351|00351)?[239]\d{8}$/.test(digits) || /^(?:\+|00)[1-9]\d{6,14}$/.test(digits);
}

/** NIF português: 9 dígitos e dígito de controlo (módulo 11). */
export function isValidNif(value: string): boolean {
  const nif = value.replace(/\s/g, "");
  if (!/^\d{9}$/.test(nif)) return false;
  let sum = 0;
  for (let i = 0; i < 8; i++) sum += Number(nif[i]) * (9 - i);
  const remainder = sum % 11;
  const check = remainder < 2 ? 0 : 11 - remainder;
  return check === Number(nif[8]);
}

const baseSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Indica o nome da oficina.")
    .min(2, "O nome tem de ter pelo menos 2 caracteres.")
    .max(80, "O nome pode ter no máximo 80 caracteres."),
  phone: z
    .string()
    .trim()
    .refine((value) => value === "" || isValidPhone(value), { error: "Indica um telefone válido (ex.: 912 345 678)." }),
  nif: z
    .string()
    .trim()
    .refine((value) => value === "" || /^\d{9}$/.test(value.replace(/\s/g, "")), {
      error: "O NIF tem 9 dígitos.",
    })
    .refine((value) => value === "" || !/^\d{9}$/.test(value.replace(/\s/g, "")) || isValidNif(value), {
      error: "Este NIF não é válido. Confirma os dígitos.",
    }),
  terms: z.boolean(),
});

type OnboardingValues = z.infer<typeof baseSchema>;

function makeSchema(requireTerms: boolean) {
  return baseSchema.superRefine((values, ctx) => {
    if (requireTerms && !values.terms) {
      ctx.addIssue({ code: "custom", path: ["terms"], message: "Tens de aceitar os termos para continuar." });
    }
  });
}

/* ------------------------------------------------------------------ */
/* Utilitários                                                         */
/* ------------------------------------------------------------------ */

const dateFormatter = new Intl.DateTimeFormat("pt-PT", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Europe/Lisbon",
});

/** "2 de outubro de 2026" */
function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso));
}

type CreatedWorkshop = { id: string; name: string; trial_ends_at: string };

const MESSAGES = {
  terms_required: "Tens de aceitar os termos para continuar.",
  invalid: "Confirma os dados da oficina e tenta outra vez.",
  generic: "Não foi possível criar a oficina. Tenta outra vez dentro de momentos.",
  demo_unavailable: "Os dados de exemplo ainda não estão disponíveis.",
} as const;

const inputClass =
  "h-12 w-full rounded-[4px] border border-field bg-white px-3.5 font-sans text-[15px] text-ink placeholder:text-ink-muted/70 focus:outline-2 focus:outline-offset-1 focus:outline-ink aria-invalid:border-danger";
const fieldErrorClass = "m-0 text-[13px] text-danger";
const inlineLinkClass = "text-ink underline hover:text-accent";
const headingClass = "display-serif m-0 text-display-lg leading-none outline-none";
const describedBy = (...ids: (string | false | undefined)[]) => ids.filter(Boolean).join(" ") || undefined;

/** Caixa de erro (igual à do login). */
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

/* ------------------------------------------------------------------ */
/* Cabeçalho e passos                                                  */
/* ------------------------------------------------------------------ */

const pagePadding = "mx-auto w-full max-w-[1440px] px-5 sm:px-10 xl:px-20";

function OnboardingHeader({ email }: { email: string }) {
  return (
    <header className="border-b border-line">
      <div className={`${pagePadding} flex h-16 items-center justify-between gap-4 sm:h-20`}>
        <DrivecellLogo height={24} product className="shrink-0" />
        <div className="flex min-w-0 items-center gap-4 text-[14px] text-ink-muted sm:gap-5">
          {email ? (
            <span className="hidden min-w-0 truncate sm:inline" title={email}>
              {email}
            </span>
          ) : null}
          <form action="/auth/signout" method="post" className="shrink-0">
            <button
              type="submit"
              className="cursor-pointer rounded-[2px] border-0 bg-transparent p-0 font-sans text-[14px] font-medium text-ink underline hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              Sair
              {email ? <span className="sr-only"> ({email})</span> : null}
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}

const steps = [
  { key: "account", label: "01 CONTA ✓", srLabel: "Passo 1: conta (concluído)" },
  { key: "workshop", label: "02 OFICINA", srLabel: "Passo 2: oficina" },
  { key: "start", label: "03 COMEÇAR", srLabel: "Passo 3: começar" },
] as const;

function StepIndicator({ current }: { current: "workshop" | "start" }) {
  return (
    <nav aria-label="Progresso" className={`${pagePadding} pt-8 sm:pt-10`}>
      <ol className="m-0 flex list-none items-center gap-3 p-0 font-mono sm:gap-8">
        {steps.map((step, index) => {
          const isCurrent = step.key === current;
          return (
            <li key={step.key} className="flex items-center gap-3 sm:gap-8">
              {index > 0 ? <span aria-hidden="true" className="h-px w-6 bg-line sm:w-12" /> : null}
              <span
                aria-current={isCurrent ? "step" : undefined}
                className={`text-[11px] tracking-[0.12em] whitespace-nowrap sm:text-[12px] ${
                  isCurrent ? "font-medium text-ink" : "text-ink-muted"
                }`}
              >
                <span aria-hidden="true">{step.label}</span>
                <span className="sr-only">{step.srLabel}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/* Cartão do teste                                                     */
/* ------------------------------------------------------------------ */

function TrialCard({ endDate }: { endDate: string }) {
  return (
    <aside
      aria-label="O teu período de teste"
      className="flex flex-col gap-4 rounded-[8px] bg-night p-6 text-on-dark sm:p-8 lg:col-span-5 lg:col-start-8 lg:gap-6 lg:p-10"
    >
      <span className="eyebrow text-on-dark-3!">O teu período de teste</span>
      <div className="flex items-baseline gap-3">
        <span className="font-serif text-[64px] leading-[0.9] lg:text-[96px]">7</span>
        <span className="text-[16px] text-on-dark-2 lg:text-[18px]">dias grátis</span>
      </div>
      <p className="m-0 text-[15px] leading-[1.6] text-on-dark-2">
        Começa quando criares a oficina e termina a <span className="text-on-dark">{endDate}</span>. Não pedimos
        cartão.
      </p>
      <div aria-hidden="true" className="hidden h-1.5 rounded-[3px] bg-night-line lg:flex">
        <div className="w-[4%] rounded-[3px] bg-accent-soft" />
      </div>
      <div className="flex flex-col gap-2.5 border-t border-night-line pt-4 text-[13px] leading-[1.5] text-on-dark-2 lg:pt-5 lg:text-[14px]">
        <span>Depois: 49 € / mês ou 490 € / ano, IVA incluído.</span>
        <span>Sem subscrição, a conta passa a só-leitura. Nada se perde.</span>
      </div>
    </aside>
  );
}

/* ------------------------------------------------------------------ */
/* Fluxo                                                               */
/* ------------------------------------------------------------------ */

type OnboardingFlowProps = {
  /** Email da conta com sessão iniciada. */
  email: string;
  /** Termos já aceites no registo (email). Utilizadores Google aceitam aqui. */
  termsAccepted: boolean;
  /** Fim previsto do teste (agora + 7 dias), calculado no servidor. */
  trialEndsAtPreview: string;
};

export function OnboardingFlow({ email, termsAccepted, trialEndsAtPreview }: OnboardingFlowProps) {
  const [created, setCreated] = useState<CreatedWorkshop | null>(null);

  return (
    <div className="flex min-h-dvh flex-col bg-paper text-ink">
      <OnboardingHeader email={email} />
      <StepIndicator current={created ? "start" : "workshop"} />
      {created ? (
        <DoneStep workshop={created} />
      ) : (
        <WorkshopStep
          termsAccepted={termsAccepted}
          trialEndsAtPreview={trialEndsAtPreview}
          onCreated={setCreated}
        />
      )}
    </div>
  );
}

function WorkshopStep({
  termsAccepted,
  trialEndsAtPreview,
  onCreated,
}: {
  termsAccepted: boolean;
  trialEndsAtPreview: string;
  onCreated: (workshop: CreatedWorkshop) => void;
}) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const requireTerms = !termsAccepted;
  const schema = useMemo(() => makeSchema(requireTerms), [requireTerms]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<OnboardingValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", phone: "", nif: "", terms: false },
  });

  const onSubmit = async (values: OnboardingValues) => {
    setFormError(null);
    const supabase = createClient();

    // Os termos têm de ficar na conta antes de criar a oficina:
    // `create_workshop` copia-os de auth.users para a oficina.
    if (requireTerms) {
      const { error } = await supabase.auth.updateUser({
        data: { terms_version: TERMS_VERSION, terms_accepted_at: new Date().toISOString() },
      });
      if (error) {
        setFormError(MESSAGES.generic);
        return;
      }
    }

    const { data, error } = await supabase.rpc("create_workshop", {
      p_name: values.name,
      p_phone: values.phone || null,
      p_nif: values.nif ? values.nif.replace(/\s/g, "") : null,
    });

    if (error) {
      const message = error.message;
      if (message.includes("workshop_exists")) {
        // Já tem oficina (ex.: outro separador). Segue para a app.
        router.replace(APP_PATH);
        router.refresh();
        return;
      }
      if (message.includes("terms_required")) {
        setFormError(MESSAGES.terms_required);
        return;
      }
      if (message.includes("invalid_")) {
        setFormError(MESSAGES.invalid);
        return;
      }
      setFormError(MESSAGES.generic);
      return;
    }

    const workshop = (Array.isArray(data) ? data[0] : data) as CreatedWorkshop | null;
    onCreated({
      id: workshop?.id ?? "",
      name: workshop?.name ?? values.name,
      trial_ends_at: workshop?.trial_ends_at ?? trialEndsAtPreview,
    });
  };

  return (
    <main className={`${pagePadding} grid grow grid-cols-1 items-start gap-10 pt-10 pb-16 sm:pt-14 lg:grid-cols-12 lg:gap-x-6 lg:pb-20`}>
      <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6 lg:col-span-6">
        <div className="flex flex-col gap-3">
          <h1 className={headingClass}>Como se chama a tua oficina?</h1>
          <p className="m-0 text-[16px] leading-[1.55] text-ink-2 sm:text-[17px]">
            Só precisamos disto para começar. Podes mudar tudo depois nas definições.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="o-name" className="text-[14px] font-medium">
            Nome da oficina
          </label>
          <input
            id="o-name"
            type="text"
            autoComplete="organization"
            placeholder="Ex.: Oficina Ferreira & Filhos"
            maxLength={80}
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={describedBy(errors.name && "o-name-error")}
            className={inputClass}
            {...register("name")}
          />
          {errors.name ? (
            <p id="o-name-error" className={fieldErrorClass}>
              {errors.name.message}
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="o-phone" className="text-[14px] font-medium">
              Telefone
            </label>
            <input
              id="o-phone"
              type="tel"
              autoComplete="tel"
              placeholder="912 345 678"
              aria-invalid={errors.phone ? true : undefined}
              aria-describedby={describedBy(errors.phone && "o-phone-error")}
              className={inputClass}
              {...register("phone")}
            />
            {errors.phone ? (
              <p id="o-phone-error" className={fieldErrorClass}>
                {errors.phone.message}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="o-nif" className="text-[14px] font-medium">
              NIF <span className="font-normal text-ink-muted">(opcional)</span>
            </label>
            <input
              id="o-nif"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="500 000 000"
              maxLength={11}
              aria-invalid={errors.nif ? true : undefined}
              aria-describedby={describedBy(errors.nif && "o-nif-error")}
              className={inputClass}
              {...register("nif")}
            />
            {errors.nif ? (
              <p id="o-nif-error" className={fieldErrorClass}>
                {errors.nif.message}
              </p>
            ) : null}
          </div>
        </div>

        {requireTerms ? (
          <div className="flex flex-col gap-2">
            <label className="flex items-start gap-3 text-[14px] leading-[1.5] text-ink-2">
              <input
                type="checkbox"
                aria-invalid={errors.terms ? true : undefined}
                aria-describedby={describedBy(errors.terms && "o-terms-error")}
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
              <p id="o-terms-error" className={fieldErrorClass}>
                {errors.terms.message}
              </p>
            ) : null}
          </div>
        ) : null}

        <ErrorBox message={formError} />

        <button
          type="submit"
          disabled={isSubmitting}
          aria-busy={isSubmitting || undefined}
          className={`${buttonClasses("primary", "md")} w-full cursor-pointer px-8 disabled:cursor-wait disabled:opacity-70 sm:w-auto sm:self-start`}
        >
          {isSubmitting ? "A criar oficina…" : "Criar oficina"}
        </button>
      </form>

      <TrialCard endDate={formatDate(trialEndsAtPreview)} />
    </main>
  );
}

const choiceClass =
  "flex w-full cursor-pointer flex-col gap-3 rounded-[6px] border border-line bg-paper-card p-6 text-left font-sans text-ink no-underline transition-colors hover:border-ink hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-wait disabled:opacity-70 sm:p-7";

function DoneStep({ workshop }: { workshop: CreatedWorkshop }) {
  const router = useRouter();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [loadingDemo, setLoadingDemo] = useState(false);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const goToApp = () => {
    router.push(APP_PATH);
    router.refresh();
  };

  const onDemo = async () => {
    setLoadingDemo(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("load_demo_data");
    if (error) {
      toast.error(MESSAGES.demo_unavailable);
    }
    goToApp();
  };

  const endDate = formatDate(workshop.trial_ends_at);

  return (
    <main className={`${pagePadding} flex grow flex-col gap-10 pt-10 pb-16 sm:pt-14 lg:pb-20`}>
      <div className="flex max-w-[760px] flex-col gap-3">
        <h1 ref={headingRef} tabIndex={-1} className={headingClass}>
          Está pronta. Por onde começas?
        </h1>
        <p role="status" className="m-0 text-[16px] leading-[1.55] text-ink-2 sm:text-[17px]">
          A <strong className="font-semibold text-ink [overflow-wrap:anywhere]">{workshop.name}</strong> foi criada. O teste termina
          a {endDate}.
        </p>
      </div>

      <div className="grid max-w-[1000px] grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
        <Link
          href={APP_PATH}
          aria-disabled={loadingDemo || undefined}
          className={`${choiceClass} ${loadingDemo ? "pointer-events-none opacity-70" : ""}`}
        >
          <span aria-hidden="true" className="font-serif text-[40px] leading-none text-accent sm:text-[48px]">
            01
          </span>
          <span className="text-[20px] font-semibold sm:text-[22px]">Criar o primeiro cliente</span>
          <span className="text-[15px] leading-[1.6] text-ink-2">
            Começas do zero com os teus clientes, viaturas e ordens reais.
          </span>
          <span className="mt-2 text-[14px] font-medium">Ir para o quadro →</span>
        </Link>

        <button
          type="button"
          onClick={onDemo}
          disabled={loadingDemo}
          aria-busy={loadingDemo || undefined}
          className={choiceClass}
        >
          <span aria-hidden="true" className="font-serif text-[40px] leading-none text-accent sm:text-[48px]">
            02
          </span>
          <span className="text-[20px] font-semibold sm:text-[22px]">Explorar com dados de exemplo</span>
          <span className="text-[15px] leading-[1.6] text-ink-2">
            Carregamos três clientes e algumas ordens para veres como funciona. Apagas tudo com um clique.
          </span>
          <span className="mt-2 text-[14px] font-medium">{loadingDemo ? "A carregar exemplo…" : "Carregar exemplo →"}</span>
        </button>
      </div>
    </main>
  );
}
