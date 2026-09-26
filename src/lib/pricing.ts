/**
 * Preços do DriveCell Oficinas (IVA incluído). Fonte única para o site e os termos.
 * Decisão de 26/09/2026: 49 €/mês, 490 €/ano, configuração 99 € (descontada
 * a quem passar para o plano anual até ao 3.º mês).
 */
export const PRICING = {
  monthly: 49,
  yearly: 490,
  setup: 99,
  /** Meses em que a passagem a anual desconta a configuração. */
  setupCreditMonths: 3,
} as const;

const eur = (n: number) =>
  new Intl.NumberFormat("pt-PT", {
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(n) + " €";

export const PRICE_LABEL = {
  monthly: eur(PRICING.monthly),
  yearly: eur(PRICING.yearly),
  setup: eur(PRICING.setup),
  yearlyPerMonth: eur(Math.round((PRICING.yearly / 12) * 100) / 100),
} as const;

/** Frase curta sobre a configuração, usada no site. */
export const SETUP_NOTE = `Configuração inicial de ${PRICE_LABEL.setup} (importação dos dados e formação), descontada se passares a anual até ao ${PRICING.setupCreditMonths}.º mês.`;
