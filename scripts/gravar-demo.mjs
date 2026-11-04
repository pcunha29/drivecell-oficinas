/**
 * Grava os 4 clips da secção "Como funciona" da landing, usando a conta demo.
 *
 * Requisitos:
 *   - `npm run dev` a correr (ou DEMO_BASE_URL a apontar para a app)
 *   - DEMO_EMAIL e DEMO_PASSWORD no .env.local: o dono da "Oficina Ferreira & Filhos"
 *     (a oficina de todos os vídeos; outra via DEMO_WORKSHOP_NAME)
 *   - SUPABASE_SERVICE_ROLE_KEY no .env.local (para repor os dados antes e depois)
 *
 * Repor APAGA os clientes, viaturas e ordens da oficina e põe os de exemplo. Por isso
 * só se repõe a oficina de que DEMO_EMAIL é dono, e só se tiver esse nome e estiver
 * marcada como demonstração; caso contrário o script para sem mexer em nada.
 *   - uma vez: `npm install` e `npx playwright install chromium`
 *
 * Uso: npm run demo:gravar                  (grava os 4)
 *      npm run demo:gravar -- marcacao      (grava só esse clip; também aceita 1–4)
 *
 * Cada clip tem um nome fixo (marcacao, cliente, ordem, entregue), o mesmo que
 * o `clip` de cada passo em src/app/(marketing)/page.tsx. Mudar a ordem dos
 * passos na landing não troca os vídeos.
 *
 * O clip "marcacao" fica melhor gravado de segunda a quarta: as chegadas
 * previstas da demo (amanhã, depois de amanhã…) caem na semana que se vê.
 *
 * Saída: demo-recordings/raw/<clip>.webm + demo-recordings/manifest.json
 * Depois: npm run demo:converter  (precisa de ffmpeg) → public/demo/<clip>.*
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
/** A única oficina onde se grava (e que se repõe). Os vídeos da landing são todos desta. */
const DEMO_WORKSHOP_NAME = process.env.DEMO_WORKSHOP_NAME ?? "Oficina Ferreira & Filhos";
const HEADED = process.env.DEMO_HEADED === "1";

if (!EMAIL || !PASSWORD) {
  console.error("Faltam DEMO_EMAIL e DEMO_PASSWORD no .env.local.");
  process.exit(1);
}

const outDir = resolve(root, "demo-recordings");
const rawDir = resolve(outDir, "raw");
mkdirSync(rawDir, { recursive: true });

// --- Repor dados da oficina demo ---------------------------------------------

/**
 * A oficina de que a conta `email` é dona. Para (lança erro) se não houver
 * exatamente uma ou se não estiver marcada como demonstração.
 */
async function demoWorkshopOf(admin, email) {
  const wanted = email.trim().toLowerCase();
  let userId = null;
  for (let page = 1; !userId; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    userId = data.users.find((u) => u.email?.toLowerCase() === wanted)?.id ?? null;
    if (data.users.length < 1000) break;
  }
  if (!userId) throw new Error(`Não encontrei o utilizador ${email} (DEMO_EMAIL).`);

  const { data: memberships, error } = await admin
    .from("workshop_members")
    .select("role, workshops (id, name, is_demo)")
    .eq("user_id", userId)
    .eq("role", "owner");
  if (error) throw error;
  if (!memberships || memberships.length !== 1) {
    throw new Error(
      `A conta ${email} tem de ser dona de exatamente uma oficina (tem ${memberships?.length ?? 0}). Não reponho nada.`,
    );
  }
  const ws = Array.isArray(memberships[0].workshops) ? memberships[0].workshops[0] : memberships[0].workshops;
  const sameName = (a, b) => (a ?? "").trim().toLowerCase() === b.trim().toLowerCase();
  if (!sameName(ws?.name, DEMO_WORKSHOP_NAME)) {
    throw new Error(
      `A conta ${email} é dona de "${ws?.name ?? "?"}", não de "${DEMO_WORKSHOP_NAME}". Não gravo nem reponho nada.`,
    );
  }
  if (!ws?.is_demo) {
    throw new Error(
      `A oficina "${ws?.name ?? "?"}" da conta ${email} não está marcada como demonstração. Não reponho nada.`,
    );
  }
  return ws;
}

async function resetDemo() {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.warn("Sem service role: não reponho os dados da demo.");
    return;
  }
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  // Só a oficina da conta DEMO_EMAIL (a mesma com que se grava) — nunca "uma qualquer
  // com is_demo": seed_demo_data APAGA os clientes, viaturas e ordens da oficina.
  const ws = await demoWorkshopOf(admin, EMAIL);
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
  const paths = [
    "/entrar",
    "/app",
    "/app/marcacoes",
    "/app/clientes",
    "/app/viaturas",
  ];
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

// --- Marcação: escolher um horário livre na grelha da semana -------------------
/** Altura de uma hora na grelha, em px. Tem de bater com HOUR_HEIGHT em src/components/calendar/week-grid.tsx. */
const HOUR_HEIGHT = 56;
/** Duração da marcação gravada (min). */
const BOOKING_MINUTES = 120;
/**
 * Inícios a experimentar, de meia em meia hora entre as 08:00 e as 13:00, a começar
 * pelas 10:00 (fica a meio do ecrã). As marcações da demo mudam com o dia da semana.
 */
const SLOT_STARTS = [10, 9, 11, 12, 8, 13, 10.5, 9.5, 11.5, 12.5, 8.5].map((h) => h * 60);

const hhmm = (minutes) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

/** Hoje em Lisboa, AAAA-MM-DD (o mesmo formato do data-day da grelha). */
function todayLisbon() {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Lisbon" }).format(
    new Date(),
  );
}

/**
 * Primeiro dia (de hoje em diante) com uma ordem prevista (azul) e 2 h livres.
 * Devolve o ponto a clicar na coluna e as horas de início/fim.
 */
async function findFreeSlot(page) {
  const today = todayLisbon();
  const columns = page.locator("[data-day]");
  const count = await columns.count();
  for (let i = 0; i < count; i++) {
    const col = columns.nth(i);
    const day = await col.getAttribute("data-day");
    if (!day || day < today) continue;
    const hasOrder =
      (await col.locator('button[aria-label^="Ordem de reparação"]').count()) >
      0;
    if (!hasOrder) continue;
    const colBox = await col.boundingBox();
    if (!colBox) continue;
    const startHour = Number(await col.getAttribute("data-start-hour"));
    const chips = [];
    for (const chip of await col.locator("button").all()) {
      const b = await chip.boundingBox();
      if (b) chips.push(b);
    }
    for (const start of SLOT_STARTS) {
      const top = colBox.y + ((start - startHour * 60) / 60) * HOUR_HEIGHT;
      const bottom = top + (BOOKING_MINUTES / 60) * HOUR_HEIGHT;
      if (top < colBox.y || bottom > colBox.y + colBox.height) continue;
      // Sem scroll: a marcação toda tem de caber no ecrã.
      if (bottom > VIEWPORT.height - 8) continue;
      const busy = chips.some((b) => b.y < bottom && b.y + b.height > top);
      if (busy) continue;
      return {
        day,
        start: hhmm(start),
        end: hhmm(start + BOOKING_MINUTES),
        x: colBox.x + colBox.width / 2,
        // +14 px: dentro da primeira meia hora, que a grelha arredonda para `start`.
        y: top + 14,
      };
    }
  }
  throw new Error(
    "Não encontrei um dia com uma ordem prevista e 2 h livres entre as 08:00 e as 15:00, visíveis sem scroll.",
  );
}

// --- Os 4 passos (pela ordem da landing) ------------------------------------------
const STEPS = {
  marcacao: {
    title: "Marcação",
    url: "/app/marcacoes",
    async run(page) {
      // Semana com as ordens previstas (azul), as marcações (dourado) e «Sem hora».
      await page.locator("[data-day] button").first().waitFor();
      await pause(900);

      // Só passar por cima de uma ordem prevista (sem abrir).
      const order = page
        .locator('button[aria-label^="Ordem de reparação: 09:00"]')
        .first();
      const orderBox = await order.boundingBox();
      if (orderBox) {
        await page.mouse.move(
          orderBox.x + orderBox.width / 2,
          orderBox.y + orderBox.height / 2,
          { steps: 18 },
        );
        await pause(900);
      }

      // Tocar num horário livre. Rato "à mão": o click/moveTo fariam scroll à página.
      const slot = await findFreeSlot(page);
      await page.mouse.move(slot.x, slot.y, { steps: 18 });
      await pause(180);
      await page.mouse.click(slot.x, slot.y);

      const dialog = page.getByRole("dialog");
      await dialog.getByText("Nova marcação").first().waitFor();
      await pause(500);
      await type(page, page.locator("#ap-service"), "Lavagem completa");
      // Cliente da lista: telefone e matrícula preenchem-se sozinhos.
      await type(page, page.locator("#ap-customer"), "Ana Paula Silva");
      await pause(700);

      // Clicar à esquerda do input de hora, no campo das horas.
      const end = page.locator("#ap-end");
      await end.scrollIntoViewIfNeeded();
      const endBox = await end.boundingBox();
      if (!endBox) throw new Error("Campo Fim sem posição no ecrã");
      const hours = { x: 16, y: endBox.height / 2 };
      await page.mouse.move(endBox.x + hours.x, endBox.y + hours.y, {
        steps: 18,
      });
      await pause(180);
      await end.click({ position: hours });
      await end.pressSequentially(slot.end.replace(":", ""), { delay: 90 });
      if ((await end.inputValue()) !== slot.end) await end.fill(slot.end);
      await pause(600);

      await click(
        page,
        page.getByRole("button", { name: "Criar marcação", exact: true }),
      );
      await dialog.waitFor({ state: "hidden", timeout: 15000 });

      // O bloco novo (dourado) na grelha.
      const created = page
        .locator(
          'button[aria-label*="Ana Paula Silva"][aria-label*="Lavagem completa"]',
        )
        .first();
      await created.waitFor();
      const box = await created.boundingBox();
      if (box)
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, {
          steps: 18,
        });
      await pause(2000);
    },
  },
  cliente: {
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
  ordem: {
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
  entregue: {
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
async function record(browser, state, clip) {
  const step = STEPS[clip];
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
    const shot = resolve(outDir, `erro-${clip}.png`);
    await page.screenshot({ path: shot }).catch(() => {});
    const msgs = await page
      .locator('[role="dialog"] .text-red-600, [role="alert"]')
      .allInnerTexts()
      .catch(() => []);
    console.error(
      `\nO clip "${clip}" falhou em ${page.url()}. Captura em demo-recordings/erro-${clip}.png`,
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
  const dest = resolve(rawDir, `${clip}.webm`);
  renameSync(tmp, dest);
  console.log(
    `Clip "${clip}" (${step.title}) gravado: ${(end - start).toFixed(1)} s`,
  );
  return { file: `raw/${clip}.webm`, start, end, title: step.title };
}

// Aceita o nome do clip ou a posição na landing (1 = marcacao, 2 = cliente…).
const CLIPS = Object.keys(STEPS);
const only = process.argv
  .slice(2)
  .map((arg) => (/^\d+$/.test(arg) ? CLIPS[Number(arg) - 1] : arg))
  .filter((clip) => STEPS[clip]);
const which = only.length ? only : CLIPS;

if (which.includes("marcacao")) {
  const weekday = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Lisbon",
    weekday: "short",
  }).format(new Date());
  if (!["Mon", "Tue", "Wed"].includes(weekday))
    console.warn(
      'Aviso: o clip "marcacao" fica melhor de segunda a quarta (as chegadas previstas podem cair na semana seguinte).',
    );
}

const browser = await chromium.launch({ headless: !HEADED });
const manifestPath = resolve(outDir, "manifest.json");
// Ignora as entradas antigas por número ("1", "2"…), de antes dos nomes fixos.
const manifest = Object.fromEntries(
  Object.entries(
    existsSync(manifestPath)
      ? JSON.parse(readFileSync(manifestPath, "utf8"))
      : {},
  ).filter(([key]) => STEPS[key]),
);
try {
  await warmUp();
  const state = await login(browser);
  for (const clip of which) {
    await resetDemo();
    manifest[clip] = await record(browser, state, clip);
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
