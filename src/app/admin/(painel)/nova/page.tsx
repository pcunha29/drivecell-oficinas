import { NewWorkshopForm } from "@/components/admin/new-workshop-form";
import { requireAdminPage } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

export const metadata = { title: "Nova oficina · Admin" };

export default async function NewWorkshopPage() {
  await requireAdminPage();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Nova oficina</h1>
        <p className="text-sm text-muted-foreground">
          Cria a oficina e envia ao dono um convite por email para definir a palavra-passe.
        </p>
      </div>
      <NewWorkshopForm />
    </div>
  );
}
