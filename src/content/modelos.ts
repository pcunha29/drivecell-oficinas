/**
 * Modelos grátis para oficinas (páginas /modelos/...).
 * Os ficheiros em public/modelos/ são gerados por scripts/modelos/*.py.
 */
export type Modelo = {
  /** Identificador estável para o evento modelo_descarregado. */
  id: string;
  /** Nome dos ficheiros em public/modelos/ (sem extensão). */
  file: string;
  path: string;
  name: string;
  summary: string;
  image: { src: string; width: number; height: number };
};

const A4_PREVIEW = { width: 1588, height: 2246 };

export const MODELOS: Modelo[] = [
  {
    id: "folha-de-obra",
    file: "folha-de-obra-oficina",
    path: "/modelos/folha-de-obra-oficina",
    name: "Folha de obra",
    summary: "O registo do trabalho em cada carro: pedido, diagnóstico, peças, horas e totais.",
    image: { src: "/modelos/folha-de-obra-exemplo.png", ...A4_PREVIEW },
  },
  {
    id: "ordem-de-reparacao",
    file: "ordem-de-reparacao",
    path: "/modelos/ordem-de-reparacao",
    name: "Ordem de reparação",
    summary: "O que se combina com o cliente à entrada: estado do carro, trabalhos autorizados e assinatura.",
    image: { src: "/modelos/ordem-de-reparacao-exemplo.png", ...A4_PREVIEW },
  },
  {
    id: "orcamento",
    file: "orcamento-oficina",
    path: "/modelos/orcamento-oficina",
    name: "Orçamento para oficina",
    summary: "Peças e mão de obra separadas, IVA, validade e aceitação do cliente.",
    image: { src: "/modelos/orcamento-oficina-exemplo.png", ...A4_PREVIEW },
  },
];

export function modelo(id: string): Modelo {
  const found = MODELOS.find((m) => m.id === id);
  if (!found) throw new Error(`Modelo desconhecido: ${id}`);
  return found;
}
