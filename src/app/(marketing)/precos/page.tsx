import type { Metadata } from "next";
import { Container } from "@/components/marketing/container";
import { PricingIncluded } from "@/components/marketing/pricing-included";
import { PricingToggle } from "@/components/marketing/pricing-toggle";
import { PRICE_LABEL, PRICING } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "Preços — DriveCell Oficinas",
  description:
    `Um preço, tudo incluído: ${PRICE_LABEL.monthly} por mês ou ${PRICE_LABEL.yearly} por ano, IVA incluído. Pede uma demonstração do DriveCell Oficinas: configuramos a tua oficina e cancelas quando quiseres.`,
};

const START_STEPS = [
  {
    step: "01",
    title: "Demonstração",
    text: "Marcas uma conversa connosco e mostramos a app com os dados de uma oficina de exemplo.",
  },
  {
    step: "02",
    title: "Configuramos a oficina",
    text: "Criamos a conta da tua oficina, importamos os clientes e viaturas que já tens e recebes um convite por email para entrar.",
  },
  {
    step: "03",
    title: "Experimentas e decides",
    text: "Usas a app durante o período de experiência que combinarmos. Se não continuares, a conta passa a só-leitura e os dados ficam guardados.",
  },
] as const;

const FAQ = [
  {
    q: "Como pago?",
    a: "Por transferência bancária ou por cartão, com fatura emitida em cada período.",
  },
  {
    q: "Há fidelização?",
    a: "Não. Cancelas quando quiseres e manténs o acesso até ao fim do período pago.",
  },
  {
    q: "Há custo de configuração?",
    a: `Sim, ${PRICE_LABEL.setup} uma única vez. Inclui criar a conta da oficina, importar os clientes e viaturas que já tens e ensinar a equipa a usar a app.`,
  },
  {
    q: "Posso passar a anual?",
    a: `Sim, a qualquer momento. Se passares a anual até ao ${PRICING.setupCreditMonths}.º mês, descontamos os ${PRICE_LABEL.setup} da configuração.`,
  },
  {
    q: "E se um pagamento falhar?",
    a: "Avisamos por email e damos-te tempo para regularizar. Continuas a trabalhar entretanto.",
  },
] as const;

export default function PrecosPage() {
  return (
    <>
      <section aria-labelledby="precos-titulo">
        <Container>
          <div className="flex flex-col items-center gap-6 pt-16 text-center lg:pt-24">
            <span className="eyebrow">Preços</span>
            <h1
              id="precos-titulo"
              className="display-serif text-display-xl m-0 leading-none"
            >
              Um preço. <em className="text-accent">Sem letras pequenas.</em>
            </h1>
            <p className="m-0 max-w-[620px] text-[17px] leading-[1.55] text-ink-2 sm:text-[19px]">
              Tudo incluído, IVA incluído. Marcas uma demonstração, nós configuramos
              a oficina e só depois decides.
            </p>
          </div>
          <PricingToggle aside={<PricingIncluded />} />
        </Container>
      </section>

      <section
        aria-labelledby="comecar-titulo"
        className="border-t border-line"
      >
        <Container>
          <div className="flex flex-col gap-10 py-16 lg:gap-12 lg:py-24">
            <div className="flex flex-col gap-4">
              <span className="eyebrow">Como começamos</span>
              <h2
                id="comecar-titulo"
                className="display-serif text-display-md m-0 leading-[1.05]"
              >
                Nós tratamos da configuração.
              </h2>
            </div>
            <ol className="m-0 grid list-none grid-cols-1 gap-10 p-0 md:grid-cols-3 md:gap-6">
              {START_STEPS.map((step) => (
                <li
                  key={step.step}
                  className="flex flex-col gap-3 border-t-2 border-ink pt-6"
                >
                  <span className="font-mono text-[13px] text-accent">
                    {step.step}
                  </span>
                  <h3 className="m-0 text-[22px] font-semibold">{step.title}</h3>
                  <p className="m-0 text-base leading-[1.6] text-ink-2">
                    {step.text}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </Container>
      </section>

      <section
        aria-labelledby="pagamentos-titulo"
        className="border-t border-line"
      >
        <Container>
          <div className="grid grid-cols-1 gap-10 py-16 lg:grid-cols-12 lg:gap-x-6 lg:gap-y-0 lg:py-24">
            <div className="lg:col-span-4">
              <h2
                id="pagamentos-titulo"
                className="display-serif m-0 text-[36px] leading-[1.05] lg:text-[48px]"
              >
                Pagamentos e cancelamento.
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-x-10 gap-y-9 sm:grid-cols-2 lg:col-span-7 lg:col-start-6">
              {FAQ.map((item) => (
                <div key={item.q} className="flex flex-col gap-2">
                  <h3 className="m-0 text-lg font-semibold">{item.q}</h3>
                  <p className="m-0 text-[15px] leading-[1.6] text-ink-2">
                    {item.a}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
