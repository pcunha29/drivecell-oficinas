/**
 * Preços do DriveCell Oficinas (IVA incluído). Fonte única para o site e os termos.
 * Decisão de 26/09/2026: 49 €/mês, 490 €/ano.
 * Decisão de 07/10/2026: criar a conta e a formação inicial ficam incluídas para todos;
 * a importação dos dados que a oficina já tem é opcional (99 €, uma vez) e grátis
 * para quem começa no plano anual. Acabou o desconto "até ao 3.º mês".
 */
export const PRICING = {
  monthly: 49,
  yearly: 490,
  /** Importação opcional de clientes e viaturas (uma vez; grátis no plano anual). */
  importFee: 99,
  /** Duração máxima da formação inicial incluída. */
  trainingHours: 1,
} as const;

const eur = (n: number) =>
  new Intl.NumberFormat("pt-PT", {
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(n) + " €";

export const PRICE_LABEL = {
  monthly: eur(PRICING.monthly),
  yearly: eur(PRICING.yearly),
  importFee: eur(PRICING.importFee),
  yearlyPerMonth: eur(Math.round((PRICING.yearly / 12) * 100) / 100),
} as const;

/** Frase curta sobre a configuração e a importação, por baixo do preço (landing e preços). */
export const SETUP_NOTE = `Sem custo de entrada: criamos a conta e ensinamos a tua equipa. Já tens clientes num Excel ou noutro programa? Passamos tudo por ${PRICE_LABEL.importFee} (uma vez, IVA incl.). No plano anual é grátis.`;
