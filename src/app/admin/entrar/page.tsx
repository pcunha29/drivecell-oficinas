import type { Metadata } from "next";
import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { createClient } from "@/lib/supabase/server";
import { DrivecellLogo } from "@/components/brand/drivecell-logo";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const NO_ACCESS = "Esta conta Google não tem acesso ao admin.";
const ERROR_MESSAGES: Record<string, string> = {
  auth: "Não foi possível concluir o login. Tenta outra vez.",
  sem_conta: NO_ACCESS,
  sem_acesso: NO_ACCESS,
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { error } = await searchParams;
  const errorKey = Array.isArray(error) ? error[0] : error;
  const initialError = (errorKey && ERROR_MESSAGES[errorKey]) || null;

  let otherEmail: string | null = null;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    otherEmail = data.user?.email ?? null;
  } catch {
    otherEmail = null;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex flex-col gap-1">
          <span className="mb-3 flex items-center gap-3">
            <DrivecellLogo variant="auto" height={22} priority />
            <span className="rounded border border-border px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Admin
            </span>
          </span>
          <h1 className="m-0 text-xl font-semibold">Entrar</h1>
        </div>
        {otherEmail && (
          <p className="mb-4 rounded-md border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
            Tens sessão iniciada como <strong className="text-foreground">{otherEmail}</strong>, que não
            tem acesso ao admin. Entra com a conta de admin para continuar.
          </p>
        )}
        <AdminLoginForm initialError={initialError} />
      </div>
    </main>
  );
}
