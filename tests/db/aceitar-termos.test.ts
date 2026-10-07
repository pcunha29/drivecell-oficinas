import { describe, expect, it } from "vitest";
import {
  addMember,
  admin,
  anon,
  createUser,
  ownerWithWorkshop,
  pgError,
  sql,
  user,
} from "./helpers";

async function acceptances(userId: string) {
  return sql<{ version: string }>(admin, "select version from public.terms_acceptances where user_id = $1 order by version", [userId]);
}

async function workshopTerms(workshopId: string) {
  const [row] = await sql<{ terms_version: string | null; terms_accepted_at: Date | null }>(
    admin,
    "select terms_version, terms_accepted_at from public.workshops where id = $1",
    [workshopId],
  );
  return row;
}

describe("aceitação dos termos no primeiro acesso (accept_terms)", () => {
  it("regista a versão com a hora do servidor e passa-a para a oficina do dono", async () => {
    const ws = await ownerWithWorkshop();
    expect((await workshopTerms(ws.workshopId)).terms_version).toBeNull();

    const [{ accepted_at }] = await sql<{ accepted_at: Date }>(ws.owner, "select public.accept_terms('1.0.0') as accepted_at");
    expect(Math.abs(Date.now() - accepted_at.getTime())).toBeLessThan(60_000);

    expect(await acceptances(ws.ownerId)).toEqual([{ version: "1.0.0" }]);
    const terms = await workshopTerms(ws.workshopId);
    expect(terms.terms_version).toBe("1.0.0");
    expect(terms.terms_accepted_at?.getTime()).toBe(accepted_at.getTime());
  });

  it("aceitar outra vez a mesma versão não muda a data original", async () => {
    const ws = await ownerWithWorkshop();
    const [first] = await sql<{ t: Date }>(ws.owner, "select public.accept_terms('1.0.0') as t");
    const [second] = await sql<{ t: Date }>(ws.owner, "select public.accept_terms('1.0.0') as t");
    expect(second.t.getTime()).toBe(first.t.getTime());
    expect(await acceptances(ws.ownerId)).toHaveLength(1);
  });

  it("uma versão nova fica registada ao lado da anterior", async () => {
    const ws = await ownerWithWorkshop();
    await sql(ws.owner, "select public.accept_terms('1.0.0')");
    await sql(ws.owner, "select public.accept_terms('1.1.0')");
    expect(await acceptances(ws.ownerId)).toEqual([{ version: "1.0.0" }, { version: "1.1.0" }]);
    expect((await workshopTerms(ws.workshopId)).terms_version).toBe("1.1.0");
  });

  it("o mecânico (membro) aceita por si, sem mexer nos termos da oficina", async () => {
    const ws = await ownerWithWorkshop();
    const mechanicId = await createUser();
    await addMember(ws.workshopId, mechanicId);

    await sql(user(mechanicId), "select public.accept_terms('1.0.0')");
    expect(await acceptances(mechanicId)).toEqual([{ version: "1.0.0" }]);
    expect((await workshopTerms(ws.workshopId)).terms_version).toBeNull();
  });

  it("cada utilizador só vê as suas aceitações e não as consegue escrever à mão", async () => {
    const a = await ownerWithWorkshop();
    const b = await ownerWithWorkshop();
    await sql(a.owner, "select public.accept_terms('1.0.0')");
    await sql(b.owner, "select public.accept_terms('1.0.0')");

    const seen = await sql<{ user_id: string }>(a.owner, "select user_id from public.terms_acceptances");
    expect(seen.map((r) => r.user_id)).toEqual([a.ownerId]);

    const insert = await pgError(sql(a.owner, "insert into public.terms_acceptances (user_id, version) values ($1, '9.9.9')", [a.ownerId]));
    expect(insert.code).toBe("42501");
    const update = await pgError(sql(a.owner, "update public.terms_acceptances set accepted_at = now() - interval '1 year'"));
    expect(update.code).toBe("42501");
  });

  it("recusa visitantes sem sessão e versões vazias", async () => {
    expect((await pgError(sql(anon, "select public.accept_terms('1.0.0')"))).code).toBe("42501");
    const ws = await ownerWithWorkshop();
    expect((await pgError(sql(ws.owner, "select public.accept_terms('  ')"))).message).toContain("invalid_version");
  });

  it("apagar o utilizador apaga o registo das aceitações dele", async () => {
    const someoneId = await createUser();
    await sql(user(someoneId), "select public.accept_terms('1.0.0')");
    await sql(admin, "delete from auth.users where id = $1", [someoneId]);
    expect(await acceptances(someoneId)).toEqual([]);
  });
});
