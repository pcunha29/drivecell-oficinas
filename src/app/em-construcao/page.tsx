import type { Metadata } from "next";
import Link from "next/link";
import { DrivecellLogo } from "@/components/brand/drivecell-logo";
import { InterestForm } from "@/components/marketing/interest-form";
import { TeaserBoard } from "@/components/marketing/teaser-board";

/**
 * Página de espera mostrada em / e /precos enquanto o modo "em construção"
 * estiver ligado no /admin/site (reescrita feita no middleware).
 */
export const metadata: Metadata = {
  title: { absolute: "DriveCell Oficinas - Brevemente" },
  description:
    "Estamos a afinar uma ferramenta para a tua oficina. Deixa o email e sabe primeiro quando abrirmos.",
  robots: { index: false, follow: false },
};

export default function EmConstrucaoPage() {
  return (
    <div className="site min-h-dvh [color-scheme:dark]">
      <div className="relative flex min-h-dvh flex-col overflow-hidden bg-night text-on-dark">
        {/* Grelha subtil de fundo */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(to_right,#c8d1db_1px,transparent_1px),linear-gradient(to_bottom,#c8d1db_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(ellipse_at_70%_40%,#000_20%,transparent_75%)]"
        />

        <header className="relative mx-auto w-full max-w-[1440px] px-4 pt-6 sm:px-8 sm:pt-8 xl:px-12">
          <DrivecellLogo variant="white" height={24} product priority />
        </header>

        <main
          id="conteudo"
          className="relative mx-auto grid w-full max-w-[1440px] flex-1 items-center gap-12 px-4 py-10 sm:px-8 sm:py-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-16 xl:px-12"
        >
          <div className="flex flex-col gap-6">
            <p className="m-0 font-mono text-[12px] tracking-[0.16em] text-accent-soft uppercase">
              Brevemente
            </p>
            <h1 className="display-serif m-0 text-[44px] leading-[1.02] sm:text-[60px] xl:text-[72px]">
              Estamos a afinar uma coisa{" "}
              <em className="text-accent-soft">para a tua oficina.</em>
            </h1>
            <p className="m-0 max-w-[520px] text-[17px] leading-relaxed text-on-dark-2">
              Um quadro simples para saberes, a qualquer hora, que carros tens
              na oficina, o que falta fazer e quem já pagou. Deixa o email e és
              dos primeiros a experimentar.
            </p>
            <div className="pt-2">
              <InterestForm />
            </div>
          </div>

          <div className="mx-auto w-full max-w-[600px] lg:mx-0 lg:justify-self-end">
            <TeaserBoard />
          </div>
        </main>

        <footer className="relative mx-auto flex w-full max-w-[1440px] flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-night-line px-4 py-5 text-[13px] text-on-dark-3 sm:px-8 xl:px-12">
          <span>© {new Date().getFullYear()} DriveCell Oficinas</span>
          <span>
            Já és cliente?{" "}
            <Link
              href="/entrar"
              className="inline-flex min-h-11 items-center text-on-dark-2 underline underline-offset-4 hover:text-on-dark"
            >
              Entrar
            </Link>
          </span>
        </footer>
      </div>
    </div>
  );
}
