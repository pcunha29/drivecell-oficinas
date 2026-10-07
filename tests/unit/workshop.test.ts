import { describe, expect, it } from "vitest";
import { trialDaysLeft, workshopCanWrite } from "@/lib/workshop";

const NOW = new Date("2026-10-07T12:00:00.000Z");
const at = (iso: string) => ({ trial_ends_at: iso });

describe("workshopCanWrite (espelha can_write em SQL)", () => {
  it.each([
    ["active", "2020-01-01T00:00:00Z", true],
    ["past_due", "2020-01-01T00:00:00Z", true],
    ["canceled", "2030-01-01T00:00:00Z", false],
    ["trialing", "2026-10-07T12:00:01Z", true],
    ["trialing", "2026-10-07T12:00:00Z", false],
    ["trialing", "2026-10-01T00:00:00Z", false],
  ] as const)("%s com teste até %s → %s", (status, trialEndsAt, expected) => {
    expect(workshopCanWrite({ subscription_status: status, ...at(trialEndsAt) }, NOW)).toBe(expected);
  });
});

describe("trialDaysLeft", () => {
  it("arredonda para cima e fica negativo depois do fim", () => {
    expect(trialDaysLeft(at("2026-10-14T12:00:00Z"), NOW)).toBe(7);
    expect(trialDaysLeft(at("2026-10-07T13:00:00Z"), NOW)).toBe(1);
    expect(trialDaysLeft(at("2026-10-05T12:00:00Z"), NOW)).toBe(-2);
  });
});
