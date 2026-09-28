import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon, ButtonLink } from "@/components/marketing/button-link";
import { ContactSection } from "@/components/marketing/contact-section";
import { Container } from "@/components/marketing/container";
import { HeroBoard } from "@/components/marketing/hero-board";
import {
  HowItWorks,
  type HowItWorksStep,
} from "@/components/marketing/how-it-works";
import { PRICE_LABEL, PRICING, SETUP_NOTE } from "@/lib/pricing";
import { CONTACT_EMAIL, CONTACT_PHONE } from "@/lib/contact";
import { SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/site";
import { existsSync } from "node:fs";
import { join } from "node:path";

const title = "DriveCell Oficinas - Gestão simples para oficinas";
const description =
  "Ordens de reparação, clientes, viaturas e pagamentos num só quadro. Software simples para oficinas independentes, no computador ou no telemóvel. Pede uma demonstração.";

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  openGraph: {
    title,
    description,
    type: "website",
    locale: "pt_PT",
    siteName: "DriveCell Oficinas",
  },
};

const questions = [
  {
    q: "“De quem é este carro?”",
    a: "Pesquisa pela matrícula e vês o dono, o contacto e todas as reparações anteriores daquela viatura.",
  },
  {
    q: "“Isto já foi pago?”",
    a: "Cada ordem mostra se está paga. As entregues por cobrar ficam à vista, sem folhas soltas.",
  },
  {
    q: "“Quanto faturámos este mês?”",
    a: "O total do mês e a evolução ao longo do ano, calculados a partir das ordens entregues.",
  },
];

const steps = [
  {
    n: "01",
    title: "Cliente e viatura",
    text: "Registas o cliente uma vez, com os carros dele. Da próxima vez, está tudo lá.",
  },
  {
    n: "02",
    title: "Ordem de reparação",
    text: "Descreves o trabalho, acrescentas peças e mão de obra com quantidades e preços, e juntas notas internas.",
  },
  {
    n: "03",
    title: "Arrastar até “Entregue”",
    text: "Em espera, em curso, concluída, entregue. Arrastas o cartão e toda a equipa vê o ponto da situação.",
  },
];

/** Vídeos da demo (npm run demo:gravar + demo:converter). Sem vídeos, mostra os cartões. */
function stepsWithVideo(): HowItWorksStep[] | null {
  const dir = join(process.cwd(), "public", "demo");
  const withVideo = steps.map((step, i) => {
    const base = `passo-${i + 1}`;
    const ok = ["mp4", "webm", "jpg"].every((ext) =>
      existsSync(join(dir, `${base}.${ext}`)),
    );
    return ok
      ? {
          ...step,
          video: {
            mp4: `/demo/${base}.mp4`,
            webm: `/demo/${base}.webm`,
            poster: `/demo/${base}.jpg`,
          },
        }
      : null;
  });
  return withVideo.every(Boolean) ? (withVideo as HowItWorksStep[]) : null;
}

const features: { title: string; text: string; icon: React.ReactNode }[] = [
  {
    title: "Quadro de ordens",
    text: "Kanban com os quatro estados de uma reparação, com arrastar e largar.",
    icon: (
      <>
        <rect x="3" y="4" width="5" height="16" rx="1" />
        <rect x="10" y="4" width="5" height="10" rx="1" />
        <rect x="17" y="4" width="4" height="13" rx="1" />
      </>
    ),
  },
  {
    title: "Histórico por viatura",
    text: "Tudo o que foi feito a cada carro, pesquisável pela matrícula.",
    icon: (
      <>
        <path d="M5 17h14M6 17l1.5-5h9L18 17" />
        <circle cx="8" cy="18.5" r="1.5" />
        <circle cx="16" cy="18.5" r="1.5" />
        <path d="M9 12l1-3h4l1 3" />
      </>
    ),
  },
  {
    title: "Peças e mão de obra",
    text: "Linhas com quantidade e preço em cada ordem, com o total calculado.",
    icon: (
      <>
        <path d="M6 3h9l3 3v15H6z" />
        <path d="M9 10h6M9 14h6M9 18h3" />
      </>
    ),
  },
  {
    title: "Pago ou por pagar",
    text: "Marca cada ordem como paga e vê de relance o que está por cobrar.",
    icon: (
      <>
        <rect x="3" y="6" width="18" height="12" rx="2" />
        <path d="M3 10h18M7 15h3" />
      </>
    ),
  },
  {
    title: "Faturação mensal",
    text: "Totais por mês e por ano, em gráfico. Se registares o custo das peças, vês também a margem.",
    icon: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  },
  {
    title: "No telemóvel",
    text: "Pensado para ecrãs pequenos, para atualizar uma ordem sem sair da oficina.",
    icon: (
      <>
        <rect x="7" y="2" width="10" height="20" rx="2" />
        <path d="M11 18h2" />
      </>
    ),
  },
];

const faqs = [
  {
    q: "Preciso de instalar alguma coisa?",
    a: "Não. Funciona no navegador, no computador, tablet ou telemóvel. Nós configuramos a oficina e importamos os clientes e viaturas que já tens.",
  },
  {
    q: "Emite faturas certificadas?",
    a: "Não. Continuas a usar o teu programa de faturação. O DriveCell organiza o trabalho da oficina.",
  },
  {
    q: "Como começo?",
    a: "Marcas uma demonstração connosco. Se fizer sentido, configuramos a tua oficina e combinamos um período de experiência. Se no fim não continuares, a conta passa a só-leitura e não perdes nada.",
  },
  {
    q: "Os dados são meus?",
    a: "Sim. Exportas tudo quando quiseres, e os dados ficam alojados na União Europeia.",
  },
];

/** Dados estruturados (schema.org) para os motores de busca. */
const jsonLd = JSON.stringify({
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organizacao`,
      name: "DriveCell",
      legalName: "Flachbau Unipessoal, Lda",
      url: SITE_URL,
      logo: `${SITE_URL}/logos/logo-full-color.png`,
      email: CONTACT_EMAIL,
      telephone: CONTACT_PHONE,
      address: {
        "@type": "PostalAddress",
        addressLocality: "Paços de Ferreira",
        addressCountry: "PT",
      },
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${SITE_URL}/#app`,
      name: SITE_NAME,
      description:
        SITE_TAGLINE +
        " Ordens de reparação, clientes, viaturas e pagamentos num só quadro.",
      url: SITE_URL,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      inLanguage: "pt-PT",
      publisher: { "@id": `${SITE_URL}/#organizacao` },
      offers: [
        {
          "@type": "Offer",
          name: "Mensal",
          price: String(PRICING.monthly),
          priceCurrency: "EUR",
          url: `${SITE_URL}/precos`,
        },
        {
          "@type": "Offer",
          name: "Anual",
          price: String(PRICING.yearly),
          priceCurrency: "EUR",
          url: `${SITE_URL}/precos`,
        },
      ],
    },
  ],
}).replace(/</g, "\\u003c");

export default function LandingPage() {
  const videoSteps = stepsWithVideo();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      {/* Hero */}
      <Container className="grid grid-cols-1 items-center gap-y-14 pt-14 pb-20 md:pt-24 md:pb-28 lg:grid-cols-12 lg:gap-x-6">
        <div className="flex flex-col gap-7 md:gap-8 lg:col-span-6">
          <span className="eyebrow">Gestão para oficinas independentes</span>
          <h1 className="display-serif m-0 text-display-xl">
            A oficina organizada.
            <br />
            <em className="text-accent">Sem papelada.</em>
          </h1>
          <p className="m-0 max-w-[520px] text-lg leading-[1.55] text-ink-2 md:text-xl">
            Ordens de reparação, clientes, viaturas e pagamentos num só quadro.
            No computador da receção ou no telemóvel, ao lado do elevador.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <ButtonLink href="/#contacto">
              Pedir demonstração
              <ArrowRightIcon />
            </ButtonLink>
            <ButtonLink href="/precos" variant="ghost" className="px-5">
              Ver preços
            </ButtonLink>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1 font-mono text-[13px] text-ink-muted">
            <span>Configuramos por ti</span>
            <span aria-hidden="true">·</span>
            <span>Sem instalação</span>
            <span aria-hidden="true">·</span>
            <span>Sem fidelização</span>
          </div>
        </div>

        <div className="lg:col-span-5 lg:col-start-8">
          <HeroBoard />
        </div>
      </Container>

      {/* Três perguntas */}
      <section className="border-y border-line">
        <Container className="flex flex-col gap-12 py-16 md:gap-14 md:py-24">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between md:gap-12">
            <h2 className="display-serif m-0 max-w-[640px] text-display-md">
              Três perguntas que fazes todos os dias.
            </h2>
            <p className="m-0 max-w-[420px] text-[17px] leading-[1.6] text-ink-2">
              Com papel, quadro branco e WhatsApp, a resposta demora. Aqui fica
              a um toque.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-6">
            {questions.map((item) => (
              <div
                key={item.q}
                className="flex flex-col gap-3.5 border-t-2 border-ink pt-6"
              >
                <span className="display-serif text-[30px] leading-[1.15] italic md:text-[34px]">
                  {item.q}
                </span>
                <p className="m-0 text-base leading-[1.6] text-ink-2">
                  {item.a}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Como funciona */}
      <Container className="flex flex-col gap-12 py-20 md:gap-16 md:py-28">
        <div className="flex flex-col gap-4">
          <span className="eyebrow">Como funciona</span>
          <h2 className="display-serif m-0 text-display-md">
            Do telefonema à entrega, em três passos.
          </h2>
        </div>
        {videoSteps ? (
          <HowItWorks steps={videoSteps} />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
            {steps.map((step) => (
              <div
                key={step.n}
                className="flex flex-col gap-5 rounded-md border border-line bg-paper-card p-7 md:min-h-[280px] md:p-8"
              >
                <span className="display-serif text-[56px] leading-none text-accent md:text-[64px]">
                  {step.n}
                </span>
                <h3 className="m-0 text-[22px] font-semibold">{step.title}</h3>
                <p className="m-0 text-base leading-[1.6] text-ink-2">
                  {step.text}
                </p>
              </div>
            ))}
          </div>
        )}
      </Container>

      {/* Funcionalidades */}
      <section id="funcionalidades" className="bg-night text-on-dark">
        <Container className="flex flex-col gap-12 py-20 md:gap-16 md:py-28">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between md:gap-12">
            <div className="flex flex-col gap-4">
              <span className="eyebrow text-on-dark-3!">Funcionalidades</span>
              <h2 className="display-serif m-0 max-w-[700px] text-display-md">
                Só o que uma oficina pequena usa. Nada mais.
              </h2>
            </div>
            <p className="m-0 max-w-[380px] text-[17px] leading-[1.6] text-on-dark-2">
              Funciona no navegador. Não há nada para instalar nem servidores
              para manter.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 md:gap-12 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="flex flex-col gap-3.5 border-t border-night-line pt-6"
              >
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  className="text-accent-soft"
                >
                  {f.icon}
                </svg>
                <h3 className="m-0 text-xl font-semibold">{f.title}</h3>
                <p className="m-0 text-[15px] leading-[1.6] text-on-dark-2">
                  {f.text}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Preço */}
      <Container className="grid grid-cols-1 items-center gap-y-12 py-20 md:py-28 lg:grid-cols-12 lg:gap-x-6">
        <div className="flex flex-col gap-5 lg:col-span-5">
          <span className="eyebrow">Preço</span>
          <h2 className="display-serif m-0 text-display-md">
            Um plano. Tudo incluído.
          </h2>
          <p className="m-0 text-[17px] leading-[1.6] text-ink-2">
            Começas com um período de experiência combinado connosco. Depois,
            escolhes mensal ou anual e cancelas quando quiseres.
          </p>
          <p className="m-0 text-[15px] leading-[1.6] text-ink-muted">
            {SETUP_NOTE}
          </p>
          <Link
            href="/precos"
            className="inline-flex min-h-11 items-center self-start text-[15px] font-medium underline underline-offset-4 transition-colors hover:text-accent"
          >
            Ver o que está incluído
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-6 lg:col-start-7">
          <div className="flex flex-col gap-3 rounded-md border border-line bg-paper-card p-7 md:p-8">
            <div className="flex min-h-7 items-center">
              <span className="eyebrow">Mensal</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="display-serif text-[60px] leading-none md:text-[72px]">
                {PRICE_LABEL.monthly}
              </span>
              <span className="text-[15px] text-ink-muted">/ mês</span>
            </div>
            <span className="text-sm text-ink-muted">IVA incluído</span>
          </div>
          <div className="flex flex-col gap-3 rounded-md bg-night p-7 text-on-dark md:p-8">
            <div className="flex min-h-7 items-center justify-between gap-3">
              <span className="eyebrow text-on-dark-3!">Anual</span>
              <span className="rounded-[3px] bg-gold px-2 py-1 font-mono text-[11px] text-night">
                2 MESES GRÁTIS
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="display-serif text-[60px] leading-none md:text-[72px]">
                {PRICE_LABEL.yearly}
              </span>
              <span className="text-[15px] text-on-dark-2">/ ano</span>
            </div>
            <span className="text-sm text-on-dark-2">IVA incluído</span>
          </div>
        </div>
      </Container>

      {/* Perguntas frequentes */}
      <section id="perguntas" className="border-t border-line">
        <Container className="grid grid-cols-1 gap-y-10 py-20 md:py-28 lg:grid-cols-12 lg:gap-x-6">
          <div className="flex flex-col gap-4 lg:col-span-4">
            <span className="eyebrow">Perguntas</span>
            <h2 className="display-serif m-0 text-display-md">
              Antes de começares.
            </h2>
          </div>
          <div className="flex flex-col border-b border-line lg:col-span-7 lg:col-start-6">
            {faqs.map((item) => (
              <div
                key={item.q}
                className="flex flex-col gap-2.5 border-t border-line py-7"
              >
                <h3 className="m-0 text-xl font-semibold">{item.q}</h3>
                <p className="m-0 text-base leading-[1.6] text-ink-2">
                  {item.a}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Contacto / demonstração */}
      <ContactSection />
    </>
  );
}
