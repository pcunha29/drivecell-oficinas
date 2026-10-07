import { describe, expect, it } from "vitest";
import { orderFormSchema, serviceItemSchema } from "@/lib/order-form-schema";
import { safeNextPath } from "@/lib/safe-next-path";
import { isAllowedDuringConstruction } from "@/lib/site-mode";

describe("linha de uma ordem (serviceItemSchema)", () => {
  it("custo vazio fica null; números em texto são convertidos", () => {
    expect(serviceItemSchema.parse({ description: "Mão de obra", quantity: "1.5", unitPrice: "35", unitCost: "" })).toEqual({
      description: "Mão de obra",
      quantity: 1.5,
      unitPrice: 35,
      unitCost: null,
    });
    expect(serviceItemSchema.parse({ description: "Peça", quantity: 1, unitPrice: 10, unitCost: Number.NaN }).unitCost).toBeNull();
    expect(serviceItemSchema.parse({ description: "Peça", quantity: 1, unitPrice: 10, unitCost: "6.5" }).unitCost).toBe(6.5);
  });

  it("recusa quantidade zero e valores negativos", () => {
    expect(serviceItemSchema.safeParse({ description: "", quantity: 0, unitPrice: 1 }).success).toBe(false);
    expect(serviceItemSchema.safeParse({ description: "", quantity: 1, unitPrice: -1 }).success).toBe(false);
    expect(serviceItemSchema.safeParse({ description: "", quantity: 1, unitPrice: 1, unitCost: -1 }).success).toBe(false);
  });
});

describe("ordem (orderFormSchema)", () => {
  it("exige cliente, viatura e descrição", () => {
    const result = orderFormSchema.safeParse({ vehicleId: "", customerId: "", status: "waiting", description: "" });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((i) => i.path[0]).sort()).toEqual(["customerId", "description", "vehicleId"]);
  });

  it("preenche os valores por omissão", () => {
    expect(orderFormSchema.parse({ vehicleId: "v", customerId: "c", status: "waiting", description: "Revisão" })).toMatchObject({
      notes: "",
      paid: false,
      items: [],
    });
  });
});

describe("modo em construção", () => {
  it.each(["/", "/precos", "/perguntas", "/pagina-nova", "/termosx"])("esconde %s", (path) => {
    expect(isAllowedDuringConstruction(path)).toBe(false);
  });

  it.each(["/em-construcao", "/termos", "/entrar", "/app", "/app/clientes", "/admin/site", "/api/exportar", "/auth/confirm", "/robots.txt", "/demo/passo-1.mp4"])(
    "deixa passar %s",
    (path) => {
      expect(isAllowedDuringConstruction(path)).toBe(true);
    },
  );
});

describe("redirecionamento depois do login (safeNextPath)", () => {
  it.each([
    ["/app/clientes", "/app/clientes"],
    ["https://mau.exemplo", "/app"],
    ["//mau.exemplo", "/app"],
    ["/\\mau.exemplo", "/app"],
    [null, "/app"],
  ])("%s → %s", (next, expected) => {
    expect(safeNextPath(next)).toBe(expected);
  });
});
