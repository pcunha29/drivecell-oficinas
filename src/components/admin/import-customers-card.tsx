"use client";

import { useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, FileUp } from "lucide-react";
import { toast } from "sonner";
import { importCustomersAction } from "@/app/admin/actions";
import { FormMessage } from "@/components/admin/form-feedback";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  decodeCsvBuffer,
  IMPORT_TEMPLATE_CSV,
  parseCustomersCsv,
  type ParsedImport,
} from "@/lib/import/customers-csv";

const PREVIEW_ROWS = 6;

function downloadTemplate() {
  const blob = new Blob([IMPORT_TEMPLATE_CSV], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "modelo-importar-clientes.csv";
  a.click();
  URL.revokeObjectURL(url);
}

/** Importar clientes e viaturas de um CSV (configuração inicial da oficina). */
export function ImportCustomersCard({ workshopId }: { workshopId: string }) {
  const router = useRouter();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedImport | null>(null);
  const [result, setResult] = useState<{ status: "success" | "error"; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  async function onFile(file: File | undefined) {
    setResult(null);
    setParsed(null);
    setFileName(file?.name ?? null);
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setResult({ status: "error", message: "Ficheiro demasiado grande (máx. 5 MB)." });
      return;
    }
    const text = decodeCsvBuffer(await file.arrayBuffer());
    setParsed(parseCustomersCsv(text));
  }

  function reset() {
    setParsed(null);
    setFileName(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function onImport() {
    if (!parsed) return;
    startTransition(async () => {
      try {
        const res = await importCustomersAction(workshopId, parsed.rows);
        setResult(res);
        if (res.status === "success") {
          toast.success("Importação concluída.");
          reset();
          router.refresh();
        }
      } catch {
        setResult({ status: "error", message: "Não foi possível importar." });
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Importar clientes e viaturas</CardTitle>
        <p className="text-sm text-muted-foreground">
          CSV com uma linha por viatura (o cliente repete-se em cada viatura dele). Linhas sem
          matrícula criam só o cliente. Clientes com o mesmo nome e telefone e matrículas que já
          existam não são duplicados.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} disabled={isPending}>
            <FileUp aria-hidden />
            Escolher ficheiro CSV
          </Button>
          <Button type="button" variant="ghost" onClick={downloadTemplate}>
            <Download aria-hidden />
            Descarregar modelo
          </Button>
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            aria-label="Ficheiro CSV de clientes e viaturas"
            onChange={(e) => void onFile(e.target.files?.[0])}
          />
          {fileName && <span className="text-sm text-muted-foreground break-all">{fileName}</span>}
        </div>

        {parsed && (
          <div className="space-y-3">
            <p className="text-sm">
              <strong className="font-medium">{parsed.customerCount}</strong> clientes e{" "}
              <strong className="font-medium">{parsed.vehicleCount}</strong> viaturas em{" "}
              {parsed.rows.length} linhas.{" "}
              <span className="text-muted-foreground">
                Colunas reconhecidas: {parsed.columns.length ? parsed.columns.join(", ") : "nenhuma"}.
              </span>
            </p>

            {parsed.rows.length > 0 && (
              <div className="overflow-x-auto rounded-md border border-border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 text-left text-muted-foreground">
                    <tr>
                      <th scope="col" className="px-2 py-1.5 font-medium">Cliente</th>
                      <th scope="col" className="px-2 py-1.5 font-medium">Telefone</th>
                      <th scope="col" className="px-2 py-1.5 font-medium">Matrícula</th>
                      <th scope="col" className="px-2 py-1.5 font-medium">Viatura</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.rows.slice(0, PREVIEW_ROWS).map((r) => (
                      <tr key={r.line} className="border-t border-border">
                        <td className="px-2 py-1.5">{r.nome}</td>
                        <td className="px-2 py-1.5">{r.telefone || "—"}</td>
                        <td className="px-2 py-1.5 font-mono">{r.matricula || "—"}</td>
                        <td className="px-2 py-1.5">
                          {[r.marca, r.modelo, r.ano].filter(Boolean).join(" ") || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsed.rows.length > PREVIEW_ROWS && (
                  <p className="border-t border-border px-2 py-1.5 text-xs text-muted-foreground">
                    E mais {parsed.rows.length - PREVIEW_ROWS} linhas.
                  </p>
                )}
              </div>
            )}

            {parsed.issues.length > 0 && (
              <details className="text-sm">
                <summary className="cursor-pointer text-amber-700 dark:text-amber-400">
                  {parsed.issues.length} {parsed.issues.length === 1 ? "aviso" : "avisos"}
                </summary>
                <ul className="mt-2 max-h-40 space-y-0.5 overflow-auto pl-4 text-xs text-muted-foreground">
                  {parsed.issues.map((issue, i) => (
                    <li key={i}>
                      Linha {issue.line}: {issue.message}
                    </li>
                  ))}
                </ul>
              </details>
            )}

            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={onImport} disabled={isPending || parsed.rows.length === 0}>
                {isPending
                  ? "A importar…"
                  : `Importar ${parsed.customerCount} clientes e ${parsed.vehicleCount} viaturas`}
              </Button>
              <Button type="button" variant="ghost" onClick={reset} disabled={isPending}>
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {result && <FormMessage state={result} />}
      </CardContent>
    </Card>
  );
}
