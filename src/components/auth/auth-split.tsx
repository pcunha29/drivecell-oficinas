import type { ReactNode } from "react";
import Link from "next/link";
import { DrivecellLogo } from "@/components/brand/drivecell-logo";

type AuthSplitProps = {
  /** Título serifado do painel escuro (h1). Visível em todos os tamanhos. */
  headline: ReactNode;
  /** Conteúdo extra do painel escuro (ex.: benefícios). Só a partir de 1024 px. */
  aside?: ReactNode;
  /** Nota no fundo do painel escuro. Só a partir de 1024 px. */
  asideFooter?: ReactNode;
  /** Versão compacta do `aside` para a faixa do telemóvel (abaixo de 1024 px). */
  mobileAside?: ReactNode;
  /** Canto superior direito do painel do formulário (ex.: "Já tens conta? Entrar"). */
  topRight?: ReactNode;
  /** Formulário / estado da página. */
  children: ReactNode;
};

/**
 * Ecrã dividido das páginas de autenticação: painel escuro à esquerda,
 * formulário à direita. Abaixo de 1024 px o painel escuro passa a uma faixa
 * compacta no topo (logótipo + título).
 */
export function AuthSplit({ headline, aside, asideFooter, mobileAside, topRight, children }: AuthSplitProps) {
  return (
    <div className="grid min-h-dvh grid-cols-1 grid-rows-[auto_1fr] lg:grid-cols-2 lg:grid-rows-1">
      <aside className="flex flex-col gap-5 bg-night px-5 pt-5 pb-7 text-on-dark sm:gap-6 sm:px-10 sm:pt-6 sm:pb-9 lg:justify-between lg:gap-10 lg:px-12 lg:py-12 xl:px-20">
        <Link
          href="/"
          aria-label="DriveCell Oficinas — início"
          className="flex w-fit items-center rounded-[2px] text-on-dark no-underline hover:text-on-dark focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent-soft"
        >
          <DrivecellLogo variant="white" height={24} product priority />
        </Link>

        <div className="flex flex-col gap-5 lg:gap-10">
          <h1 className="display-serif m-0 text-[34px] leading-[1.02] sm:text-[44px] lg:text-[60px] lg:leading-none xl:text-[72px]">
            {headline}
          </h1>
          {mobileAside ? <div className="lg:hidden">{mobileAside}</div> : null}
          {aside ? <div className="hidden lg:block">{aside}</div> : null}
        </div>

        {asideFooter ? <div className="hidden lg:block">{asideFooter}</div> : <span aria-hidden="true" className="hidden lg:block" />}
      </aside>

      <main className="flex flex-col px-5 pt-8 pb-10 sm:px-10 sm:pt-12 lg:px-12 lg:py-12 xl:px-20">
        {topRight ? (
          <div className="order-last mx-auto mt-10 flex w-full max-w-[440px] flex-wrap items-center justify-center gap-x-1.5 gap-y-1 border-t border-line pt-6 text-[14px] text-ink-muted lg:order-none lg:mx-0 lg:mt-0 lg:max-w-none lg:justify-end lg:border-0 lg:pt-0">
            {topRight}
          </div>
        ) : null}
        <div className="mx-auto w-full max-w-[440px] lg:my-auto lg:pt-10">{children}</div>
      </main>
    </div>
  );
}
