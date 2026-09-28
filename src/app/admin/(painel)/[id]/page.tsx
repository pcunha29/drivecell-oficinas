import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { FormMessage } from "@/components/admin/form-feedback";
import { ResendInviteButton } from "@/components/admin/resend-invite-button";
import { ResetDemoDialog } from "@/components/admin/reset-demo-dialog";
import { DeleteWorkshopDialog } from "@/components/admin/delete-workshop-dialog";
import { ImportCustomersCard } from "@/components/admin/import-customers-card";
import { AddMemberForm } from "@/components/admin/add-member-form";
import { RemoveMemberButton } from "@/components/admin/remove-member-button";
import { DemoBadge, StatusBadge } from "@/components/admin/status-badge";
import { WorkshopEditForm } from "@/components/admin/workshop-edit-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireAdminPage } from "@/lib/admin/auth";
import { getWorkshopDetail, purgeDate, type AdminWorkshopDetail } from "@/lib/admin/data";
import { formatDate, formatDateTime, toLisbonDateInput } from "@/lib/admin/format";

export const dynamic = "force-dynamic";

export const metadata = { title: "Oficina · Admin" };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CREATED_MESSAGES: Record<string, string> = {
  convite: "Oficina criada. O dono recebeu um convite por email para definir a palavra-passe.",
  existente:
    "Oficina criada e associada a uma conta que já existia (não foi enviado convite).",
};

export default async function AdminWorkshopDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ criada?: string | string[] }>;
}) {
  await requireAdminPage();
  const { id } = await params;
  const { criada } = await searchParams;
  if (!UUID_RE.test(id)) notFound();

  let workshop: AdminWorkshopDetail | null = null;
  let loadError: string | null = null;
  try {
    workshop = await getWorkshopDetail(id);
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Erro ao carregar a oficina.";
  }

  if (loadError) {
    return <FormMessage state={{ status: "error", message: loadError }} />;
  }
  if (!workshop) notFound();

  const createdMessage = typeof criada === "string" ? CREATED_MESSAGES[criada] : undefined;
  const scheduledPurge = purgeDate(workshop);

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Oficinas
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{workshop.name}</h1>
          <StatusBadge status={workshop.subscription_status} trialEndsAt={workshop.trial_ends_at} />
          {workshop.is_demo && <DemoBadge />}
        </div>
        <p className="text-sm text-muted-foreground">
          Criada em {formatDateTime(workshop.created_at)} · {workshop.customerCount} clientes ·{" "}
          {workshop.orderCount} ordens
          {workshop.current_period_end && ` · pago até ${formatDate(workshop.current_period_end)}`}
        </p>
      </div>

      {createdMessage && <FormMessage state={{ status: "success", message: createdMessage }} />}
      {scheduledPurge && (
        <FormMessage
          state={{
            status: "error",
            message: `Oficina cancelada: os dados são eliminados automaticamente a ${formatDate(scheduledPurge.toISOString())} (90 dias depois do fim do acesso). Para evitar, reativa a subscrição.`,
          }}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <WorkshopEditForm
          values={{
            id: workshop.id,
            name: workshop.name,
            phone: workshop.phone ?? "",
            nif: workshop.nif ?? "",
            subscriptionStatus: workshop.subscription_status,
            trialEndsAt: toLisbonDateInput(workshop.trial_ends_at),
            currentPeriodEnd: toLisbonDateInput(workshop.current_period_end),
            adminNotes: workshop.admin_notes ?? "",
            isDemo: workshop.is_demo,
          }}
        />

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Membros</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {workshop.members.length === 0 ? (
                <p className="px-4 pb-4 text-sm text-muted-foreground">Sem membros.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Papel</TableHead>
                      <TableHead>Último login</TableHead>
                      <TableHead>
                        <span className="sr-only">Ações</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workshop.members.map((m) => (
                      <TableRow key={m.userId}>
                        <TableCell className="align-top">
                          <div className="font-medium break-all">
                            {m.email ?? "(utilizador apagado)"}
                          </div>
                          {m.fullName && (
                            <div className="text-xs text-muted-foreground">{m.fullName}</div>
                          )}
                          {!m.lastSignInAt && m.email && (
                            <div className="mt-2 space-y-1">
                              <p className="text-xs text-muted-foreground">
                                {m.invitedAt
                                  ? `Convidado a ${formatDateTime(m.invitedAt)}`
                                  : "Nunca entrou"}
                              </p>
                              <ResendInviteButton workshopId={workshop.id} userId={m.userId} />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="align-top">
                          <Badge variant="secondary">{m.role === "owner" ? "Dono" : "Membro"}</Badge>
                        </TableCell>
                        <TableCell className="align-top whitespace-nowrap">
                          {m.lastSignInAt ? formatDateTime(m.lastSignInAt) : "Nunca"}
                        </TableCell>
                        <TableCell className="align-top text-right">
                          {!(m.role === "owner" && workshop.members.filter((x) => x.role === "owner").length <= 1) && (
                            <RemoveMemberButton
                              workshopId={workshop.id}
                              userId={m.userId}
                              label={m.email ?? "membro"}
                            />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              <AddMemberForm workshopId={workshop.id} workshopName={workshop.name} />
            </CardContent>
          </Card>

          {workshop.is_demo && (
            <Card>
              <CardHeader>
                <CardTitle>Demonstração</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Apaga os dados desta oficina e volta a carregar os clientes, viaturas e ordens de
                  exemplo (com datas relativas a hoje).
                </p>
              </CardHeader>
              <CardContent>
                <ResetDemoDialog workshopId={workshop.id} workshopName={workshop.name} />
              </CardContent>
            </Card>
          )}

          <ImportCustomersCard workshopId={workshop.id} />

          <Card className="border-red-200 dark:border-red-900">
            <CardHeader>
              <CardTitle>Eliminar oficina</CardTitle>
              <p className="text-sm text-muted-foreground">
                Para pedidos de eliminação (RGPD) ou contas de teste. Apaga clientes, viaturas, ordens
                e membros, e fica registado no registo de ações.
              </p>
            </CardHeader>
            <CardContent>
              <DeleteWorkshopDialog
                workshopId={workshop.id}
                workshopName={workshop.name}
                customerCount={workshop.customerCount}
                orderCount={workshop.orderCount}
                memberCount={workshop.members.length}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
