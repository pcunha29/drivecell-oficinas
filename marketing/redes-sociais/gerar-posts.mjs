/**
 * Os 6 posts de arranque do Facebook e do Instagram (1080×1350, 4:5).
 *
 * Uso (a partir da raiz do repositório; precisa do ffmpeg):
 *   node marketing/redes-sociais/gerar-posts.mjs
 *
 * Saída em marketing/redes-sociais/arranque/:
 *   1-apresentacao.png, 2-dor.png          → posts de imagem
 *   3-marcacao.mp4 … 6-entregue.mp4        → posts de vídeo (sem som; juntar música no Instagram)
 *   3-marcacao-capa.png … 6-entregue-capa.png → capas dos vídeos
 *
 * Os vídeos usam os clips da demo do site (public/demo, só a Oficina Ferreira & Filhos), recortados
 * para tirar a barra de cima (nome de quem gravou, selo DEMO), o botão "N" do Next e a saudação
 * em "tu". O clip dos clientes perde o ecrã "A verificar sessão…" ao mudar de página.
 * Textos em "você" (decisão do council para materiais de marketing). Legendas em legendas.md.
 */
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "../..");
const OUT = join(HERE, "arranque");
const BUILD = join(HERE, ".build");
const require = createRequire(join(REPO, "package.json"));
const { chromium } = require("playwright");

const W = 1080;
const H = 1350;

const logo = (name) =>
  "data:image/png;base64," + readFileSync(join(REPO, "public/logos", name)).toString("base64");
const LOGO_COLOR = logo("logo-full-color.png");
const LOGO_WHITE = logo("logo-full-white.png");

const CSS = `
* { box-sizing: border-box; margin: 0; padding: 0; }
:root { --night: #0d2c4a; --gold: #b18d56; --gold-soft: #d4b47e; --cream: #f4f1ea; --ink: #0f1d2b; --ink2: #3a4654; --line: #ddd5c6; }
html, body { width: ${W}px; height: ${H}px; background: transparent; }
body { font-family: Geist, Inter, Arial, sans-serif; color: var(--ink); -webkit-font-smoothing: antialiased; }
.post { width: ${W}px; height: ${H}px; position: relative; overflow: hidden; display: flex; flex-direction: column; }
.serif { font-family: "Instrument Serif", Georgia, serif; font-weight: 400; letter-spacing: -0.01em; }
.brand { display: flex; align-items: center; gap: 16px; }
.brand img { height: 46px; width: auto; }
.brand span { font-size: 21px; font-weight: 600; letter-spacing: 0.2em; text-transform: uppercase; color: var(--gold); }
em { font-style: italic; color: var(--gold); }

/* 1 · apresentação (fundo escuro) */
.intro { background: var(--night); color: #fff; padding: 90px 90px 80px; }
.intro .rule { width: 120px; height: 5px; background: var(--gold); margin: 64px 0 48px; }
.intro h1 { font-size: 112px; line-height: 0.98; }
.intro h1 em { color: var(--gold-soft); }
.intro .sub { font-size: 36px; line-height: 1.4; color: #cfd8e2; margin-top: 44px; max-width: 840px; }
.intro .bottom { margin-top: auto; display: flex; justify-content: space-between; align-items: flex-end; border-top: 2px solid rgba(255,255,255,0.18); padding-top: 36px; }
.intro .offer { font-size: 38px; line-height: 1.25; font-weight: 600; }
.intro .offer small { display: block; font-size: 26px; font-weight: 400; color: #aebbc9; margin-top: 8px; }
.intro .site { font-size: 28px; color: var(--gold-soft); font-weight: 600; letter-spacing: 0.02em; }

/* 2 · a dor (fundo claro) */
.pain { background: var(--cream); padding: 90px 90px 80px; }
.pain .q { margin-top: 90px; font-size: 128px; line-height: 0.98; color: var(--night); }
.pain .sub { font-size: 38px; line-height: 1.42; color: var(--ink2); margin-top: 56px; max-width: 860px; }
.pain .sub b { color: var(--night); font-weight: 600; }
.pain .note { margin-top: auto; border: 3px solid var(--night); border-radius: 18px; padding: 30px 36px; font-size: 30px; line-height: 1.4; color: var(--night); background: #fff; }
.pain .note b { font-weight: 700; }

/* 3–6 · moldura dos vídeos (a janela fica transparente para o clip aparecer por baixo) */
.frame { background: transparent; }
.frame .top, .frame .bottom, .frame .side { position: absolute; background: var(--cream); }
.frame .top { left: 0; right: 0; top: 0; padding: 64px 64px 0; display: flex; flex-direction: column; gap: 22px; }
.frame .step { display: flex; align-items: center; gap: 14px; font-size: 24px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; color: var(--gold); }
.frame .step b { display: inline-grid; place-items: center; width: 44px; height: 44px; border-radius: 50%; background: var(--night); color: #fff; letter-spacing: 0; font-size: 22px; }
.frame h2 { font-size: 72px; line-height: 1.0; color: var(--night); }
.frame .bottom { left: 0; right: 0; bottom: 0; padding: 28px 64px 56px; display: flex; flex-direction: column; justify-content: flex-end; gap: 22px; }
.frame .bottom p { font-size: 30px; line-height: 1.38; color: var(--ink2); }
.frame .bottom .row { display: flex; justify-content: space-between; align-items: center; border-top: 2px solid var(--line); padding-top: 24px; }
.frame .bottom .row span { font-size: 26px; font-weight: 600; color: var(--night); }
.frame .bottom .row img { height: 36px; }

/* lista com visto (post 1) e cartões tipo app (post 2) */
.ticks { list-style: none; display: flex; flex-direction: column; gap: 22px; margin-top: 56px; }
.ticks li { display: flex; align-items: center; gap: 22px; font-size: 34px; font-weight: 500; }
.ticks li::before { content: ""; flex: none; width: 44px; height: 44px; border-radius: 50%;
  background: var(--gold) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%230d2c4a' stroke-width='3.2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M5 12l5 5L20 7'/%3E%3C/svg%3E") center/60% no-repeat; }
.cards { display: grid; grid-template-columns: 1fr 1fr 1.35fr; gap: 20px; margin-top: 60px; }
.card { background: #fff; border: 2px solid var(--line); border-radius: 20px; padding: 24px 26px; box-shadow: 0 8px 24px rgba(13,44,74,0.07); }
.card span { display: block; font-size: 24px; color: var(--ink2); }
.card b { display: block; font-size: 52px; font-weight: 700; color: var(--night); margin-top: 8px; letter-spacing: -0.01em; }
.card.gold { border-color: var(--gold); }
.card.gold b { color: var(--gold); }
`;

const page = (body) =>
  `<!doctype html><html lang="pt-PT"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet">
<style>${CSS}</style></head><body>${body}</body></html>`;

const brand = (white = false) =>
  `<div class="brand"><img src="${white ? LOGO_WHITE : LOGO_COLOR}" alt="DriveCell"><span>Oficinas</span></div>`;

const STATIC = [
  {
    file: "1-apresentacao.png",
    html: `<div class="post intro">
      ${brand(true)}
      <div class="rule"></div>
      <h1 class="serif">O programa simples para gerir a <em>sua oficina.</em></h1>
      <p class="sub">No telemóvel ou no computador, sem instalar nada.</p>
      <ul class="ticks">
        <li>Todos os carros num quadro</li>
        <li>Quanto tem por cobrar</li>
        <li>Marcações da semana</li>
      </ul>
      <div class="bottom">
        <div class="offer">30 dias grátis<small>com os dados da sua oficina · sem cartão</small></div>
        <div class="site">drivecell.pt</div>
      </div>
    </div>`,
  },
  {
    file: "2-dor.png",
    html: `<div class="post pain">
      ${brand()}
      <h1 class="q serif">Que carros estão prontos? <em>Quanto tem por cobrar?</em></h1>
      <p class="sub">Se a resposta está num caderno, num quadro branco ou na cabeça de alguém, <b>o DriveCell mostra-lha num relance.</b></p>
      <div class="cards">
        <div class="card"><span>Prontos</span><b>4</b></div>
        <div class="card"><span>Em curso</span><b>3</b></div>
        <div class="card gold"><span>Por cobrar</span><b>1245 €</b></div>
      </div>
      <div class="note"><b>Não passa faturas.</b> Funciona ao lado do programa de faturação que já usa.</div>
    </div>`,
  },
];

/*
 * Vídeos: crop = zona do clip original (1280×800) que fica; hole = onde aparece no post.
 * A largura do recorte é sempre 960 px → 1080 px no post (escala 1,125).
 */
const VIDEOS = [
  {
    slug: "3-marcacao",
    clip: "marcacao.mp4",
    crop: { x: 240, y: 66, w: 960, h: 674 },
    step: "Marcar",
    n: 1,
    title: "A marcação fica feita <em>em segundos.</em>",
    text: "As marcações da semana e os carros que vão chegar, no mesmo calendário.",
    cover: 9.5,
  },
  {
    slug: "4-cliente",
    clip: "cliente.mp4",
    crop: { x: 240, y: 80, w: 960, h: 660 },
    cut: [[0, 8.5], [9.05, null]],
    step: "Cliente e viatura",
    n: 2,
    title: "Cliente novo? <em>Fica registado com a viatura.</em>",
    text: "Da próxima vez, encontra-o pelo nome ou pela matrícula.",
    cover: 4,
  },
  {
    slug: "5-ordem",
    clip: "ordem.mp4",
    crop: { x: 160, y: 66, w: 960, h: 700 },
    speed: 1.2,
    step: "Ordem de reparação",
    n: 3,
    title: "Peças e mão de obra: <em>o total faz-se sozinho.</em>",
    text: "A equipa toda vê a mesma ordem. Sem papéis perdidos nem contas à mão.",
    cover: 16,
  },
  {
    slug: "6-entregue",
    clip: "entregue.mp4",
    crop: { x: 280, y: 165, w: 960, h: 635 },
    step: "Entregue",
    n: 4,
    title: "Carro entregue? <em>Arraste o cartão.</em>",
    text: "E vê sempre o que está em espera, em curso, pronto e entregue.",
    cover: 4.2,
  },
];

const SCALE = 1080 / 960;
const TOP = 300; // altura da faixa do título
const BOTTOM_MIN = 250;

for (const v of VIDEOS) {
  v.holeW = W;
  v.holeH = Math.round(v.crop.h * SCALE / 2) * 2;
  const free = H - TOP - BOTTOM_MIN - v.holeH;
  v.holeY = TOP + Math.max(0, Math.round(free / 2 / 2) * 2);
}

const frameHtml = (v) => `<div class="post frame">
  <div class="top" style="height:${v.holeY}px">
    <div class="step"><b>${v.n}</b>${v.step}</div>
    <h2 class="serif">${v.title}</h2>
  </div>
  <div class="bottom" style="top:${v.holeY + v.holeH}px">
    <p>${v.text}</p>
    <div class="row"><span>30 dias grátis · fale connosco por mensagem</span><img src="${LOGO_COLOR}" alt="DriveCell"></div>
  </div>
</div>`;

const ff = (args) => execFileSync("ffmpeg", ["-v", "error", "-y", ...args], { stdio: "inherit" });

rmSync(BUILD, { recursive: true, force: true });
mkdirSync(BUILD, { recursive: true });
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const tab = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
async function render(html, path, transparent = false) {
  const file = join(BUILD, "page.html");
  writeFileSync(file, page(html));
  await tab.goto("file://" + file, { waitUntil: "networkidle" });
  await tab.evaluate(() => document.fonts.ready);
  const over = await tab.evaluate(() =>
    [...document.querySelectorAll(".post, .top, .bottom")].some((el) => el.scrollHeight > el.clientHeight + 1),
  );
  if (over) console.warn("ATENÇÃO: o texto não cabe em", path);
  await tab.screenshot({ path, omitBackground: transparent });
}

for (const s of STATIC) {
  await render(s.html, join(OUT, s.file));
  console.log("✓", s.file);
}

for (const v of VIDEOS) {
  const framePng = join(BUILD, `${v.slug}-frame.png`);
  await render(frameHtml(v), framePng, true);

  const src = join(REPO, "public/demo", v.clip);
  const { x, y, w, h } = v.crop;
  const fit = `crop=${w}:${h}:${x}:${y},scale=${v.holeW}:${v.holeH}:flags=lanczos,setsar=1`;
  // Cortes (tirar o ecrã em branco) → velocidade → recorte e escala.
  let chain;
  if (v.cut) {
    const parts = v.cut
      .map(([a, b], i) => `[0:v]trim=start=${a}${b ? `:end=${b}` : ""},setpts=PTS-STARTPTS[p${i}]`)
      .join(";");
    chain = `${parts};${v.cut.map((_, i) => `[p${i}]`).join("")}concat=n=${v.cut.length}:v=1:a=0[cat];[cat]`;
  } else {
    chain = "[0:v]";
  }
  const speed = v.speed ? `setpts=PTS/${v.speed},` : "";
  const filter =
    `${chain}${speed}${fit}[clip];` +
    `color=c=0xf4f1ea:s=${W}x${H}:r=30[bg];` +
    `[bg][clip]overlay=0:${v.holeY}:shortest=1[base];` +
    `[base][1:v]overlay=0:0:shortest=1,format=yuv420p[out]`;
  const mp4 = join(OUT, `${v.slug}.mp4`);
  ff([
    "-i", src, "-loop", "1", "-i", framePng,
    "-filter_complex", filter, "-map", "[out]",
    "-r", "30", "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p",
    "-movflags", "+faststart", "-an", mp4,
  ]);
  ff(["-ss", String(v.cover / (v.speed ?? 1)), "-i", mp4, "-frames:v", "1", join(OUT, `${v.slug}-capa.png`)]);
  console.log("✓", `${v.slug}.mp4`);
}

await browser.close();
rmSync(BUILD, { recursive: true, force: true });
console.log("Gerado em", OUT);
