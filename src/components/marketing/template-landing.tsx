import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRightIcon, ButtonLink, buttonClasses } from "@/components/marketing/button-link";
import { Container } from "@/components/marketing/container";
import { WhatsAppIcon } from "@/components/marketing/contact-icons";
import { TemplateDownloadLink } from "@/components/marketing/template-download-link";
import { TrackedContactLink } from "@/components/marketing/tracked-contact-link";
import type { TemplateFormat } from "@/lib/analytics/events";
import { whatsappUrl } from "@/lib/contact";
import { PRICING } from "@/lib/pricing";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { MODELOS, type Modelo } from "@/content/modelos";

/**
 * Página de um modelo grátis (folha de obra, ordem de reparação, orçamento).
 * Textos em "você", como o resto do marketing fora da página principal.
 */

type Item = { title: string; text: string };

export type TemplateLandingProps = {
  modelo: Modelo;
  titleStart: string;
  titleEm: string;
  intro: string;
  imageAlt: string;
  downloads: Record<TemplateFormat, Item>;
  fieldsHeading: string;
  fields: Item[];
  stepsHeading: string;
  steps: Item[];
  note: ReactNode;
  pitch: { heading: string; headingEm: string; text: string; whatsapp: string };
  faq: { q: string; a: string }[];
};

const FORMAT_LABEL: Record<TemplateFormat, string> = { pdf: "PDF", xlsx: "Excel", docx: "Word" };

const DRIVECELL_POINTS = [
  "Todos os carros num quadro, de «em espera» a «entregue».",
  "Peças e horas na ordem de reparação, com o total calculado.",
  "O que está por cobrar, sempre à vista.",
  "O histórico de cada viatura, pela matrícula.",
];

export function templateMetadata(m: Modelo, title: string, description: string): Metadata {
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: m.path },
    openGraph: {
      title,
      description,
      type: "article",
      locale: "pt_PT",
      siteName: SITE_NAME,
      url: m.path,
      images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: SITE_NAME }],
    },
  };
}

export function TemplateLanding(props: TemplateLandingProps) {
  const { modelo: m } = props;
  const others = MODELOS.filter((o) => o.id !== m.id);
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Início", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "Modelos grátis", item: `${SITE_URL}/modelos` },
      { "@type": "ListItem", position: 3, name: m.name, item: `${SITE_URL}${m.path}` },
    ],
  }).replace(/</g, "\\u003c");

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />

      {/* Topo: o que é e os downloads */}
      <Container className="grid grid-cols-1 items-start gap-y-12 pt-14 pb-20 md:pt-20 md:pb-24 lg:grid-cols-12 lg:gap-x-6">
        <div className="flex flex-col gap-7 lg:col-span-6">
          <span className="eyebrow">
            <Link href="/modelos" className="hover:text-accent">Modelos grátis</Link>
          </span>
          <h1 className="display-serif m-0 text-display-lg">
            {props.titleStart} <em className="text-accent">{props.titleEm}</em>
          </h1>
          <p className="m-0 max-w-[560px] text-lg leading-[1.55] text-ink-2">{props.intro}</p>

          <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-3" aria-label="Descarregar o modelo">
            {(Object.keys(FORMAT_LABEL) as TemplateFormat[]).map((formato) => (
              <li key={formato}>
                <TemplateDownloadLink
                  modelo={m.id}
                  formato={formato}
                  href={`/modelos/${m.file}.${formato}`}
                  className="group flex h-full flex-col gap-1.5 rounded-[6px] border border-night bg-paper-card p-4 transition-colors hover:bg-night hover:text-paper"
                >
                  <span className="flex items-center justify-between font-mono text-[13px] tracking-[0.08em] uppercase text-accent group-hover:text-accent-soft">
                    {FORMAT_LABEL[formato]}
                    <DownloadIcon />
                  </span>
                  <span className="text-[17px] font-semibold">{props.downloads[formato].title}</span>
                  <span className="text-sm leading-[1.45] text-ink-2 group-hover:text-on-dark-2">
                    {props.downloads[formato].text}
                  </span>
                </TemplateDownloadLink>
              </li>
            ))}
          </ul>
          <p className="m-0 font-mono text-[13px] text-ink-muted">Grátis e sem registo.</p>
        </div>

        <figure className="m-0 flex flex-col gap-3 lg:col-span-5 lg:col-start-8">
          <Image
            src={m.image.src}
            alt={props.imageAlt}
            width={m.image.width}
            height={m.image.height}
            sizes="(min-width: 1024px) 40vw, 100vw"
            className="h-auto w-full rounded-[4px] border border-line shadow-[0_18px_40px_-24px_rgba(13,44,74,0.45)]"
            priority
          />
          <figcaption className="text-sm text-ink-muted">Exemplo preenchido, com dados inventados.</figcaption>
        </figure>
      </Container>

      {/* O que deve ter */}
      <section aria-labelledby="campos-titulo" className="border-t border-line">
        <Container className="flex flex-col gap-12 py-16 md:py-24">
          <div className="flex flex-col gap-4">
            <span className="eyebrow">O que deve ter</span>
            <h2 id="campos-titulo" className="display-serif m-0 max-w-[760px] text-display-md">
              {props.fieldsHeading}
            </h2>
          </div>
          <ol className="m-0 grid list-none grid-cols-1 gap-x-6 gap-y-9 p-0 sm:grid-cols-2 lg:grid-cols-4">
            {props.fields.map((f, i) => (
              <li key={f.title} className="flex flex-col gap-2.5 border-t-2 border-ink pt-5">
                <span className="font-mono text-[13px] text-accent">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="m-0 text-xl font-semibold">{f.title}</h3>
                <p className="m-0 text-[15px] leading-[1.6] text-ink-2">{f.text}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* Como usar */}
      <section aria-labelledby="usar-titulo" className="border-t border-line">
        <Container className="grid grid-cols-1 gap-y-10 py-16 md:py-24 lg:grid-cols-12 lg:gap-x-6">
          <div className="flex flex-col gap-4 lg:col-span-4">
            <span className="eyebrow">No dia a dia</span>
            <h2 id="usar-titulo" className="display-serif m-0 text-display-md">
              {props.stepsHeading}
            </h2>
          </div>
          <div className="flex flex-col gap-8 lg:col-span-7 lg:col-start-6">
            <ol className="m-0 flex list-none flex-col border-b border-line p-0">
              {props.steps.map((s) => (
                <li key={s.title} className="flex flex-col gap-2 border-t border-line py-6">
                  <h3 className="m-0 text-xl font-semibold">{s.title}</h3>
                  <p className="m-0 text-base leading-[1.6] text-ink-2">{s.text}</p>
                </li>
              ))}
            </ol>
            <div className="m-0 border-l-2 border-gold pl-4 text-[15px] leading-[1.6] text-ink-2">{props.note}</div>
          </div>
        </Container>
      </section>

      {/* Quando o papel deixa de chegar */}
      <section aria-labelledby="drivecell-titulo" className="bg-night text-on-dark">
        <Container className="grid grid-cols-1 gap-y-10 py-20 md:py-28 lg:grid-cols-12 lg:gap-x-6">
          <div className="flex flex-col gap-6 lg:col-span-6">
            <span className="eyebrow text-on-dark-3!">Quando o papel deixa de chegar</span>
            <h2 id="drivecell-titulo" className="display-serif m-0 text-display-md">
              {props.pitch.heading} <em className="text-accent-soft">{props.pitch.headingEm}</em>
            </h2>
            <p className="m-0 max-w-[540px] text-[17px] leading-[1.6] text-on-dark-2">{props.pitch.text}</p>
          </div>
          <div className="flex flex-col gap-8 lg:col-span-5 lg:col-start-8">
            <ul className="m-0 flex list-none flex-col gap-3.5 p-0">
              {DRIVECELL_POINTS.map((point) => (
                <li key={point} className="flex gap-3 text-[17px] leading-[1.5]">
                  <span aria-hidden="true" className="mt-[9px] size-2 shrink-0 rotate-45 bg-accent-soft" />
                  {point}
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-3">
              <TrackedContactLink
                channel="whatsapp"
                origin="modelos"
                href={whatsappUrl(props.pitch.whatsapp)}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClasses("light", "md", "bg-paper hover:bg-white")}
              >
                <WhatsAppIcon />
                Experimentar {PRICING.trialDays} dias grátis
              </TrackedContactLink>
              <ButtonLink
                href="/"
                variant="ghost"
                className="border-on-dark-3 px-5 text-on-dark hover:bg-paper hover:text-night"
              >
                Ver como funciona
                <ArrowRightIcon />
              </ButtonLink>
            </div>
            <p className="m-0 text-sm leading-[1.55] text-on-dark-3">
              Com os dados da sua oficina e sem cartão. O {SITE_NAME} não emite faturas: continua a
              usar o seu programa de faturação.
            </p>
          </div>
        </Container>
      </section>

      {/* Perguntas */}
      <section aria-labelledby="perguntas-titulo">
        <Container className="grid grid-cols-1 gap-y-10 py-20 md:py-28 lg:grid-cols-12 lg:gap-x-6">
          <div className="flex flex-col gap-4 lg:col-span-4">
            <span className="eyebrow">Perguntas</span>
            <h2 id="perguntas-titulo" className="display-serif m-0 text-display-md">
              Sobre o modelo.
            </h2>
          </div>
          <div className="flex flex-col border-b border-line lg:col-span-7 lg:col-start-6">
            {props.faq.map((item) => (
              <div key={item.q} className="flex flex-col gap-2.5 border-t border-line py-7">
                <h3 className="m-0 text-xl font-semibold">{item.q}</h3>
                <p className="m-0 text-base leading-[1.6] text-ink-2">{item.a}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Outros modelos */}
      <section aria-labelledby="outros-titulo" className="border-t border-line">
        <Container className="flex flex-col gap-8 py-16 md:py-20">
          <h2 id="outros-titulo" className="display-serif m-0 text-[32px] leading-[1.05] md:text-[40px]">
            Outros modelos grátis.
          </h2>
          <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-2">
            {others.map((o) => (
              <li key={o.id}>
                <Link
                  href={o.path}
                  className="group flex h-full flex-col gap-2 rounded-[6px] border border-line bg-paper-card p-6 transition-colors hover:border-night"
                >
                  <span className="flex items-center justify-between text-xl font-semibold">
                    {o.name}
                    <ArrowRightIcon className="text-accent transition-transform group-hover:translate-x-1" />
                  </span>
                  <span className="text-[15px] leading-[1.55] text-ink-2">{o.summary}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </section>
    </>
  );
}

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M8 2v8m0 0 3-3m-3 3L5 7M3 13h10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
