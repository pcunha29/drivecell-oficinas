/**
 * Preços do DriveCell Oficinas (IVA incluído). Fonte única para o site e os termos.
 * Decisão de 26/09/2026: 49 €/mês, 490 €/ano.
 * Decisão de 07/10/2026: criar a conta e a formação inicial ficam incluídas para todos;
 * a importação dos dados que a oficina já tem é opcional (99 €, uma vez) e grátis
 * para quem começa no plano anual. Acabou o desconto "até ao 3.º mês".
 * Decisão de 04/11/2026: acaba a taxa de importação. Passar os clientes e viaturas
 * que a oficina já tem (ficheiro digital) fica incluído para todos.
 * Decisão de 06/11/2026: 39 €/mês, 349 €/ano (os mesmos valores dos produtos no Stripe).
 * Decisão de 06/11/2026: experiência de 30 dias para todos, com os dados da própria oficina, sem cartão.
 * Os termos (src/content/legal.ts, cláusula 04) têm os valores escritos à mão: atualizar lá também.
 */
export const PRICING = {
  monthly: 39,
  yearly: 349,
  /** Duração máxima da formação inicial incluída. */
  trainingHours: 1,
  /** Experiência gratuita (dias). Também é o valor por omissão em /admin/nova. */
  trialDays: 30,
} as const;

const eur = (n: number) =>
  new Intl.NumberFormat("pt-PT", {
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(n) + " €";

export const PRICE_LABEL = {
  monthly: eur(PRICING.monthly),
  yearly: eur(PRICING.yearly),
  yearlyPerMonth: eur(Math.round((PRICING.yearly / 12) * 100) / 100),
} as const;

/** Meses que se poupam no anual face a 12 mensalidades (arredondado): 349 € vs 12 × 39 € → 3. */
export const YEARLY_FREE_MONTHS = Math.round(
  (PRICING.monthly * 12 - PRICING.yearly) / PRICING.monthly,
);

/** "3 meses grátis" */
export const YEARLY_FREE_LABEL = `${YEARLY_FREE_MONTHS} ${YEARLY_FREE_MONTHS === 1 ? "mês grátis" : "meses grátis"}`;

/** "30 dias de experiência com os dados da tua oficina, sem cartão." */
export const TRIAL_NOTE = `${PRICING.trialDays} dias de experiência com os dados da tua oficina, sem cartão.`;

/**
 * Linha "não fatura" (topo da landing e perguntas): a primeira pergunta de quem vê o produto.
 * Honesta sobre a fase atual: sem faturas nem ligação ao programa de faturação, para já.
 */
export const INVOICING_NOTE =
  "Estamos a começar: para já não passa faturas nem se liga ao teu programa de faturação (Moloni, PHC, Primavera…), por isso continuas a faturar como hoje. A ligação a esses programas pode chegar no futuro.";

/** Frase curta sobre a configuração e a importação, por baixo do preço (landing e preços). */
export const SETUP_NOTE =
  "Sem custo de entrada: criamos a conta, ensinamos a tua equipa e passamos para a app os clientes e viaturas que já tens num Excel ou noutro programa. Está tudo incluído.";
