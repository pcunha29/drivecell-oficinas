import type { Metadata } from "next";
import { ChevronDown } from "lucide-react";
import { Container } from "@/components/marketing/container";
import {
  TERMS_UPDATED_AT,
  TERMS_VERSION,
  privacySections,
  termsClauses,
} from "@/content/legal";

export const metadata: Metadata = {
  title: "Termos e privacidade — DriveCell Oficinas",
  description:
    "Termos de serviço e política de privacidade do DriveCell Oficinas: período de experiência, preço e pagamento, cancelamento, dados dos teus clientes e os teus direitos ao abrigo do RGPD.",
};

const tocLinkClass =
  "block py-1.5 text-[14px] text-ink-2 transition-colors hover:text-accent focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

/** Espaço reservado para o header ao saltar para uma âncora. */
const anchorOffset = "scroll-mt-28";

function TocLinks() {
  return (
    <>
      <span className="eyebrow mb-2.5">Termos de serviço</span>
      <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
        {termsClauses.map((clause) => (
          <li key={clause.id}>
            <a href={`#${clause.id}`} className={tocLinkClass}>
              {Number(clause.number)}. {clause.title}
            </a>
          </li>
        ))}
      </ul>
      <span className="eyebrow mt-7 mb-2.5">Privacidade</span>
      <ul className="m-0 list-none p-0">
        <li>
          <a href="#privacidade" className={tocLinkClass}>
            Política de privacidade
          </a>
        </li>
      </ul>
    </>
  );
}

function Clause({
  id,
  number,
  title,
  body,
  last = false,
}: {
  id?: string;
  number?: string;
  title: string;
  body: string;
  last?: boolean;
}) {
  return (
    <div
      id={id}
      className={`flex flex-col gap-2.5 border-t border-line py-7 ${anchorOffset} ${
        last ? "border-b" : ""
      }`}
    >
      <h3 className="m-0 text-[18px] font-semibold text-ink sm:text-[19px]">
        {number ? (
          <span className="mr-2.5 font-mono text-[13px] font-normal text-accent">
            {number}
          </span>
        ) : null}
        {title}
      </h3>
      <p className="m-0 text-[16px] leading-[1.7] text-ink-2">{body}</p>
    </div>
  );
}

export default function TermosPage() {
  return (
    <>
      <section aria-labelledby="termos-titulo" className="border-b border-line">
        <Container>
          <div className="flex flex-col gap-[18px] pt-16 pb-10 lg:pt-[88px] lg:pb-14">
            <span className="eyebrow">Documentos legais</span>
            <h1
              id="termos-titulo"
              className="display-serif text-display-lg m-0 leading-none lg:text-[80px]"
            >
              Termos e privacidade
            </h1>
            <p className="m-0 font-mono text-[13px] text-ink-muted">
              Versão {TERMS_VERSION} · Última atualização {TERMS_UPDATED_AT}
            </p>
          </div>
        </Container>
      </section>

      <Container>
        <div className="grid grid-cols-1 items-start gap-y-8 pt-10 pb-16 lg:grid-cols-12 lg:gap-x-6 lg:pt-16 lg:pb-28">
          {/* Índice — mobile/tablet: colapsável acima do conteúdo */}
          <details className="group rounded-[4px] border border-line bg-paper-card lg:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-[15px] font-medium text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent [&::-webkit-details-marker]:hidden">
              Índice
              <ChevronDown
                aria-hidden="true"
                className="size-4 text-ink-muted transition-transform group-open:rotate-180"
              />
            </summary>
            <nav
              aria-label="Índice"
              className="flex flex-col border-t border-line px-5 pt-4 pb-3"
            >
              <TocLinks />
            </nav>
          </details>

          {/* Índice — desktop: fixo à esquerda */}
          <nav
            aria-label="Índice"
            className="sticky top-28 hidden flex-col lg:col-span-3 lg:flex"
          >
            <TocLinks />
          </nav>

          <div className="flex min-w-0 flex-col lg:col-start-5 lg:col-span-7">
            <h2 className="display-serif m-0 mb-3 text-[36px] leading-[1.1] lg:text-[44px]">
              Termos de serviço
            </h2>
            {termsClauses.map((clause) => (
              <Clause
                key={clause.id}
                id={clause.id}
                number={clause.number}
                title={clause.title}
                body={clause.body}
              />
            ))}

            <h2
              id="privacidade"
              className={`display-serif m-0 mt-14 mb-3 text-[36px] leading-[1.1] lg:mt-[72px] lg:text-[44px] ${anchorOffset}`}
            >
              Política de privacidade
            </h2>
            {privacySections.map((section, i) => (
              <Clause
                key={section.title}
                title={section.title}
                body={section.body}
                last={i === privacySections.length - 1}
              />
            ))}
          </div>
        </div>
      </Container>
    </>
  );
}
