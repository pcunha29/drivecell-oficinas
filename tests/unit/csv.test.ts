import { describe, expect, it } from "vitest";
import { toCsv } from "@/lib/csv";
import {
  customerKey,
  decodeCsvBuffer,
  IMPORT_MAX_ROWS,
  IMPORT_TEMPLATE_CSV,
  normalizePlate,
  parseCsv,
  parseCustomersCsv,
} from "@/lib/import/customers-csv";

const BOM = "﻿";

describe("exportar CSV (toCsv)", () => {
  it("usa ; e vírgula decimal, com BOM e CRLF, para o Excel português", () => {
    const csv = toCsv(["Cliente", "Total", "Pago"], [["Ana", 12.5, true], ["Rui", 3, false]]);
    expect(csv).toBe(`${BOM}"Cliente";"Total";"Pago"\r\n"Ana";12,5;"sim"\r\n"Rui";3;"não"\r\n`);
  });

  it("escapa aspas e neutraliza fórmulas", () => {
    const csv = toCsv(["a", "b", "c"], [['Diz "olá"', "=HYPERLINK(1)", null]]);
    expect(csv).toContain(`"Diz ""olá"""`);
    expect(csv).toContain(`"'=HYPERLINK(1)"`);
    expect(csv).toContain(`;""\r\n`);
  });
});

describe("ler CSV (parseCsv)", () => {
  it("deteta ; ou , e respeita aspas com quebras de linha", () => {
    expect(parseCsv('nome;notas\r\n"Silva; Lda";"linha 1\nlinha 2"\r\n')).toEqual([
      ["nome", "notas"],
      ["Silva; Lda", "linha 1\nlinha 2"],
    ]);
    expect(parseCsv('nome,telefone\n"Ana ""A""",912\n\n')).toEqual([
      ["nome", "telefone"],
      ['Ana "A"', "912"],
    ]);
  });

  it("lê ficheiros do Excel em Windows-1252 e em UTF-8 com BOM", () => {
    const latin1 = new Uint8Array([0x6e, 0x6f, 0x6d, 0x65, 0x0a, 0x4a, 0x6f, 0xe3, 0x6f]); // "nome\nJoão"
    expect(decodeCsvBuffer(latin1.buffer)).toBe("nome\nJoão");
    const utf8 = new TextEncoder().encode(`${BOM}nome\nJoão`);
    expect(decodeCsvBuffer(utf8.buffer as ArrayBuffer)).toBe("nome\nJoão");
  });
});

describe("importar clientes e viaturas (parseCustomersCsv)", () => {
  it("lê o modelo que o admin descarrega", () => {
    const result = parseCustomersCsv(IMPORT_TEMPLATE_CSV.replace(BOM, ""));
    expect(result.issues).toEqual([]);
    expect(result.customerCount).toBe(2);
    expect(result.vehicleCount).toBe(3);
    expect(result.rows[2]).toMatchObject({
      nome: "Transportes Lemos, Lda",
      notas: "Faturar à empresa · NIF: 509999999",
      matricula: "66-OP-77",
      ano: 2022,
    });
  });

  it("aceita cabeçalhos sem acentos e com outros nomes", () => {
    const result = parseCustomersCsv("Cliente,Telemóvel,Matricula,Ano de matrícula\nAna,912 345 678,aa12bc,2019\n");
    expect(result.columns).toEqual(expect.arrayContaining(["nome", "telefone", "matricula", "ano"]));
    expect(result.rows[0]).toMatchObject({ nome: "Ana", telefone: "912 345 678", matricula: "AA-12-BC", ano: 2019 });
  });

  it("avisa das linhas com problemas sem parar a importação", () => {
    const csv = ["nome;matricula;ano", ";AA-00-AA;2010", "Rui;BB-11-BB;19xx", "Ana;BB-11-BB;2020"].join("\n");
    const result = parseCustomersCsv(csv);
    expect(result.rows.map((r) => r.nome)).toEqual(["Rui", "Ana"]);
    expect(result.rows[0].ano).toBeNull();
    expect(result.issues.map((i) => i.line)).toEqual([2, 3, 4]);
    expect(result.vehicleCount).toBe(1);
  });

  it("recusa ficheiros sem a coluna do nome", () => {
    const result = parseCustomersCsv("telefone;matricula\n912;AA-00-AA\n");
    expect(result.rows).toEqual([]);
    expect(result.issues[0].message).toContain("nome");
  });

  it(`só importa as primeiras ${IMPORT_MAX_ROWS} linhas`, () => {
    const lines = Array.from({ length: IMPORT_MAX_ROWS + 5 }, (_, i) => `Cliente ${i}`);
    const result = parseCustomersCsv(["nome", ...lines].join("\n"));
    expect(result.rows).toHaveLength(IMPORT_MAX_ROWS);
    expect(result.issues).toHaveLength(1);
  });

  it("normaliza matrículas e agrupa o mesmo cliente", () => {
    expect(normalizePlate(" aa 12 bc ")).toBe("AA-12-BC");
    expect(normalizePlate("aa.12.bc")).toBe("AA-12-BC");
    expect(customerKey("João Silva", "912 345 678")).toBe(customerKey("joao silva", "912345678"));
  });
});
