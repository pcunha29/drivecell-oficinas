"use client";

import { usePathname } from "next/navigation";
import { ThemeProvider as NextThemesProvider } from "next-themes";

/** Rotas que respeitam o tema escolhido; marketing, /entrar, /registar e /onboarding são sempre claras. */
function supportsDarkMode(pathname: string | null): boolean {
  if (!pathname) return false;
  return (
    pathname === "/app" ||
    pathname.startsWith("/app/") ||
    pathname.startsWith("/auth/")
  );
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      forcedTheme={supportsDarkMode(pathname) ? undefined : "light"}
    >
      {children}
    </NextThemesProvider>
  );
}
