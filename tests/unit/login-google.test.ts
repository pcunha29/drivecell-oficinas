import { describe, expect, it } from "vitest";
import { NEW_OAUTH_ACCOUNT_WINDOW_MS, isFreshOAuthOnlyAccount, isSignupDisabledError, loginPathFor } from "@/lib/oauth-guard";

const NOW = Date.parse("2026-10-08T12:00:00Z");
const user = (providers: string[], minutesAgo: number) => ({
  created_at: new Date(NOW - minutesAgo * 60_000).toISOString(),
  app_metadata: { provider: providers[0], providers },
});

describe("login com Google só para contas existentes", () => {
  it("recusa uma conta Google acabada de criar (sem convite)", () => {
    expect(isFreshOAuthOnlyAccount(user(["google"], 0), NOW)).toBe(true);
    expect(isFreshOAuthOnlyAccount(user(["google"], 9), NOW)).toBe(true);
  });

  it("aceita contas convidadas por email, mesmo que agora entrem com Google", () => {
    expect(isFreshOAuthOnlyAccount(user(["email", "google"], 0), NOW)).toBe(false);
    expect(isFreshOAuthOnlyAccount(user(["email"], 0), NOW)).toBe(false);
  });

  it("não mexe em contas Google antigas", () => {
    expect(isFreshOAuthOnlyAccount(user(["google"], NEW_OAUTH_ACCOUNT_WINDOW_MS / 60_000 + 1), NOW)).toBe(false);
  });

  it("reconhece o erro da Supabase com o registo de contas desligado", () => {
    expect(isSignupDisabledError(new URLSearchParams("error=access_denied&error_code=signup_disabled"))).toBe(true);
    expect(isSignupDisabledError(new URLSearchParams("error=server_error&error_description=Signups+not+allowed+for+this+instance"))).toBe(true);
    expect(isSignupDisabledError(new URLSearchParams("error=access_denied&error_description=User+cancelled"))).toBe(false);
  });

  it("erros do login com Google a partir do admin voltam ao login do admin", () => {
    expect(loginPathFor("/admin")).toBe("/admin/entrar");
    expect(loginPathFor("/admin/oficinas/1")).toBe("/admin/entrar");
    expect(loginPathFor("/app")).toBe("/entrar");
    expect(loginPathFor("/administracao")).toBe("/entrar");
  });
});
