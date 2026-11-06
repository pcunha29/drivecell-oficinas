import { describe, expect, it } from "vitest";
import { attributionFrom } from "@/lib/analytics/events";

const HOST = "drivecell.pt";

describe("fonte da visita (attributionFrom)", () => {
  it("usa utm_source e utm_campaign quando existem", () => {
    expect(attributionFrom("?utm_source=google&utm_campaign=gestao-oficina", "", HOST)).toEqual({
      fonte: "google",
      campanha: "gestao-oficina",
    });
    expect(attributionFrom("?utm_source=folheto", "https://www.google.com/", HOST)).toEqual({
      fonte: "folheto",
      campanha: "-",
    });
  });

  it("sem UTM, usa só o domínio de onde veio (sem caminho nem parâmetros)", () => {
    expect(attributionFrom("", "https://www.google.com/search?q=programa+oficina", HOST)).toEqual({
      fonte: "google.com",
      campanha: "-",
    });
    expect(attributionFrom("", "https://l.facebook.com/l.php?u=xyz", HOST).fonte).toBe("l.facebook.com");
  });

  it("visitas diretas e vindas do próprio site contam como direto", () => {
    expect(attributionFrom("", "", HOST)).toEqual({ fonte: "direto", campanha: "-" });
    expect(attributionFrom("", "https://www.drivecell.pt/precos", HOST)).toEqual({ fonte: "direto", campanha: "-" });
    expect(attributionFrom("", "isto não é um url", HOST).fonte).toBe("direto");
  });

  it("limpa os valores: minúsculas, sem espaços nem símbolos, no máximo 40 caracteres", () => {
    const result = attributionFrom(
      `?utm_source=${encodeURIComponent(" Google Ads!! ")}&utm_campaign=${"x".repeat(80)}`,
      "",
      HOST,
    );
    expect(result.fonte).toBe("google-ads");
    expect(result.campanha).toHaveLength(40);
    expect(attributionFrom("?utm_source=%20%20", "", HOST).fonte).toBe("direto");
  });
});
