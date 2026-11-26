import Link from "next/link";
import { TemplateLanding, templateMetadata } from "@/components/marketing/template-landing";
import { modelo } from "@/content/modelos";

/** SEO: "folha de obra oficina pdf/excel/word". Ficheiros: scripts/modelos/gerar-folha-de-obra.py. */
const m = modelo("folha-de-obra");

export const metadata = templateMetadata(
  m,
  "Folha de obra para oficina: modelo grátis em PDF, Excel e Word",
  "Descarregue grátis uma folha de obra para oficina automóvel, pronta a imprimir ou a preencher no computador. Veja o que deve ter e um exemplo preenchido.",
);

export default function FolhaDeObraPage() {
  return (
    <TemplateLanding
      modelo={m}
      titleStart="Folha de obra para oficina,"
      titleEm="pronta a imprimir."
      intro="A folha de obra, também chamada ficha de trabalho ou ordem de reparação, é onde fica escrito o que o cliente pediu, o que foi feito, as peças e as horas. Descarregue o modelo e comece a usá-lo amanhã."
      imageAlt="Exemplo de folha de obra preenchida à mão: cliente, viatura, pedido, mão de obra, peças e totais"
      downloads={{
        pdf: { title: "Para imprimir", text: "A4, para preencher à mão." },
        xlsx: { title: "Para o computador", text: "Soma as linhas, o IVA e o total." },
        docx: { title: "Com o nome da oficina", text: "Edite, ponha o logótipo e imprima." },
      }}
      fieldsHeading="Oito coisas que não podem faltar numa folha de obra."
      fields={[
        {
          title: "Número e datas",
          text: "Um número por folha, a data de entrada e quando prometeu entregar. Ajuda a encontrar a folha mais tarde e a cumprir o prazo.",
        },
        { title: "Cliente", text: "Nome e telefone, no mínimo. O NIF, se o cliente quiser a fatura com contribuinte." },
        {
          title: "Viatura",
          text: "Matrícula, marca e modelo, ano e quilómetros à entrada. Os quilómetros ficam registados e servem para a próxima revisão.",
        },
        {
          title: "O que o cliente pediu",
          text: "Com as palavras do cliente («barulho a travar»), antes de qualquer diagnóstico. Evita discussões na entrega.",
        },
        { title: "Diagnóstico", text: "O que encontrou, incluindo o que não vai reparar agora mas convém avisar." },
        {
          title: "Mão de obra e peças",
          text: "Cada trabalho com as horas e cada peça com a referência, a quantidade e o preço. É daqui que sai o valor a cobrar.",
        },
        {
          title: "Estado à entrada",
          text: "Riscos, amolgadelas e objetos deixados no carro. Dois minutos que poupam muitas conversas.",
        },
        {
          title: "Autorização do cliente",
          text: "O valor aprovado e até onde pode ir sem ligar. Com a assinatura do cliente, fica claro o que foi combinado.",
        },
      ]}
      stepsHeading="Como usar a folha de obra."
      steps={[
        {
          title: "Na receção",
          text: "Preencha os dados, os quilómetros, o pedido e o estado do carro com o cliente à frente, e peça a assinatura.",
        },
        { title: "Durante a reparação", text: "Quem trabalha no carro aponta as peças e as horas no momento, não ao fim do dia." },
        { title: "Antes de ligar ao cliente", text: "Some tudo primeiro: o cliente quer saber quanto é e quando está pronto." },
        {
          title: "Na entrega",
          text: "Registe os quilómetros à saída e se ficou pago. Emita a fatura no seu programa de faturação e arquive a folha pela matrícula.",
        },
      ]}
      note={
        <p className="m-0">
          <strong className="font-semibold text-ink">A folha de obra não é uma fatura.</strong> É um documento
          interno da oficina. A fatura ao cliente tem de ser emitida num programa de faturação certificado. Para
          combinar o trabalho com o cliente à entrada, use a{" "}
          <Link href="/modelos/ordem-de-reparacao" className="text-accent underline underline-offset-2">
            ordem de reparação
          </Link>
          .
        </p>
      }
      pitch={{
        heading: "A mesma folha de obra,",
        headingEm: "no telemóvel.",
        text: "O papel funciona até ao dia em que precisa de saber que carros estão prontos, o que falta cobrar ou o que se fez naquele carro há dois anos. O DriveCell Oficinas guarda tudo isso por si, no computador da receção ou no telemóvel.",
        whatsapp: "Olá! Vi a folha de obra no site e gostava de experimentar o DriveCell.",
      }}
      faq={[
        {
          q: "Folha de obra, ficha de trabalho e ordem de reparação são a mesma coisa?",
          a: "Na prática, muitas oficinas usam os três nomes para o mesmo papel. Se quiser separar, a ordem de reparação é o que se combina com o cliente à entrada e a folha de obra é o registo das peças e das horas.",
        },
        {
          q: "Posso pôr o nome e o logótipo da oficina?",
          a: "Sim. No Word e no Excel escreve o nome no topo ou cola o logótipo. No PDF há um espaço para o carimbo da oficina.",
        },
        {
          q: "O modelo em Excel faz as contas?",
          a: "Sim. Multiplica as horas e as quantidades pelo preço, soma as peças e a mão de obra e calcula o IVA à taxa que escolher (vem com 23 %).",
        },
        { q: "Preciso de dar o meu email para descarregar?", a: "Não. Os três ficheiros descarregam-se diretamente, sem registo." },
        {
          q: "A folha de obra serve de fatura?",
          a: "Não. É um documento interno da oficina. A fatura ao cliente tem de ser emitida num programa de faturação certificado.",
        },
      ]}
    />
  );
}
