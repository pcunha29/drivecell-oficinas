/**
 * Grava os 3 clips da secção "Como funciona" da landing, usando a conta demo.
 *
 * Requisitos:
 *   - `npm run dev` a correr (ou DEMO_BASE_URL a apontar para a app)
 *   - DEMO_EMAIL e DEMO_PASSWORD no .env.local (a conta da oficina demo)
 *   - SUPABASE_SERVICE_ROLE_KEY no .env.local (para repor os dados antes e depois)
 *   - uma vez: `npm install` e `npx playwright install chromium`
 *
 * Uso: npm run demo:gravar            (grava os 3)
 *      npm run demo:gravar -- 2       (grava só o passo 2)
 *
 * Saída: demo-recordings/raw/passo-N.webm + demo-recordings/manifest.json
 * Depois: npm run demo:converter  (precisa de ffmpeg) → public/demo/
 */
import {
  readFileSync,
  existsSync,
  mkdirSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// --- .env.local ------------------------------------------------------------
const envPath = resolve(root, ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#") || !t.includes("=")) continue;
    const i = t.indexOf("=");
    const k = t.slice(0, i).trim();
    const v = t
      .slice(i + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
    if (!process.env[k]) process.env[k] = v;
  }
}

const BASE = process.env.DEMO_BASE_URL ?? "http://localhost:3000";
const EMAIL = process.env.DEMO_EMAIL;
const PASSWORD = process.env.DEMO_PASSWORD;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
const VIEWPORT = { width: 1280, height: 800 };
const HEADED = process.env.DEMO_HEADED === "1";

if (!EMAIL || !PASSWORD) {
  console.error("Faltam DEMO_EMAIL e DEMO_PASSWORD no .env.local.");
  process.exit(1);
}

const outDir = resolve(root, "demo-recordings");
const rawDir = resolve(outDir, "raw");
mkdirSync(rawDir, { recursive: true });

// --- Repor dados da oficina demo ---------------------------------------------
async function resetDemo() {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.warn("Sem service role: não reponho os dados da demo.");
    return;
  }
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: ws, error } = await admin
    .from("workshops")
    .select("id, name")
    .eq("is_demo", true)
    .limit(1)
    .maybeSingle();
  if (error || !ws) {
    console.warn(
      "Oficina demo não encontrada:",
      error?.message ?? "nenhuma com is_demo",
    );
    return;
  }
  const { error: seedErr } = await admin.rpc("seed_demo_data", {
    p_workshop_id: ws.id,
  });
  if (seedErr) throw seedErr;
  console.log(`Dados de "${ws.name}" repostos.`);
}

// --- Cursor visível (o Chromium headless não desenha o rato) -----------------
const CURSOR_SCRIPT = `
(() => {
  try {
    localStorage.setItem('theme', 'light');
    localStorage.setItem('drivecell-prices-visible', 'true');
  } catch {}
  const install = () => {
    if (document.getElementById('__demo_cursor')) return;
    const c = document.createElement('div');
    c.id = '__demo_cursor';
    c.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24"><path d="M4 2l15 11-6.5 1.2L9 21z" fill="#15171B" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg>';
    Object.assign(c.style, { position: 'fixed', left: '-40px', top: '-40px', zIndex: 2147483647, pointerEvents: 'none', transition: 'transform 60ms linear' });
    document.documentElement.appendChild(c);
    const ring = document.createElement('div');
    Object.assign(ring.style, { position: 'fixed', width: '34px', height: '34px', marginLeft: '-17px', marginTop: '-17px', borderRadius: '50%', border: '2px solid #B8401A', opacity: '0', zIndex: 2147483646, pointerEvents: 'none', transition: 'opacity 250ms, transform 250ms' });
    document.documentElement.appendChild(ring);
    addEventListener('mousemove', (e) => { c.style.left = e.clientX - 3 + 'px'; c.style.top = e.clientY - 2 + 'px'; }, true);
    addEventListener('mousedown', (e) => {
      ring.style.left = e.clientX + 'px'; ring.style.top = e.clientY + 'px';
      ring.style.transition = 'none'; ring.style.opacity = '0.9'; ring.style.transform = 'scale(0.4)';
      requestAnimationFrame(() => { ring.style.transition = 'opacity 350ms, transform 350ms'; ring.style.opacity = '0'; ring.style.transform = 'scale(1.3)'; });
    }, true);
  };
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', install); else install();
})();
`;

// --- Ajudas de "humano" ------------------------------------------------------
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

async function moveTo(page, locator, { steps = 18 } = {}) {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  if (!box) throw new Error("Elemento sem posição no ecrã");
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y, { steps });
  return { x, y };
}

async function click(page, locator) {
  await moveTo(page, locator);
  await pause(180);
  await locator.click();
  await pause(250);
}

async function type(page, locator, text) {
  await click(page, locator);
  await locator.fill(""); // alguns campos já vêm preenchidos (ex.: o ano)
  await locator.pressSequentially(text, { delay: 55 });
  await pause(200);
}

async function select(page, locator, label) {
  await click(page, locator);
  await locator.selectOption({ label });
  await pause(350);
}

// --- Aquecer o servidor de desenvolvimento ------------------------------------
// Em `npm run dev` cada página compila no primeiro pedido (pode levar 10–30 s).
async function warmUp() {
  const paths = ["/entrar", "/app", "/app/clientes", "/app/viaturas"];
  process.stdout.write("A preparar as páginas");
  for (const p of paths) {
    try {
      await fetch(`${BASE}${p}`, {
        redirect: "manual",
        signal: AbortSignal.timeout(90000),
      });
    } catch (e) {
      if (p === "/entrar") {
        console.error(
          `\nNão consegui abrir ${BASE}${p} - o npm run dev está a correr? (${e.message})`,
        );
        process.exit(1);
      }
    }
    process.stdout.write(".");
  }
  console.log(" ok");
}

// --- Login (uma vez, fora das gravações) -------------------------------------
async function login(browser) {
  const ctx = await browser.newContext({ viewport: VIEWPORT });
  const page = await ctx.newPage();
  try {
    await page.goto(`${BASE}/entrar`);
    await page.locator("#l-email").fill(EMAIL);
    await page.locator("#l-pass").fill(PASSWORD);
    await page.locator('form button[type="submit"]').first().click();

    // Espera por uma de três coisas: entrou na app, conta sem oficina, ou erro no formulário.
    const alert = page
      .locator('[role="alert"]')
      .filter({ hasText: /\S/ })
      .first();
    // As esperas que perdem a corrida são ignoradas (não rebentam o processo).
    const settle = (promise, value) =>
      promise.then(
        () => value,
        () => new Promise(() => {}),
      );
    const outcome = await Promise.race([
      settle(
        page.waitForURL((u) => u.pathname.startsWith("/app"), {
          timeout: 90000,
          waitUntil: "commit",
        }),
        "app",
      ),
      settle(
        page.waitForURL((u) => u.pathname.startsWith("/sem-oficina"), {
          timeout: 90000,
          waitUntil: "commit",
        }),
        "sem-oficina",
      ),
      settle(alert.waitFor({ timeout: 90000 }), "erro"),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Sem resposta do login em 90 s.")),
          92000,
        ),
      ),
    ]);

    if (outcome === "erro") {
      throw new Error(
        `O login falhou: "${(await alert.innerText()).trim()}". Confirma DEMO_EMAIL e DEMO_PASSWORD no .env.local.`,
      );
    }
    if (outcome === "sem-oficina") {
      throw new Error(
        "A conta demo entrou mas não tem oficina associada. Cria-a em /admin → Criar conta demo, com este email.",
      );
    }
    await page
      .getByRole("button", { name: "Nova ordem" })
      .waitFor({ timeout: 60000 });
    return await ctx.storageState();
  } catch (e) {
    const shot = resolve(outDir, "erro-login.png");
    await page.screenshot({ path: shot }).catch(() => {});
    console.error(
      `\nFalhou no login (URL atual: ${page.url()}). Captura em demo-recordings/erro-login.png`,
    );
    throw e;
  } finally {
    await ctx.close();
  }
}

// --- Os 3 passos ---------------------------------------------------------------
const STEPS = {
  1: {
    title: "Cliente e viatura",
    url: "/app/clientes",
    async run(page) {
      await click(page, page.getByRole("button", { name: "Novo cliente" }));
      await type(page, page.locator("#name"), "Sofia Marques");
      await type(page, page.locator("#phone"), "914 202 118");
      await type(page, page.locator("#email"), "sofia.marques@exemplo.pt");
      await click(
        page,
        page.getByRole("button", { name: "Criar", exact: true }),
      );
      await page
        .getByRole("dialog")
        .waitFor({ state: "hidden", timeout: 15000 });
      await pause(900);
      await page.goto(`${BASE}/app/viaturas`);
      await page.getByRole("button", { name: "Nova viatura" }).waitFor();
      await pause(600);
      await click(page, page.getByRole("button", { name: "Nova viatura" }));
      await select(page, page.locator("#customerId"), "Sofia Marques");
      await type(page, page.locator("#plate"), "AQ-27-LM");
      await type(page, page.locator("#make"), "Renault");
      await type(page, page.locator("#model"), "Captur");
      await type(page, page.locator("#year"), "2021");
      await click(
        page,
        page.getByRole("button", { name: "Criar", exact: true }),
      );
      await page
        .getByRole("dialog")
        .waitFor({ state: "hidden", timeout: 15000 });
      await pause(1600);
    },
  },
  2: {
    title: "Ordem de reparação",
    url: "/app",
    async run(page) {
      await click(page, page.getByRole("button", { name: "Nova ordem" }));
      await select(page, page.locator("#customerId"), "Marta Figueiredo");
      const vehicle = page.locator("#vehicleId");
      await click(page, vehicle);
      await vehicle.selectOption({ index: 1 });
      await pause(350);
      await type(
        page,
        page.locator("#description"),
        "Pastilhas e discos dianteiros",
      );
      const lines = [
        ["Pastilhas dianteiras", "1", "58"],
        ["Discos dianteiros", "2", "64"],
        ["Mão de obra", "1.5", "35"],
      ];
      for (let i = 0; i < lines.length; i++) {
        if (i > 0)
          await click(
            page,
            page.getByRole("button", { name: "Adicionar", exact: true }),
          );
        const [d, q, p] = lines[i];
        await type(page, page.locator(`[id="items.${i}.description"]`), d);
        const qty = page.locator(`[id="items.${i}.quantity"]`);
        await click(page, qty);
        await qty.fill("");
        await qty.pressSequentially(q, { delay: 70 });
        const price = page.locator(`[id="items.${i}.unitPrice"]`);
        await click(page, price);
        await price.fill("");
        await price.pressSequentially(p, { delay: 70 });
        await pause(300);
      }
      await pause(700);
      await click(
        page,
        page.getByRole("button", { name: "Criar ordem", exact: true }),
      );
      await page
        .getByRole("dialog")
        .waitFor({ state: "hidden", timeout: 15000 });
      await pause(1800);
    },
  },
  3: {
    title: "Arrastar até Entregue",
    url: "/app",
    async run(page) {
      const card = page
        .locator('[data-status="in_progress"] [data-order-id]')
        .first();
      await card.waitFor();
      const handle = card.getByRole("button", { name: "Arrastar" });
      const target = page.locator('[data-status="delivered"]');
      await pause(500);
      const from = await moveTo(page, handle, { steps: 22 });
      await pause(300);
      await page.mouse.down();
      await page.mouse.move(from.x + 10, from.y + 4, { steps: 4 }); // ativa o dnd-kit (8 px)
      const box = await target.boundingBox();
      if (!box) throw new Error("Coluna Entregue não encontrada");
      await page.mouse.move(box.x + box.width / 2, box.y + 120, { steps: 45 });
      await pause(350);
      await page.mouse.up();
      await pause(2200);
    },
  },
};

// --- Gravação ------------------------------------------------------------------
async function record(browser, state, n) {
  const step = STEPS[n];
  const ctx = await browser.newContext({
    viewport: VIEWPORT,
    colorScheme: "light",
    locale: "pt-PT",
    timezoneId: "Europe/Lisbon",
    storageState: state,
    recordVideo: { dir: rawDir, size: VIEWPORT },
  });
  await ctx.addInitScript(CURSOR_SCRIPT);
  const t0 = Date.now();
  const page = await ctx.newPage();
  await page.goto(`${BASE}${step.url}`);
  await page.waitForLoadState("networkidle");
  await page
    .getByText("A carregar dados...")
    .waitFor({ state: "hidden" })
    .catch(() => {});
  await page.mouse.move(VIEWPORT.width * 0.62, VIEWPORT.height * 0.55);
  await pause(700);
  const start = (Date.now() - t0) / 1000;
  try {
    await step.run(page);
  } catch (e) {
    const shot = resolve(outDir, `erro-passo-${n}.png`);
    await page.screenshot({ path: shot }).catch(() => {});
    const msgs = await page
      .locator('[role="dialog"] .text-red-600, [role="alert"]')
      .allInnerTexts()
      .catch(() => []);
    console.error(
      `\nO passo ${n} falhou em ${page.url()}. Captura em demo-recordings/erro-passo-${n}.png`,
    );
    if (msgs.filter((m) => m.trim()).length)
      console.error(
        "Mensagens no ecrã:",
        msgs.filter((m) => m.trim()).join(" | "),
      );
    await ctx.close().catch(() => {});
    throw e;
  }
  const end = (Date.now() - t0) / 1000;
  const video = page.video();
  await ctx.close();
  const tmp = await video.path();
  const dest = resolve(rawDir, `passo-${n}.webm`);
  renameSync(tmp, dest);
  console.log(
    `Passo ${n} (${step.title}) gravado: ${(end - start).toFixed(1)} s`,
  );
  return { file: `raw/passo-${n}.webm`, start, end, title: step.title };
}

const only = process.argv
  .slice(2)
  .map(Number)
  .filter((n) => STEPS[n]);
const which = only.length ? only : [1, 2, 3];

const browser = await chromium.launch({ headless: !HEADED });
const manifestPath = resolve(outDir, "manifest.json");
const manifest = existsSync(manifestPath)
  ? JSON.parse(readFileSync(manifestPath, "utf8"))
  : {};
try {
  await warmUp();
  const state = await login(browser);
  for (const n of which) {
    await resetDemo();
    manifest[n] = await record(browser, state, n);
    writeFileSync(
      manifestPath,
      JSON.stringify({ ...manifest, viewport: VIEWPORT }, null, 2),
    );
  }
} finally {
  await browser.close();
  await resetDemo().catch((e) =>
    console.warn("Falhou repor a demo:", e.message),
  );
}
console.log("\nFeito. Agora: npm run demo:converter");
