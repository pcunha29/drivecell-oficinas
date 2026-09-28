/**
 * Importação de clientes e viaturas a partir de CSV (configuração inicial de uma oficina).
 * Formato: uma linha por viatura; o cliente repete-se em cada viatura dele.
 * Linhas sem matrícula criam só o cliente. Aceita ";" ou "," e cabeçalhos em português
 * com ou sem acentos. Código puro: corre no browser (pré-visualização) e no servidor.
 */

export const IMPORT_MAX_ROWS = 2000;

export type ImportField =
  | "nome"
  | "telefone"
  | "email"
  | "notas"
  | "nif"
  | "matricula"
  | "marca"
  | "modelo"
  | "ano";

const ALIASES: Record<ImportField, string[]> = {
  nome: ["nome", "cliente", "nomecliente", "nomedocliente", "name"],
  telefone: ["telefone", "telemovel", "tlm", "tel", "contacto", "phone", "telefonecliente"],
  email: ["email", "mail", "correio", "correioeletronico"],
  notas: ["notas", "nota", "observacoes", "obs", "notes"],
  nif: ["nif", "contribuinte", "nifcliente"],
  matricula: ["matricula", "matriculas", "plate", "viatura"],
  marca: ["marca", "make"],
  modelo: ["modelo", "model"],
  ano: ["ano", "year", "anodematricula", "anomatricula"],
};

export type ImportRow = {
  /** Linha no ficheiro (a partir de 2, contando o cabeçalho). */
  line: number;
  nome: string;
  telefone: string;
  email: string;
  notas: string;
  matricula: string;
  marca: string;
  modelo: string;
  ano: number | null;
};

export type ImportIssue = { line: number; message: string };

export type ParsedImport = {
  rows: ImportRow[];
  issues: ImportIssue[];
  /** Colunas reconhecidas (para mostrar ao admin). */
  columns: ImportField[];
  customerCount: number;
  vehicleCount: number;
};

/** Decodifica o ficheiro: UTF-8 se for válido, senão Windows-1252 (CSV guardado pelo Excel). */
export function decodeCsvBuffer(buffer: ArrayBuffer): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer).replace(/^﻿/, "");
  } catch {
    return new TextDecoder("windows-1252").decode(buffer);
  }
}

function normalizeHeader(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/** Divide o texto CSV em linhas/células, com aspas e quebras de linha dentro de aspas. */
export function parseCsv(text: string): string[][] {
  const firstLine = text.slice(0, text.search(/\r?\n/) === -1 ? text.length : text.search(/\r?\n/));
  const sep = (firstLine.match(/;/g)?.length ?? 0) >= (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += ch;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === sep) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

const clean = (v: string | undefined) => (v ?? "").replace(/\s+/g, " ").trim();

/** Matrícula em maiúsculas; "AA00BB" passa a "AA-00-BB". */
export function normalizePlate(value: string): string {
  const v = value.toUpperCase().replace(/\s+/g, "").replace(/[.·]/g, "-");
  if (/^[A-Z0-9]{6}$/.test(v)) return `${v.slice(0, 2)}-${v.slice(2, 4)}-${v.slice(4, 6)}`;
  return v;
}

/** Chave para agrupar/encontrar o mesmo cliente: nome sem acentos + dígitos do telefone. */
export function customerKey(nome: string, telefone: string): string {
  return `${normalizeHeader(nome)}|${telefone.replace(/\D/g, "")}`;
}

export function parseCustomersCsv(text: string): ParsedImport {
  const table = parseCsv(text);
  const issues: ImportIssue[] = [];
  if (table.length < 2) {
    return { rows: [], issues: [{ line: 1, message: "O ficheiro não tem linhas de dados." }], columns: [], customerCount: 0, vehicleCount: 0 };
  }

  const header = table[0].map(normalizeHeader);
  const index = {} as Partial<Record<ImportField, number>>;
  (Object.keys(ALIASES) as ImportField[]).forEach((field) => {
    const i = header.findIndex((h) => ALIASES[field].includes(h));
    if (i >= 0) index[field] = i;
  });
  const columns = (Object.keys(index) as ImportField[]).filter((f) => index[f] !== undefined);

  if (index.nome === undefined) {
    return {
      rows: [],
      issues: [{ line: 1, message: "Falta a coluna «nome» (ou «cliente») no cabeçalho." }],
      columns,
      customerCount: 0,
      vehicleCount: 0,
    };
  }

  const get = (r: string[], f: ImportField) => (index[f] === undefined ? "" : clean(r[index[f]!]));
  const rows: ImportRow[] = [];
  const data = table.slice(1);
  if (data.length > IMPORT_MAX_ROWS) {
    issues.push({ line: IMPORT_MAX_ROWS + 2, message: `Só são importadas as primeiras ${IMPORT_MAX_ROWS} linhas.` });
  }

  data.slice(0, IMPORT_MAX_ROWS).forEach((r, i) => {
    const line = i + 2;
    const nome = get(r, "nome");
    if (!nome) {
      issues.push({ line, message: "Linha sem nome de cliente: ignorada." });
      return;
    }
    if (nome.length > 120) {
      issues.push({ line, message: "Nome com mais de 120 caracteres: ignorada." });
      return;
    }
    const matricula = normalizePlate(get(r, "matricula"));
    if (matricula.length > 20) {
      issues.push({ line, message: "Matrícula com mais de 20 caracteres: ignorada." });
      return;
    }
    const anoRaw = get(r, "ano");
    let ano: number | null = null;
    if (anoRaw) {
      const n = Number(anoRaw.replace(/\D/g, "").slice(0, 4));
      if (Number.isInteger(n) && n >= 1900 && n <= 2100) ano = n;
      else issues.push({ line, message: `Ano «${anoRaw}» inválido: fica em branco.` });
    }
    const nif = get(r, "nif");
    const notas = [get(r, "notas"), nif ? `NIF: ${nif}` : ""].filter(Boolean).join(" · ");
    rows.push({
      line,
      nome,
      telefone: get(r, "telefone"),
      email: get(r, "email").toLowerCase(),
      notas,
      matricula,
      marca: get(r, "marca"),
      modelo: get(r, "modelo"),
      ano,
    });
  });

  const customers = new Set(rows.map((r) => customerKey(r.nome, r.telefone)));
  const plates = new Set<string>();
  for (const r of rows) {
    if (!r.matricula) continue;
    if (plates.has(r.matricula)) issues.push({ line: r.line, message: `Matrícula ${r.matricula} repetida no ficheiro: só a primeira conta.` });
    plates.add(r.matricula);
  }

  return { rows, issues, columns, customerCount: customers.size, vehicleCount: plates.size };
}

/** Modelo para descarregar (separador ";" e BOM, abre bem no Excel). */
export const IMPORT_TEMPLATE_CSV =
  "﻿nome;telefone;email;nif;notas;matrícula;marca;modelo;ano\r\n" +
  "João Silva;912345678;joao@exemplo.pt;;Cliente antigo;AA-12-BC;Volkswagen;Golf;2018\r\n" +
  "João Silva;912345678;joao@exemplo.pt;;;45-XY-89;Renault;Clio;2015\r\n" +
  "Transportes Lemos, Lda;253111222;;509999999;Faturar à empresa;66-OP-77;Mercedes-Benz;Vito;2022\r\n";
