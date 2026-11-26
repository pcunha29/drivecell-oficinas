import Link from "next/link";
import { TemplateLanding, templateMetadata } from "@/components/marketing/template-landing";
import { modelo } from "@/content/modelos";

/** SEO: "ordem de reparação automóvel (pdf)". Ficheiros: scripts/modelos/gerar-ordem-e-orcamento.py. */
const m = modelo("ordem-de-reparacao");

export const metadata = templateMetadata(
  m,
  "Ordem de reparação automóvel: modelo grátis (PDF, Excel e Word)",
  "Modelo grátis de ordem de reparação para oficinas: cliente, viatura, estado à entrada com desenho do carro, trabalhos autorizados e assinatura.",
);

export default function OrdemDeReparacaoPage() {
  return (
    <TemplateLanding
      modelo={m}
      titleStart="Ordem de reparação,"
      titleEm="assinada à entrada."
      intro="A ordem de reparação é o que o cliente assina quando deixa o carro: o que pediu, o estado em que o carro entrou, o que autoriza e até que valor. Descarregue o modelo, com um desenho do carro para marcar os danos."
      imageAlt="Exemplo de ordem de reparação preenchida à mão: cliente, viatura, danos marcados no desenho do carro, trabalhos autorizados e assinaturas"
      downloads={{
        pdf: { title: "Para imprimir", text: "A4, com o desenho do carro para marcar os danos." },
        xlsx: { title: "Para o computador", text: "Preencha e guarde uma por matrícula." },
        docx: { title: "Com o nome da oficina", text: "Edite, ponha o logótipo e imprima." },
      }}
      fieldsHeading="O que deve ter uma ordem de reparação."
      fields={[
        {
          title: "Cliente e contacto",
          text: "Nome, telefone e por onde prefere ser contactado. Quando aparece um trabalho extra, poupa tempo.",
        },
        { title: "Viatura e quilómetros", text: "Matrícula, marca e modelo, quilómetros e combustível à entrada." },
        {
          title: "Estado à entrada",
          text: "Riscos, amolgadelas e jantes marcados no desenho, com o cliente ao lado. Evita o «isto não estava assim».",
        },
        {
          title: "Objetos e chaves",
          text: "O que ficou no carro e o que foi entregue: chave, chave suplente, livro de revisões.",
        },
        {
          title: "Trabalhos pedidos",
          text: "Cada pedido numa linha, com o valor estimado e se o cliente autoriza ou não.",
        },
        {
          title: "Limite de valor",
          text: "Até onde pode ir sem ligar. Acima disso, fala com o cliente antes de avançar.",
        },
        {
          title: "Autorizações",
          text: "Ensaio em estrada, devolução das peças substituídas e uso de peças de qualidade equivalente.",
        },
        {
          title: "Assinaturas",
          text: "Do cliente e de quem recebeu o carro, com a data. E, no fim, a assinatura no levantamento.",
        },
      ]}
      stepsHeading="Como usar a ordem de reparação."
      steps={[
        {
          title: "Com o cliente ao lado",
          text: "Dê a volta ao carro com o cliente e marque os danos no desenho antes de pegar nas chaves.",
        },
        {
          title: "Antes de começar",
          text: "Confirme que cada trabalho está autorizado e qual é o limite de valor.",
        },
        {
          title: "Se aparecer mais trabalho",
          text: "Contacte o cliente pelo meio que ele escolheu e escreva na ordem o que foi autorizado, quando e por quem.",
        },
        {
          title: "No levantamento",
          text: "Registe a data e os quilómetros à saída e peça a assinatura. Guarde a ordem junto da folha de obra e da fatura.",
        },
      ]}
      note={
        <p className="m-0">
          <strong className="font-semibold text-ink">Ordem de reparação ou folha de obra?</strong> Muitas oficinas
          usam só uma. A ordem de reparação serve para combinar com o cliente o que se vai fazer; a{" "}
          <Link href="/modelos/folha-de-obra-oficina" className="text-accent underline underline-offset-2">
            folha de obra
          </Link>{" "}
          regista o que foi feito, com peças e horas.
        </p>
      }
      pitch={{
        heading: "A ordem de reparação,",
        headingEm: "sem papel.",
        text: "No DriveCell Oficinas, cada carro que entra tem a sua ordem de reparação, com o cliente, a viatura e os trabalhos. Passa de «em espera» a «entregue» num quadro, e o histórico fica guardado pela matrícula.",
        whatsapp: "Olá! Vi a ordem de reparação no site e gostava de experimentar o DriveCell.",
      }}
      faq={[
        {
          q: "Qual é a diferença entre ordem de reparação e folha de obra?",
          a: "Muitas oficinas usam os dois nomes para o mesmo papel. Neste modelo, a ordem de reparação é o que se combina com o cliente à entrada; a folha de obra é o registo das peças e das horas durante o trabalho.",
        },
        {
          q: "Para que serve o desenho do carro?",
          a: "Para marcar, com o cliente presente, os danos que o carro já tinha à entrada. Evita discussões na entrega.",
        },
        {
          q: "Posso pôr o nome e o logótipo da oficina?",
          a: "Sim. No Word e no Excel escreve o nome no topo ou cola o logótipo. No PDF há um espaço para o carimbo da oficina.",
        },
        { q: "Preciso de dar o meu email para descarregar?", a: "Não. Os três ficheiros descarregam-se diretamente, sem registo." },
        {
          q: "A ordem de reparação serve de fatura?",
          a: "Não. É um documento interno da oficina. A fatura ao cliente tem de ser emitida num programa de faturação certificado.",
        },
      ]}
    />
  );
}
