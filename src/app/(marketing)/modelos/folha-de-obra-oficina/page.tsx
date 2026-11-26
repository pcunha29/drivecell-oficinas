import type { Metadata } from "next";
import Image from "next/image";
import { ArrowRightIcon, ButtonLink, buttonClasses } from "@/components/marketing/button-link";
import { Container } from "@/components/marketing/container";
import { WhatsAppIcon } from "@/components/marketing/contact-icons";
import { TemplateDownloadLink } from "@/components/marketing/template-download-link";
import { TrackedContactLink } from "@/components/marketing/tracked-contact-link";
import type { TemplateFormat } from "@/lib/analytics/events";
import { whatsappUrl } from "@/lib/contact";
import { PRICING } from "@/lib/pricing";
import { SITE_NAME, SITE_URL } from "@/lib/site";

/**
 * Modelo grátis de folha de obra (SEO: "folha de obra oficina pdf/excel/word").
 * Os ficheiros em public/modelos/ são gerados por scripts/modelos/gerar-folha-de-obra.py.
 * Textos em "você", como o resto do marketing fora da página principal.
 */
const PATH = "/modelos/folha-de-obra-oficina";
const MODELO = "folha-de-obra";
const title = "Folha de obra para oficina: modelo grátis em PDF, Excel e Word";
const description =
  "Descarregue grátis uma folha de obra para oficina automóvel, pronta a imprimir ou a preencher no computador. Veja o que deve ter e um exemplo preenchido.";

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: PATH },
  openGraph: {
    title,
    description,
    type: "article",
    locale: "pt_PT",
    siteName: SITE_NAME,
    url: PATH,
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: SITE_NAME }],
  },
};

const DOWNLOADS: { formato: TemplateFormat; label: string; title: string; text: string }[] = [
  { formato: "pdf", label: "PDF", title: "Para imprimir", text: "A4, para preencher à mão." },
  { formato: "xlsx", label: "Excel", title: "Para o computador", text: "Soma as linhas, o IVA e o total." },
  { formato: "docx", label: "Word", title: "Com o nome da oficina", text: "Edite, ponha o logótipo e imprima." },
];

const FIELDS = [
  {
    title: "Número e datas",
    text: "Um número por folha, a data de entrada e quando prometeu entregar. Ajuda a encontrar a folha mais tarde e a cumprir o prazo.",
  },
  {
    title: "Cliente",
    text: "Nome e telefone, no mínimo. O NIF, se o cliente quiser a fatura com contribuinte.",
  },
  {
    title: "Viatura",
    text: "Matrícula, marca e modelo, ano e quilómetros à entrada. Os quilómetros ficam registados e servem para a próxima revisão.",
  },
  {
    title: "O que o cliente pediu",
    text: "Com as palavras do cliente («barulho a travar»), antes de qualquer diagnóstico. Evita discussões na entrega.",
  },
  {
    title: "Diagnóstico",
    text: "O que encontrou, incluindo o que não vai reparar agora mas convém avisar.",
  },
  {
    title: "Mão de obra e peças",
    text: "Cada trabalho com as horas e cada peça com a referência, a quantidade e o preço. É daqui que sai o valor a cobrar.",
  },
  {
    title: "Estado à entrada",
    text: "Riscos, amolgadelas e objetos deixados no carro. Dois minutos que poupam muitas conversas.",
  },
  {
    title: "Autorização do cliente",
    text: "O valor aprovado e até onde pode ir sem ligar. Com a assinatura do cliente, fica claro o que foi combinado.",
  },
];

const STEPS = [
  {
    title: "Na receção",
    text: "Preencha os dados, os quilómetros, o pedido e o estado do carro com o cliente à frente, e peça a assinatura.",
  },
  {
    title: "Durante a reparação",
    text: "Quem trabalha no carro aponta as peças e as horas no momento, não ao fim do dia.",
  },
  {
    title: "Antes de ligar ao cliente",
    text: "Some tudo primeiro: o cliente quer saber quanto é e quando está pronto.",
  },
  {
    title: "Na entrega",
    text: "Registe os quilómetros à saída e se ficou pago. Emita a fatura no seu programa de faturação e arquive a folha pela matrícula.",
  },
];

const DRIVECELL_POINTS = [
  "Todos os carros num quadro, de «em espera» a «entregue».",
  "Peças e horas na ordem de reparação, com o total calculado.",
  "O que está por cobrar, sempre à vista.",
  "O histórico de cada viatura, pela matrícula.",
];

const FAQ = [
  {
    q: "Folha de obra, ficha de trabalho e ordem de reparação são a mesma coisa?",
    a: "Na prática, sim. São nomes diferentes para o mesmo documento: o registo de um trabalho numa viatura, da entrada à entrega.",
  },
  {
    q: "Posso pôr o nome e o logótipo da oficina?",
    a: "Sim. No Word e no Excel escreve o nome no topo ou cola o logótipo. No PDF há um espaço para o carimbo da oficina.",
  },
  {
    q: "O modelo em Excel faz as contas?",
    a: "Sim. Multiplica as horas e as quantidades pelo preço, soma as peças e a mão de obra e calcula o IVA à taxa que escolher (vem com 23 %).",
  },
  {
    q: "Preciso de dar o meu email para descarregar?",
    a: "Não. Os três ficheiros descarregam-se diretamente, sem registo.",
  },
  {
    q: "A folha de obra serve de fatura?",
    a: "Não. É um documento interno da oficina. A fatura ao cliente tem de ser emitida num programa de faturação certificado.",
  },
];

const jsonLd = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Início", item: `${SITE_URL}/` },
    { "@type": "ListItem", position: 2, name: "Folha de obra para oficina", item: `${SITE_URL}${PATH}` },
  ],
}).replace(/</g, "\\u003c");

export default function FolhaDeObraPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />

      {/* Topo: o que é e os downloads */}
      <Container className="grid grid-cols-1 items-start gap-y-12 pt-14 pb-20 md:pt-20 md:pb-24 lg:grid-cols-12 lg:gap-x-6">
        <div className="flex flex-col gap-7 lg:col-span-6">
          <span className="eyebrow">Modelo grátis</span>
          <h1 className="display-serif m-0 text-display-lg">
            Folha de obra para oficina,{" "}
            <em className="text-accent">pronta a imprimir.</em>
          </h1>
          <p className="m-0 max-w-[560px] text-lg leading-[1.55] text-ink-2">
            A folha de obra, também chamada ficha de trabalho ou ordem de reparação, é onde fica
            escrito o que o cliente pediu, o que foi feito, as peças e as horas. Descarregue o
            modelo e comece a usá-lo amanhã.
          </p>

          <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-3" aria-label="Descarregar o modelo">
            {DOWNLOADS.map((d) => (
              <li key={d.formato}>
                <TemplateDownloadLink
                  modelo={MODELO}
                  formato={d.formato}
                  href={`/modelos/folha-de-obra-oficina.${d.formato}`}
                  className="group flex h-full flex-col gap-1.5 rounded-[6px] border border-night bg-paper-card p-4 transition-colors hover:bg-night hover:text-paper"
                >
                  <span className="flex items-center justify-between font-mono text-[13px] tracking-[0.08em] uppercase text-accent group-hover:text-accent-soft">
                    {d.label}
                    <DownloadIcon />
                  </span>
                  <span className="text-[17px] font-semibold">{d.title}</span>
                  <span className="text-sm leading-[1.45] text-ink-2 group-hover:text-on-dark-2">{d.text}</span>
                </TemplateDownloadLink>
              </li>
            ))}
          </ul>
          <p className="m-0 font-mono text-[13px] text-ink-muted">Grátis e sem registo.</p>
        </div>

        <figure className="m-0 flex flex-col gap-3 lg:col-span-5 lg:col-start-8">
          <Image
            src="/modelos/folha-de-obra-exemplo.png"
            alt="Exemplo de folha de obra preenchida à mão: cliente, viatura, pedido, mão de obra, peças e totais"
            width={1588}
            height={2246}
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
              Oito coisas que não podem faltar numa folha de obra.
            </h2>
          </div>
          <ol className="m-0 grid list-none grid-cols-1 gap-x-6 gap-y-9 p-0 sm:grid-cols-2 lg:grid-cols-4">
            {FIELDS.map((f, i) => (
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
              Como usar a folha de obra.
            </h2>
          </div>
          <div className="flex flex-col gap-8 lg:col-span-7 lg:col-start-6">
            <ol className="m-0 flex list-none flex-col border-b border-line p-0">
              {STEPS.map((s) => (
                <li key={s.title} className="flex flex-col gap-2 border-t border-line py-6">
                  <h3 className="m-0 text-xl font-semibold">{s.title}</h3>
                  <p className="m-0 text-base leading-[1.6] text-ink-2">{s.text}</p>
                </li>
              ))}
            </ol>
            <p className="m-0 border-l-2 border-gold pl-4 text-[15px] leading-[1.6] text-ink-2">
              <strong className="font-semibold text-ink">A folha de obra não é uma fatura.</strong> É um
              documento interno da oficina. A fatura ao cliente tem de ser emitida num programa de
              faturação certificado.
            </p>
          </div>
        </Container>
      </section>

      {/* Quando o papel deixa de chegar */}
      <section aria-labelledby="drivecell-titulo" className="bg-night text-on-dark">
        <Container className="grid grid-cols-1 gap-y-10 py-20 md:py-28 lg:grid-cols-12 lg:gap-x-6">
          <div className="flex flex-col gap-6 lg:col-span-6">
            <span className="eyebrow text-on-dark-3!">Quando o papel deixa de chegar</span>
            <h2 id="drivecell-titulo" className="display-serif m-0 text-display-md">
              A mesma folha de obra, <em className="text-accent-soft">no telemóvel.</em>
            </h2>
            <p className="m-0 max-w-[540px] text-[17px] leading-[1.6] text-on-dark-2">
              O papel funciona até ao dia em que precisa de saber que carros estão prontos, o que
              falta cobrar ou o que se fez naquele carro há dois anos. O {SITE_NAME} guarda tudo isso
              por si, no computador da receção ou no telemóvel.
            </p>
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
                href={whatsappUrl("Olá! Vi a folha de obra no site e gostava de experimentar o DriveCell.")}
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
            {FAQ.map((item) => (
              <div key={item.q} className="flex flex-col gap-2.5 border-t border-line py-7">
                <h3 className="m-0 text-xl font-semibold">{item.q}</h3>
                <p className="m-0 text-base leading-[1.6] text-ink-2">{item.a}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 2v8m0 0 3-3m-3 3L5 7M3 13h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
