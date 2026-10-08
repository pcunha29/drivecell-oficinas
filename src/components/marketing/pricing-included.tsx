const INCLUDED = [
  "Ordens de reparação, clientes e viaturas sem limite",
  "Quadro de ordens com arrastar e largar",
  "Peças e mão de obra em cada ordem",
  "Controlo do que está pago e por pagar",
  "Faturação por mês e por ano, com margem opcional",
  "Computador, tablet e telemóvel",
  "Exportação de todos os dados",
  "Alojamento na UE com cópias de segurança diárias",
  "Conta criada por nós e formação inicial da equipa",
  "Suporte por email e WhatsApp",
] as const;

function CheckIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="mt-[3px] shrink-0 text-accent"
    >
      <path d="M5 12l5 5L20 7" />
    </svg>
  );
}

/** Cartão "Está tudo incluído" da página de preços. */
export function PricingIncluded() {
  return (
    <div className="flex h-full flex-col gap-[18px] rounded-md border border-line bg-paper-card p-7 sm:p-10">
      <h2 className="eyebrow m-0 font-normal">Está tudo incluído</h2>
      <ul className="m-0 flex list-none flex-col gap-[18px] p-0">
        {INCLUDED.map((item) => (
          <li
            key={item}
            className="flex items-start gap-3 text-[15px] leading-[1.5] text-ink-2"
          >
            <CheckIcon />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
