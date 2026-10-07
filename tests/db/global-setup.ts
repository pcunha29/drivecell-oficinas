import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { Client } from "pg";
import type { TestProject } from "vitest/node";

/**
 * Cria uma base de dados descartável, aplica o "stub" do Supabase e todas as
 * migrações por ordem, e apaga-a no fim.
 *
 * TEST_DATABASE_URL: ligação de administrador a um Postgres local ou de CI,
 * ex. postgres://postgres:postgres@localhost:5432/postgres. NUNCA a de produção:
 * o nome da base de dados é sempre gerado aqui e a recusa abaixo trava ligações remotas.
 */
const ROOT = join(import.meta.dirname, "..", "..");

declare module "vitest" {
  export interface ProvidedContext {
    dbUrl: string;
  }
}

function assertLocal(url: URL) {
  const allowed = ["localhost", "127.0.0.1", "::1", "postgres", "db"];
  if (!allowed.includes(url.hostname) && process.env.TEST_DATABASE_ALLOW_REMOTE !== "1") {
    throw new Error(
      `TEST_DATABASE_URL aponta para "${url.hostname}". Os testes só correm em Postgres local/CI.`,
    );
  }
}

export default async function setup(project: TestProject) {
  const raw = process.env.TEST_DATABASE_URL;
  if (!raw) {
    throw new Error(
      "Falta TEST_DATABASE_URL (ex.: postgres://postgres:postgres@localhost:5432/postgres). Ver tests/README.md.",
    );
  }
  const adminUrl = new URL(raw);
  assertLocal(adminUrl);

  const dbName = `drivecell_test_${process.pid}_${Date.now()}`;
  const admin = new Client({ connectionString: adminUrl.toString() });
  await admin.connect();
  await admin.query(`create database ${dbName}`);
  await admin.end();

  const testUrl = new URL(adminUrl.toString());
  testUrl.pathname = `/${dbName}`;

  const db = new Client({ connectionString: testUrl.toString() });
  await db.connect();
  try {
    await db.query(await readFile(join(ROOT, "tests/db/supabase-stub.sql"), "utf8"));
    const dir = join(ROOT, "supabase/migrations");
    const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();
    for (const file of files) {
      try {
        await db.query(await readFile(join(dir, file), "utf8"));
      } catch (error) {
        throw new Error(`Migração ${file} falhou: ${(error as Error).message}`);
      }
    }
  } finally {
    await db.end();
  }

  project.provide("dbUrl", testUrl.toString());

  return async () => {
    const cleanup = new Client({ connectionString: adminUrl.toString() });
    await cleanup.connect();
    await cleanup.query(`drop database if exists ${dbName} with (force)`);
    await cleanup.end();
  };
}
