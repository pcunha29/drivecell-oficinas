/**
 * CSV para abrir no Excel em pt-PT: separador ";", BOM UTF-8, quebras CRLF.
 * Protege contra fórmulas (células começadas por = + - @) e escapa aspas.
 */
export type CsvValue = string | number | boolean | null | undefined;

function cell(value: CsvValue): string {
  if (value === null || value === undefined) return '""';
  if (typeof value === "number") {
    // Números com vírgula decimal, como o Excel português espera.
    return Number.isFinite(value) ? String(value).replace(".", ",") : '""';
  }
  if (typeof value === "boolean") return value ? '"sim"' : '"não"';
  let v = value;
  if (/^[=+\-@\t\r]/.test(v)) v = `'${v}`;
  return `"${v.replace(/"/g, '""')}"`;
}

export function toCsv(header: string[], rows: CsvValue[][]): string {
  const lines = [header.map(cell).join(";"), ...rows.map((r) => r.map(cell).join(";"))];
  return `﻿${lines.join("\r\n")}\r\n`;
}

export function csvResponseHeaders(filename: string): HeadersInit {
  return {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Cache-Control": "no-store",
  };
}
