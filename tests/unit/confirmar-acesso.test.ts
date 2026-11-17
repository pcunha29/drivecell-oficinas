import { describe, expect, it } from "vitest";
import {
  CONFIRM_MESSAGES,
  SET_PASSWORD_PATH,
  confirmErrorMessage,
  continueUrl,
  hashDestination,
  hashErrorMessage,
  isOtpType,
  parseAuthHash,
} from "@/lib/auth-confirm";
import { GET } from "@/app/auth/confirm/route";

describe("links de uso único (convite e recuperação)", () => {
  it("o link do email leva à página com o botão, sem gastar o token", () => {
    const url = new URL(continueUrl("https://drivecell.pt", "abc123", "recovery", "/conta/definir-palavra-passe"));
    expect(url.pathname).toBe("/auth/continuar");
    expect(url.searchParams.get("token_hash")).toBe("abc123");
    expect(url.searchParams.get("type")).toBe("recovery");
    expect(url.searchParams.get("next")).toBe("/conta/definir-palavra-passe");
  });

  it("só aceita os tipos de link da Supabase", () => {
    expect(isOtpType("invite")).toBe(true);
    expect(isOtpType("recovery")).toBe(true);
    expect(isOtpType("sms")).toBe(false);
    expect(isOtpType(null)).toBe(false);
  });

  it("explica que o link foi usado ou expirou", () => {
    expect(confirmErrorMessage({ code: "otp_expired", status: 403 })).toBe(CONFIRM_MESSAGES.expired);
    expect(confirmErrorMessage({ message: "Email link is invalid or has expired" })).toBe(CONFIRM_MESSAGES.expired);
    expect(confirmErrorMessage({ status: 500, message: "boom" })).toBe(CONFIRM_MESSAGES.generic);
  });
});

describe("links com a sessão no fragmento (template de email por omissão)", () => {
  it("lê a sessão devolvida pela Supabase", () => {
    const parsed = parseAuthHash("#access_token=aaa&expires_in=3600&refresh_token=bbb&token_type=bearer&type=invite");
    expect(parsed).toEqual({ kind: "session", accessToken: "aaa", refreshToken: "bbb", type: "invite" });
  });

  it("lê os erros (link usado ou expirado)", () => {
    const parsed = parseAuthHash("#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired");
    expect(parsed).toEqual({ kind: "error", code: "otp_expired", description: "Email link is invalid or has expired" });
    expect(hashErrorMessage(parsed as { code: string; description: string })).toBe(CONFIRM_MESSAGES.expired);
  });

  it("ignora âncoras normais da página", () => {
    expect(parseAuthHash("#funcionalidades")).toBeNull();
    expect(parseAuthHash("")).toBeNull();
    expect(parseAuthHash("#access_token=só-um")).toBeNull();
  });

  it("convites e recuperações vão definir a palavra-passe; o resto segue o next", () => {
    expect(hashDestination("invite", "/app")).toBe(SET_PASSWORD_PATH);
    expect(hashDestination("recovery", "/app")).toBe(SET_PASSWORD_PATH);
    expect(hashDestination("magiclink", "/app/marcacoes")).toBe("/app/marcacoes");
    expect(hashDestination(null, "/app")).toBe("/app");
  });
});

describe("/auth/confirm aceita os três formatos", () => {
  const call = async (query: string) => {
    const res = await GET(new Request(`https://drivecell.pt/auth/confirm${query}`));
    return new URL(res.headers.get("location") ?? "");
  };

  it("token_hash → página com o botão (o token não é gasto)", async () => {
    const url = await call("?token_hash=abc&type=invite&next=/conta/definir-palavra-passe");
    expect(url.pathname).toBe("/auth/continuar");
    expect(url.searchParams.get("token_hash")).toBe("abc");
    expect(url.searchParams.get("next")).toBe("/conta/definir-palavra-passe");
  });

  it("code (PKCE) → /auth/callback com o mesmo destino", async () => {
    const url = await call("?code=xyz&next=/conta/definir-palavra-passe");
    expect(url.pathname).toBe("/auth/callback");
    expect(url.searchParams.get("code")).toBe("xyz");
    expect(url.searchParams.get("next")).toBe("/conta/definir-palavra-passe");
  });

  it("sem token nem código (sessão no fragmento) → /auth/continuar, não /entrar", async () => {
    const url = await call("?next=/conta/definir-palavra-passe");
    expect(url.pathname).toBe("/auth/continuar");
    expect(url.searchParams.get("next")).toBe("/conta/definir-palavra-passe");
    expect(url.searchParams.get("token_hash")).toBeNull();
  });

  it("nunca redireciona para fora do site", async () => {
    const url = await call("?next=//evil.example");
    expect(url.origin).toBe("https://drivecell.pt");
    expect(url.searchParams.get("next")).toBe("/app");
  });
});
