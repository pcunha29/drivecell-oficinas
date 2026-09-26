import type { ReactNode } from "react";

/** Páginas da conta (fora da app): mesmo fundo das páginas de autenticação. */
export default function ContaLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-dvh bg-paper text-ink">{children}</div>;
}
