import Link from "next/link";
import { Plus } from "lucide-react";
import { DemoAccountCard } from "@/components/admin/demo-account-card";
import { FormMessage } from "@/components/admin/form-feedback";
import { DemoBadge, StatusBadge } from "@/components/admin/status-badge";
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
import {
  listAuditLog,
  listWorkshops,
  purgeDate,
  type AdminAuditEntry,
  type AdminWorkshopListItem,
} from "@/lib/admin/data";
import { AUDIT_ACTION_LABELS } from "@/lib/admin/audit";
import { formatDate, formatDateTime } from "@/lib/admin/format";

export const dynamic = "force-dynamic";

export const metadata = { title: "Oficinas · Admin" };

export default async function AdminWorkshopsPage() {
  await requireAdminPage();

  let workshops: AdminWorkshopListItem[] = [];
  let loadError: string | null = null;
  try {
    workshops = await listWorkshops();
  } catch (error) {
    loadError =
      error instanceof Error ? error.message : "Erro ao carregar oficinas.";
  }
  const hasDemo = workshops.some((w) => w.is_demo);

  // O registo é secundário: se falhar (migração em falta), a lista de oficinas continua.
  let audit: AdminAuditEntry[] = [];
  let auditError: string | null = null;
  try {
    audit = await listAuditLog(15);
  } catch (error) {
    auditError = error instanceof Error ? error.message : "Erro ao carregar o registo.";
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Oficinas</h1>
          <p className="text-sm text-muted-foreground">
            {loadError
              ? "-"
              : `${workshops.length} oficina${workshops.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/nova">
            <Plus aria-hidden />
            Nova oficina
          </Link>
        </Button>
      </div>

      {loadError && (
        <FormMessage state={{ status: "error", message: loadError }} />
      )}

      {!loadError && <DemoAccountCard hasDemo={hasDemo} />}

      {!loadError && (
        <Card>
          <CardContent className="p-0">
            {workshops.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">
                Ainda não há oficinas. Cria a primeira em «Nova oficina».
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Oficina</TableHead>
                    <TableHead>Dono</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Clientes</TableHead>
                    <TableHead className="text-right">Ordens</TableHead>
                    <TableHead>Criada em</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workshops.map((w) => (
                    <TableRow key={w.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/admin/${w.id}`}
                            className="font-medium underline-offset-4 hover:underline"
                          >
                            {w.name}
                          </Link>
                          {w.is_demo && <DemoBadge />}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {w.ownerEmails.length > 0
                          ? w.ownerEmails.join(", ")
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          status={w.subscription_status}
                          trialEndsAt={w.trial_ends_at}
                        />
                        {purgeDate(w) && (
                          <div className="mt-1 text-xs text-red-700 dark:text-red-400">
                            Eliminada a {formatDate(purgeDate(w)!.toISOString())}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {w.customerCount}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {w.orderCount}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(w.created_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-base font-semibold">Registo de ações</h2>
            <p className="text-sm text-muted-foreground">
              Últimas 15 ações no admin e eliminações automáticas.
            </p>
          </div>
          {auditError ? (
            <p className="p-4 text-sm text-muted-foreground">
              {auditError} (Aplicaste a migração 20260930100000_retencao_registo_avatars.sql?)
            </p>
          ) : audit.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">Ainda não há ações registadas.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quando</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Oficina</TableHead>
                  <TableHead>Quem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {audit.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="whitespace-nowrap">{formatDateTime(e.created_at)}</TableCell>
                    <TableCell>{AUDIT_ACTION_LABELS[e.action] ?? e.action}</TableCell>
                    <TableCell>{e.workshop_name ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{e.actor}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
