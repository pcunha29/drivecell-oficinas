import Link from "next/link";
import { Download, ExternalLink } from "lucide-react";
import { FormMessage } from "@/components/admin/form-feedback";
import { InteressadoActions } from "@/components/admin/interessado-actions";
import { SiteModeToggle } from "@/components/admin/site-mode-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireAdminPage } from "@/lib/admin/auth";
import { formatDate, formatDateTime } from "@/lib/admin/format";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export const metadata = { title: "Site · Admin" };

type Interessado = {
  id: string;
  email: string;
  created_at: string;
  contacted_at: string | null;
};

async function loadSiteData() {
  const admin = createAdminClient();
  const [settings, list] = await Promise.all([
    admin.from("site_settings").select("under_construction, updated_at").eq("id", 1).maybeSingle(),
    admin
      .from("interessados")
      .select("id, email, created_at, contacted_at")
      .order("created_at", { ascending: false })
      .limit(1000),
  ]);
  if (settings.error) throw new Error(settings.error.message);
  if (list.error) throw new Error(list.error.message);
  return {
    underConstruction: settings.data?.under_construction === true,
    updatedAt: (settings.data?.updated_at as string | undefined) ?? null,
    interessados: (list.data ?? []) as Interessado[],
  };
}

export default async function AdminSitePage() {
  await requireAdminPage();

  let data: Awaited<ReturnType<typeof loadSiteData>> | null = null;
  let loadError: string | null = null;
  try {
    data = await loadSiteData();
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Erro ao carregar.";
  }

  const porContactar = data?.interessados.filter((i) => !i.contacted_at).length ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Site público</h1>
        <p className="text-sm text-muted-foreground">Modo em construção e lista de interessados.</p>
      </div>

      {loadError && (
        <FormMessage
          state={{
            status: "error",
            message: `${loadError} (Aplicaste a migração 20260927100000_site_settings_interessados.sql?)`,
          }}
        />
      )}

      {data && (
        <>
          <Card>
            <CardContent className="space-y-4 p-6">
              <SiteModeToggle initialOn={data.underConstruction} />
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {data.updatedAt && <span>Alterado em {formatDateTime(data.updatedAt)}</span>}
                <Link
                  href="/em-construcao"
                  target="_blank"
                  className="inline-flex items-center gap-1 underline-offset-4 hover:text-foreground hover:underline"
                >
                  Pré-visualizar a página de espera
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Interessados</h2>
              <p className="text-sm text-muted-foreground">
                {data.interessados.length} email{data.interessados.length === 1 ? "" : "s"} ·{" "}
                {porContactar} por contactar
              </p>
            </div>
            {data.interessados.length > 0 && (
              <Button asChild variant="outline">
                <a href="/admin/interessados.csv" download>
                  <Download aria-hidden />
                  Exportar CSV
                </a>
              </Button>
            )}
          </div>

          <Card>
            <CardContent className="p-0">
              {data.interessados.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground">
                  Ainda ninguém deixou o email. Aparecem aqui assim que alguém o fizer na página de espera.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Registado em</TableHead>
                      <TableHead>Contactado</TableHead>
                      <TableHead className="text-right">
                        <span className="sr-only">Ações</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.interessados.map((i) => (
                      <TableRow key={i.id}>
                        <TableCell>
                          <a href={`mailto:${i.email}`} className="font-medium underline-offset-4 hover:underline">
                            {i.email}
                          </a>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{formatDateTime(i.created_at)}</TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {i.contacted_at ? formatDate(i.contacted_at) : "—"}
                        </TableCell>
                        <TableCell>
                          <InteressadoActions id={i.id} contacted={Boolean(i.contacted_at)} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
