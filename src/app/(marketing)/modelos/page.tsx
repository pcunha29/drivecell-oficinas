import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon } from "@/components/marketing/button-link";
import { Container } from "@/components/marketing/container";
import { MODELOS } from "@/content/modelos";
import { SITE_NAME } from "@/lib/site";

const title = "Modelos grátis para oficinas (PDF, Excel e Word)";
const description =
  "Modelos grátis para oficinas automóveis, em PDF, Excel e Word: folha de obra, ordem de reparação e orçamento. Prontos a imprimir, sem registo.";

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: "/modelos" },
  openGraph: {
    title,
    description,
    type: "website",
    locale: "pt_PT",
    siteName: SITE_NAME,
    url: "/modelos",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: SITE_NAME }],
  },
};

export default function ModelosPage() {
  return (
    <Container className="flex flex-col gap-12 pt-14 pb-20 md:gap-16 md:pt-20 md:pb-28">
      <div className="flex max-w-[720px] flex-col gap-6">
        <span className="eyebrow">Modelos grátis</span>
        <h1 className="display-serif m-0 text-display-lg">
          Modelos para a oficina, <em className="text-accent">prontos a imprimir.</em>
        </h1>
        <p className="m-0 text-lg leading-[1.55] text-ink-2">
          Folha de obra, ordem de reparação e orçamento, em PDF para imprimir, em Excel com as contas feitas e em
          Word para pôr o nome da oficina. Grátis e sem registo.
        </p>
      </div>
      <ul className="m-0 grid list-none grid-cols-1 gap-6 p-0 md:grid-cols-3">
        {MODELOS.map((m) => (
          <li key={m.id}>
            <Link
              href={m.path}
              className="group flex h-full flex-col gap-5 rounded-[6px] border border-line bg-paper-card p-5 transition-colors hover:border-night"
            >
              <Image
                src={m.image.src}
                alt=""
                width={m.image.width}
                height={m.image.height}
                sizes="(min-width: 768px) 30vw, 100vw"
                className="h-auto w-full rounded-[3px] border border-line"
              />
              <span className="flex items-center justify-between text-xl font-semibold">
                {m.name}
                <ArrowRightIcon className="text-accent transition-transform group-hover:translate-x-1" />
              </span>
              <span className="text-[15px] leading-[1.55] text-ink-2">{m.summary}</span>
              <span className="mt-auto font-mono text-[13px] text-ink-muted">PDF · Excel · Word</span>
            </Link>
          </li>
        ))}
      </ul>
    </Container>
  );
}
