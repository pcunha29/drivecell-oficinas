import { TemplateLanding, templateMetadata } from "@/components/marketing/template-landing";
import { modelo } from "@/content/modelos";

/** SEO: "orçamento oficina mecânica pdf/excel/word". Ficheiros: scripts/modelos/gerar-ordem-e-orcamento.py. */
const m = modelo("orcamento");

export const metadata = templateMetadata(
  m,
  "Orçamento para oficina: modelo grátis em PDF, Excel e Word",
  "Modelo grátis de orçamento para oficina mecânica: peças e mão de obra separadas, IVA, validade e aceitação do cliente. O Excel faz as contas sozinho.",
);

export default function OrcamentoOficinaPage() {
  return (
    <TemplateLanding
      modelo={m}
      titleStart="Orçamento para oficina,"
      titleEm="claro para o cliente."
      intro="Um bom orçamento separa as peças da mão de obra, mostra o IVA e diz até quando é válido. Descarregue o modelo e entregue-o impresso ou envie-o em PDF."
      imageAlt="Exemplo de orçamento de oficina preenchido à mão: peças e mão de obra, totais com IVA, condições e aceitação do cliente"
      downloads={{
        pdf: { title: "Para imprimir", text: "A4, para preencher à mão." },
        xlsx: { title: "Faz as contas", text: "Linhas, peças, mão de obra, IVA e total." },
        docx: { title: "Com o nome da oficina", text: "Edite, ponha o logótipo e envie." },
      }}
      fieldsHeading="O que deve ter um orçamento de oficina."
      fields={[
        { title: "Dados da oficina", text: "Nome, morada, NIF e contacto. O cliente tem de saber a quem ligar." },
        {
          title: "Número, data e validade",
          text: "Até quando o preço é válido. Os preços das peças mudam e a validade protege-o.",
        },
        { title: "Cliente e viatura", text: "Nome, contacto, matrícula, modelo e quilómetros." },
        {
          title: "O problema",
          text: "O que o cliente pediu ou o que encontrou no diagnóstico, em linguagem simples.",
        },
        {
          title: "Peças e mão de obra separadas",
          text: "Cada peça com a quantidade e o preço, e a mão de obra em horas. O cliente percebe para onde vai o dinheiro.",
        },
        {
          title: "IVA e total",
          text: "Diga se os preços têm IVA ou não e mostre o total final. Evita surpresas na fatura.",
        },
        { title: "Prazo", text: "Quantos dias vai demorar, contando com a chegada das peças." },
        {
          title: "Aceitação",
          text: "A assinatura do cliente, ou uma resposta por escrito numa mensagem, a aceitar o orçamento.",
        },
      ]}
      stepsHeading="Do orçamento à reparação."
      steps={[
        {
          title: "Depois do diagnóstico",
          text: "Faça o orçamento com o carro na oficina, quando já sabe o que tem.",
        },
        {
          title: "Por escrito",
          text: "Impresso, em PDF ou numa fotografia por WhatsApp. Por escrito, fica claro o que foi proposto.",
        },
        {
          title: "Espere pela aceitação",
          text: "Só comece depois de o cliente aceitar. Se aceitar por telefone, anote no orçamento a data e quem aceitou.",
        },
        {
          title: "Se aparecer mais trabalho",
          text: "Acrescente as linhas novas e peça nova aceitação antes de avançar.",
        },
      ]}
      note={
        <p className="m-0">
          <strong className="font-semibold text-ink">O orçamento não é uma fatura.</strong> Depois do trabalho
          feito, a fatura tem de ser emitida num programa de faturação certificado.
        </p>
      }
      pitch={{
        heading: "Do orçamento",
        headingEm: "ao que falta cobrar.",
        text: "No DriveCell Oficinas, as peças e a mão de obra ficam na ordem de reparação de cada carro, com o total calculado. Quando o carro é entregue, vê logo o que está pago e o que falta cobrar.",
        whatsapp: "Olá! Vi o modelo de orçamento no site e gostava de experimentar o DriveCell.",
      }}
      faq={[
        {
          q: "O modelo em Excel faz as contas?",
          a: "Sim. Escreva P (peça) ou MO (mão de obra) na coluna Tipo, a quantidade ou as horas e o preço. O Excel calcula cada linha, soma as peças e a mão de obra e acrescenta o IVA à taxa que escolher (vem com 23 %).",
        },
        {
          q: "Os preços devem ter IVA?",
          a: "O modelo usa preços sem IVA, com o IVA somado no fim, que é o mais claro para o cliente. Se preferir preços com IVA incluído, diga-o nas condições.",
        },
        {
          q: "Quanto tempo deve ser válido um orçamento?",
          a: "Uma validade curta, de 15 ou 30 dias, protege-o das subidas de preço das peças. Escreva sempre a data no orçamento.",
        },
        {
          q: "Posso pôr o nome e o logótipo da oficina?",
          a: "Sim. No Word e no Excel escreve os dados da oficina no topo ou cola o logótipo. No PDF há um espaço para o carimbo.",
        },
        { q: "Preciso de dar o meu email para descarregar?", a: "Não. Os três ficheiros descarregam-se diretamente, sem registo." },
      ]}
    />
  );
}
