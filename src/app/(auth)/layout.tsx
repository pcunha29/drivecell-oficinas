import type { ReactNode } from "react";

/**
 * Layout partilhado das páginas de autenticação (/registar, /entrar).
 * Sem SiteHeader/SiteFooter; o ecrã dividido vive em `<AuthSplit>`.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-dvh bg-paper text-ink">{children}</div>;
}
