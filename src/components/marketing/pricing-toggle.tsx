"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { buttonClasses } from "@/components/marketing/button-link";
import { PRICE_LABEL, SETUP_NOTE } from "@/lib/pricing";

type Billing = "monthly" | "yearly";

const PLANS: Record<Billing, { price: string; period: string; note: string }> = {
  monthly: {
    price: PRICE_LABEL.monthly,
    period: "/ mês",
    note: "IVA incluído · faturado mensalmente",
  },
  yearly: {
    price: PRICE_LABEL.yearly,
    period: "/ ano",
    note: `IVA incluído · equivale a ${PRICE_LABEL.yearlyPerMonth} por mês`,
  },
};

const OPTIONS: { value: Billing; label: string }[] = [
  { value: "monthly", label: "Mensal" },
  { value: "yearly", label: "Anual · 2 meses grátis" },
];

type PricingToggleProps = {
  /** Conteúdo da coluna direita (lista do que está incluído), renderizado no servidor. */
  aside: ReactNode;
};

/**
 * Seletor Mensal/Anual + cartão de preço. O seletor fica no fim do hero
 * e o cartão logo abaixo, por isso o componente renderiza os dois blocos.
 */
export function PricingToggle({ aside }: PricingToggleProps) {
  const [billing, setBilling] = useState<Billing>("monthly");
  const plan = PLANS[billing];

  return (
    <>
      <div className="flex justify-center pt-10">
        <div
          role="group"
          aria-label="Periodicidade"
          className="flex gap-1 rounded-md bg-gold-tint p-1"
        >
          {OPTIONS.map((option) => {
            const active = billing === option.value;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                onClick={() => setBilling(option.value)}
                className={`h-10 cursor-pointer rounded-[3px] border-0 px-[18px] font-sans text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                  active
                    ? "bg-ink text-paper"
                    : "bg-transparent text-ink-2 hover:text-ink"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 pt-16 pb-20 lg:grid-cols-12 lg:items-stretch lg:pb-28">
        <div className="flex flex-col gap-8 rounded-lg bg-night p-7 text-on-dark sm:p-12 lg:col-span-6 lg:col-start-2">
          <div className="flex items-center justify-between gap-4">
            <span className="eyebrow text-on-dark-3!">DriveCell Oficinas</span>
            <span className="rounded-[3px] bg-gold px-2 py-1 font-mono text-[11px] text-night">
              CONFIGURAMOS POR TI
            </span>
          </div>

          <div className="flex flex-col gap-2" aria-live="polite">
            <p className="m-0 flex flex-wrap items-baseline gap-2.5">
              <span className="display-serif text-[88px] leading-[0.9] sm:text-[120px]">
                {plan.price}
              </span>
              <span className="text-lg text-on-dark-2">{plan.period}</span>
            </p>
            <p className="m-0 text-[15px] text-on-dark-2">{plan.note}</p>
          </div>

          <p className="m-0 border-t border-night-line pt-5 text-[14px] leading-[1.6] text-on-dark-2">
            {SETUP_NOTE}
          </p>

          <Link href="/#contacto" className={`${buttonClasses("light", "lg")} w-full`}>
            Pedir demonstração
          </Link>
          <p className="m-0 text-center font-mono text-xs text-on-dark-3">
            Sem fidelização · Cancela quando quiseres
          </p>
        </div>

        <div className="lg:col-span-4 lg:col-start-8">{aside}</div>
      </div>
    </>
  );
}
