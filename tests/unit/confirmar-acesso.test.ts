import { describe, expect, it } from "vitest";
import { CONFIRM_MESSAGES, confirmErrorMessage, continueUrl, isOtpType } from "@/lib/auth-confirm";

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
