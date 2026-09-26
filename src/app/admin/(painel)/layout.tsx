import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { requireAdminPage } from "@/lib/admin/auth";
import { DrivecellLogo } from "@/components/brand/drivecell-logo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // 404 para quem não tiver sessão ou não estiver em ADMIN_EMAILS.
  const admin = await requireAdminPage();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-card">
        <div className="mx-auto flex w-full max-w-[1440px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 md:px-8 xl:px-12">
          <Link href="/admin" className="flex items-center gap-3 font-semibold tracking-tight" aria-label="DriveCell Admin">
            <DrivecellLogo variant="auto" height={20} />
            <span className="rounded border border-border px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Admin
            </span>
          </Link>
          <nav className="flex items-center gap-1 text-sm" aria-label="Admin">
            <Link
              href="/admin"
              className="rounded-md px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              Oficinas
            </Link>
            <Link
              href="/admin/nova"
              className="rounded-md px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              Nova oficina
            </Link>
            <Link
              href="/admin/site"
              className="rounded-md px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              Site
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="hidden text-muted-foreground sm:inline">{admin.email}</span>
            <Link
              href="/app"
              className="inline-flex items-center gap-1 rounded-md px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              Abrir app
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </Link>
            <form action="/auth/signout?next=/admin/entrar" method="post">
              <button
                type="submit"
                className="cursor-pointer rounded-md px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1440px] px-4 py-6 md:px-8 xl:px-12">{children}</main>
    </div>
  );
}
