/**
 * Texto legal (termos de serviço e política de privacidade) do DriveCell Oficinas.
 * Fonte única: editar aqui. `TERMS_VERSION` deve ser guardado quando um
 * utilizador aceita os termos (ex.: no registo).
 */

export const TERMS_VERSION = "[VERSÃO]";
export const TERMS_UPDATED_AT = "[DATA]";

export type TermsClause = {
  /** Âncora na página /termos (ex.: "t1"). */
  id: string;
  /** Número apresentado (ex.: "01"). */
  number: string;
  title: string;
  body: string;
};

export type PrivacySection = {
  title: string;
  body: string;
};

export const termsClauses: readonly TermsClause[] = [
  {
    id: "t1",
    number: "01",
    title: "Quem somos",
    body: "O DriveCell Oficinas é prestado pela Flachbau Unipessoal, Lda, NIF 518094650, com sede em Paços de Ferreira. Contacto: pcunhadev@gmail.com.",
  },
  {
    id: "t2",
    number: "02",
    title: "O serviço",
    body: "Uma aplicação web para oficinas gerirem clientes, viaturas, ordens de reparação e pagamentos. Destina-se a empresas e profissionais. Não emite faturas certificadas nem substitui o programa de faturação da oficina.",
  },
  {
    id: "t3",
    number: "03",
    title: "Conta e teste gratuito",
    body: "A conta de cada oficina é criada por nós, depois de uma demonstração, e o acesso é enviado por email ao responsável. Pode haver um período de experiência gratuito, combinado caso a caso. Sem subscrição ativa, a conta passa a só-leitura: consultas e exportas os dados, mas não crias nem alteras registos.",
  },
  {
    id: "t4",
    number: "04",
    title: "Preço e pagamento",
    body: "49 € por mês ou 490 € por ano, IVA incluído, pagos no início de cada período pelo meio de pagamento combinado. A configuração inicial (criação da conta, importação de dados e formação) custa 99 €, pagos uma única vez, e é descontada se a oficina passar ao plano anual até ao 3.º mês. A subscrição renova-se automaticamente. Alterações de preço são avisadas com pelo menos 30 dias de antecedência.",
  },
  {
    id: "t5",
    number: "05",
    title: "Cancelamento",
    body: "Não há fidelização. Cancelas na área de subscrição e manténs o acesso até ao fim do período pago, sem reembolso proporcional. Após o fim, os dados ficam em só-leitura durante 90 dias e são depois eliminados.",
  },
  {
    id: "t6",
    number: "06",
    title: "Dados dos teus clientes",
    body: "Os dados que registas sobre os clientes da oficina pertencem à oficina, que é responsável pelo seu tratamento. Nós tratamo-los apenas para prestar o serviço, como subcontratante, nos termos do artigo 28.º do RGPD e do acordo de subcontratação anexo a estes termos.",
  },
  {
    id: "t7",
    number: "07",
    title: "Responsabilidade",
    body: "Fazemos cópias de segurança diárias e procuramos manter o serviço sempre disponível, sem garantir que nunca haja interrupções. A nossa responsabilidade está limitada ao valor pago nos 12 meses anteriores.",
  },
  {
    id: "t8",
    number: "08",
    title: "Alterações e lei aplicável",
    body: "Alterações a estes termos são comunicadas por email antes de entrarem em vigor. Aplica-se a lei portuguesa.",
  },
];

export const privacySections: readonly PrivacySection[] = [
  {
    title: "Que dados recolhemos",
    body: "Nome, email e dados de autenticação de quem usa a conta; nome, telefone e NIF da oficina; dados de faturação. Na página de lançamento, só o email que deixares na lista de interessados. Se pagares com cartão, o pagamento é processado pela Stripe e não guardamos números de cartão.",
  },
  {
    title: "Para que os usamos",
    body: "Para prestar o serviço, gerir a subscrição, enviar avisos da conta e cumprir obrigações legais. O email da lista de interessados serve só para avisar do lançamento e é apagado a pedido. Não vendemos dados nem fazemos publicidade com eles.",
  },
  {
    title: "Onde ficam e com quem",
    body: "Alojados na União Europeia. Subcontratantes: Supabase (base de dados), Vercel (alojamento), Stripe (pagamentos) e Gmail (envio de emails).",
  },
  {
    title: "Os teus direitos",
    body: "Podes pedir acesso, retificação, portabilidade ou eliminação dos teus dados através de pcunhadev@gmail.com, e apresentar reclamação à CNPD.",
  },
];
