import Image from "next/image";
import { Container } from "./container";

/**
 * Prova social da BlackGarage (primeiro cliente). Citações fiéis ao texto enviado
 * pela oficina: só cortes com "…" e pontuação. Não acrescentar palavras.
 */
const SUPPORTING_QUOTES = [
  {
    topic: "Organização",
    text: "Não havia coisas esquecidas, valores por dar, carros em fila de espera devido a falhas nas datas…",
  },
  {
    topic: "Orçamentos e margem",
    text: "Sem ela demorava o triplo do tempo para orçamentar… Consigo ter uma melhor percepção das margens de lucro, coisa que nunca tive.",
  },
  {
    topic: "Retorno",
    text: "Foi a melhor compra que fizemos para a oficina, de longe! Conseguimos reaver o gasto em pouquíssimo tempo.",
  },
];

export function TestimonialSection() {
  return (
    <section aria-labelledby="quem-ja-usa" className="bg-gold-tint">
      <Container className="grid grid-cols-1 gap-y-14 py-20 md:py-28 lg:grid-cols-12 lg:items-center lg:gap-x-6">
        <figure className="m-0 flex flex-col lg:col-span-7">
          <h2 id="quem-ja-usa" className="eyebrow m-0 font-normal">
            Quem já usa
          </h2>
          <span
            aria-hidden="true"
            className="display-serif -mb-14 mt-4 block h-[96px] text-[96px] leading-none text-accent md:-mb-24 md:h-[150px] md:text-[160px]"
          >
            “
          </span>
          <blockquote className="m-0">
            <p className="display-serif m-0 max-w-[640px] text-display-lg">
              Já não uso papel, a não ser para{" "}
              <em className="text-accent">limpar as mãos.</em>
            </p>
          </blockquote>
          <figcaption className="mt-9 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
            <Image
              src="/clientes/blackgarage.png"
              alt="BlackGarage"
              width={838}
              height={251}
              className="h-8 w-auto md:h-9"
            />
            <span className="font-mono sm:border-l sm:border-ink/20 sm:pl-4 text-[13px] leading-snug text-ink-muted">
              Oficina independente · a primeira a usar o DriveCell
            </span>
          </figcaption>
        </figure>

        <ul className="m-0 flex list-none flex-col gap-8 p-0 lg:col-span-4 lg:col-start-9">
          {SUPPORTING_QUOTES.map((quote) => (
            <li key={quote.topic}>
              <figure className="m-0 flex flex-col gap-3 border-t border-ink/20 pt-5">
                <span className="eyebrow">{quote.topic}</span>
                <blockquote className="m-0">
                  <p className="m-0 text-[17px] leading-[1.6] text-ink-2">
                    “{quote.text}”
                  </p>
                </blockquote>
                <figcaption className="sr-only">BlackGarage</figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
