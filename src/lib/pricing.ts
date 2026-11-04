/**
 * Preços do DriveCell Oficinas (IVA incluído). Fonte única para o site e os termos.
 * Decisão de 26/09/2026: 49 €/mês, 490 €/ano.
 * Decisão de 07/10/2026: criar a conta e a formação inicial ficam incluídas para todos;
 * a importação dos dados que a oficina já tem é opcional (99 €, uma vez) e grátis
 * para quem começa no plano anual. Acabou o desconto "até ao 3.º mês".
 * Decisão de 04/11/2026: acaba a taxa de importação. Passar os clientes e viaturas
 * que a oficina já tem (ficheiro digital) fica incluído para todos.
 */
export const PRICING = {
  monthly: 49,
  yearly: 490,
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
  yearlyPerMonth: eur(Math.round((PRICING.yearly / 12) * 100) / 100),
} as const;

/** Frase curta sobre a configuração e a importação, por baixo do preço (landing e preços). */
export const SETUP_NOTE =
  "Sem custo de entrada: criamos a conta, ensinamos a tua equipa e passamos para a app os clientes e viaturas que já tens num Excel ou noutro programa. Está tudo incluído.";
