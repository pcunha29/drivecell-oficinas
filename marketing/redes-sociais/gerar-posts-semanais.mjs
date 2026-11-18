/**
 * Posts semanais do Facebook e do Instagram (24/11 a 23/12/2026), 1080×1350 (4:5).
 *
 * Uso (a partir da raiz do repositório):
 *   node marketing/redes-sociais/gerar-posts-semanais.mjs
 *
 * Saída em marketing/redes-sociais/semanais/. Legendas e datas em legendas-semanais.md.
 * Só funcionalidades que existem na app (pesquisa por matrícula, margem e "vendido abaixo do custo",
 * exportação CSV, só-leitura depois de cancelar). Os dados dos cartões são fictícios.
 * Textos em "você". Sem referências regionais: o DriveCell é para oficinas de todo o país.
 */
import { createRequire } from "node:module";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "../..");
const OUT = join(HERE, "semanais");
const BUILD = join(HERE, ".build-semanais");
const require = createRequire(join(REPO, "package.json"));
const { chromium } = require("playwright");

const W = 1080;
const H = 1350;

const dataUrl = (path) => {
  const ext = extname(path).slice(1).toLowerCase().replace("jpg", "jpeg");
  return `data:image/${ext};base64,` + readFileSync(path).toString("base64");
};
const LOGO_COLOR = dataUrl(join(REPO, "public/logos/logo-full-color.png"));
const LOGO_WHITE = dataUrl(join(REPO, "public/logos/logo-full-white.png"));

const CHECK = (stroke) =>
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23${stroke}' stroke-width='3.2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M5 12l5 5L20 7'/%3E%3C/svg%3E")`;
const CROSS = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%238a8f96' stroke-width='3' stroke-linecap='round'%3E%3Cpath d='M7 7l10 10M17 7L7 17'/%3E%3C/svg%3E")`;

const CSS = `
* { box-sizing: border-box; margin: 0; padding: 0; }
:root { --night: #0d2c4a; --gold: #b18d56; --gold-soft: #d4b47e; --cream: #f4f1ea; --ink: #0f1d2b; --ink2: #3a4654; --line: #ddd5c6; --red: #b4432f; }
html, body { width: ${W}px; height: ${H}px; }
body { font-family: Geist, Inter, Arial, sans-serif; color: var(--ink); -webkit-font-smoothing: antialiased; }
.post { width: ${W}px; height: ${H}px; position: relative; overflow: hidden; display: flex; flex-direction: column; padding: 90px 90px 76px; }
.light { background: var(--cream); }
.dark { background: var(--night); color: #fff; }
.serif { font-family: "Instrument Serif", Georgia, serif; font-weight: 400; letter-spacing: -0.01em; }
em { font-style: italic; color: var(--gold); }
.dark em { color: var(--gold-soft); }
.brand { display: flex; align-items: center; gap: 16px; }
.brand img { height: 46px; width: auto; }
.brand span { font-size: 21px; font-weight: 600; letter-spacing: 0.2em; text-transform: uppercase; color: var(--gold); }
.kicker { margin-top: auto; font-size: 24px; font-weight: 600; letter-spacing: 0.16em; text-transform: uppercase; color: var(--gold); }
h1 { margin-top: 20px; font-size: 112px; line-height: 0.98; color: var(--night); }
.dark h1 { color: #fff; }
.sub { font-size: 38px; line-height: 1.4; color: var(--ink2); margin-top: 40px; }
.dark .sub { color: #cfd8e2; }
.sub b { color: var(--night); font-weight: 600; }
.dark .sub b { color: #fff; }
.foot { margin-top: auto; flex: none; display: flex; justify-content: space-between; align-items: center; border-top: 2px solid var(--line); padding-top: 30px; }
.dark .foot { border-color: rgba(255,255,255,0.18); }
.foot span { font-size: 28px; font-weight: 600; color: var(--night); }
.dark .foot span { color: #fff; }
.foot small { font-size: 26px; font-weight: 600; color: var(--gold); }
.dark .foot small { color: var(--gold-soft); }

/* elementos tipo app */
.panel { background: #fff; border: 2px solid var(--line); border-radius: 22px; box-shadow: 0 10px 30px rgba(13,44,74,0.08); color: var(--ink); }
.search { margin-top: 56px; display: flex; align-items: center; gap: 20px; padding: 28px 32px; font-size: 38px; }
.search svg { width: 36px; height: 36px; flex: none; }
.search .plate { font-weight: 700; letter-spacing: 0.06em; color: var(--night); }
.search .caret { width: 3px; height: 40px; background: var(--gold); margin-left: -12px; }
.result { margin-top: 20px; padding: 28px 32px; }
.result .head { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 2px solid var(--line); padding-bottom: 18px; }
.result .head b { font-size: 40px; color: var(--night); }
.result .head span { font-size: 29px; color: var(--ink2); }
.rows { list-style: none; }
.rows li { display: grid; grid-template-columns: 180px 1fr auto; gap: 18px; font-size: 30px; padding: 20px 0; border-bottom: 1px solid #eee8dc; }
.rows li:last-child { border-bottom: 0; padding-bottom: 0; }
.rows .d { color: #7b8490; }
.rows .v { font-weight: 600; color: var(--night); }
.stats { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 18px; margin-top: 52px; }
.stat { padding: 26px 28px; }
.stat span { display: block; font-size: 26px; color: var(--ink2); }
.stat b { display: block; font-size: 54px; font-weight: 700; color: var(--night); margin-top: 6px; letter-spacing: -0.01em; }
.stat.gold { border-color: var(--gold); }
.stat.gold b { color: var(--gold); }
.alert { margin-top: 20px; padding: 26px 30px; border-color: #e3b7ab; background: #fdf4f1; }
.alert .t { display: flex; align-items: center; gap: 14px; font-size: 34px; font-weight: 700; color: var(--red); }
.alert .t i { display: inline-grid; place-items: center; width: 40px; height: 40px; border-radius: 50%; background: var(--red); color: #fff; font-style: normal; font-size: 26px; }
.alert p { font-size: 30px; line-height: 1.4; color: var(--ink2); margin-top: 12px; }

.ticks { list-style: none; display: flex; flex-direction: column; gap: 34px; margin-top: 60px; }
.ticks li { display: flex; align-items: flex-start; gap: 24px; font-size: 40px; line-height: 1.3; font-weight: 500; }
.ticks li::before { content: ""; flex: none; width: 50px; height: 50px; margin-top: -1px; border-radius: 50%; background: var(--gold) ${CHECK("0d2c4a")} center/60% no-repeat; }
.ticks li small { display: block; font-size: 30px; font-weight: 400; color: var(--ink2); margin-top: 4px; }
.dark .ticks li small { color: #aebbc9; }

.split { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 52px; }
.col { border-radius: 22px; padding: 36px 32px 42px; }
.col h3 { font-size: 26px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; margin-bottom: 24px; }
.col ul { list-style: none; display: flex; flex-direction: column; gap: 28px; }
.col li { display: flex; gap: 16px; font-size: 33px; line-height: 1.3; }
.col li::before { content: ""; flex: none; width: 34px; height: 34px; border-radius: 50%; }
.col.before { background: #e9e4da; color: #5b6470; }
.col.before h3 { color: #7b8490; }
.col.before li::before { background: #fff ${CROSS} center/62% no-repeat; }
.col.after { background: var(--night); color: #fff; }
.col.after h3 { color: var(--gold-soft); }
.col.after li::before { background: var(--gold) ${CHECK("0d2c4a")} center/62% no-repeat; }

.compare { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 52px; }
.compare .box { border-radius: 22px; padding: 30px; }
.compare .box h3 { font-size: 34px; margin-bottom: 18px; }
.compare .box ul { list-style: none; display: flex; flex-direction: column; gap: 16px; font-size: 31px; line-height: 1.3; }
.compare .us { background: #fff; color: var(--night); }
.compare .us h3 { color: var(--night); }
.compare .them { border: 2px dashed rgba(255,255,255,0.35); color: #cfd8e2; }
.compare .them h3 { color: #fff; }

.steps { list-style: none; display: flex; flex-direction: column; gap: 26px; margin-top: 60px; }
.steps li { display: flex; gap: 28px; align-items: flex-start; background: rgba(255,255,255,0.06); border: 2px solid rgba(255,255,255,0.12); border-radius: 22px; padding: 36px 34px; }
.steps b { flex: none; display: grid; place-items: center; width: 72px; height: 72px; border-radius: 50%; background: var(--gold); color: var(--night); font-size: 36px; }
.steps p { font-size: 38px; line-height: 1.3; font-weight: 600; }
.steps p small { display: block; font-size: 30px; font-weight: 400; color: #aebbc9; margin-top: 6px; }

.price { margin-top: 44px; display: flex; align-items: baseline; gap: 20px; }
.price b { font-size: 190px; line-height: 1; font-weight: 700; letter-spacing: -0.03em; }
.price span { font-size: 44px; color: #cfd8e2; }
.price-alt { font-size: 34px; color: #aebbc9; margin-top: 12px; }


.festas { justify-content: center; align-items: center; text-align: center; }
.festas h1 { font-size: 190px; margin-top: 50px; }
.festas .sub { max-width: 820px; }
.festas .brand { justify-content: center; }
.festas .star { width: 120px; height: 5px; background: var(--gold); margin: 0 auto; }
`;

const page = (body) =>
  `<!doctype html><html lang="pt-PT"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet">
<style>${CSS}</style></head><body>${body}</body></html>`;

const brand = (white = false) =>
  `<div class="brand"><img src="${white ? LOGO_WHITE : LOGO_COLOR}" alt="DriveCell"><span>Oficinas</span></div>`;
const foot = (text = "30 dias grátis · fale connosco por mensagem") =>
  `<div class="foot"><span>${text}</span><small>drivecell.pt</small></div>`;
const SEARCH_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="#3a4654" stroke-width="2.4" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>`;

const POSTS = [
  {
    file: "07-matricula.png",
    html: `<div class="post light">
      ${brand()}
      <div class="kicker">Histórico por viatura</div>
      <h1 class="serif">De quem é <em>este carro?</em></h1>
      <p class="sub">Escreva a matrícula e vê <b>o dono, o contacto e todas as reparações anteriores.</b></p>
      <div class="panel search">${SEARCH_ICON}<span class="plate">45-QX-82</span><span class="caret"></span></div>
      <div class="panel result">
        <div class="head"><b>Renault Clio</b><span>Manuel Sousa</span></div>
        <ul class="rows">
          <li><span class="d">Out 2026</span><span>Revisão dos 60 000 km</span><span class="v">145,50 €</span></li>
          <li><span class="d">Mar 2026</span><span>Pastilhas dianteiras</span><span class="v">98,00 €</span></li>
          <li><span class="d">Set 2025</span><span>Óleo e filtros</span><span class="v">72,00 €</span></li>
        </ul>
      </div>
      ${foot()}
    </div>`,
  },
  {
    file: "08-faturacao.png",
    html: `<div class="post dark">
      ${brand(true)}
      <div class="kicker">Pergunta frequente</div>
      <h1 class="serif">Tenho de trocar o programa de faturação? <em>Não.</em></h1>
      <p class="sub">O DriveCell <b>não passa faturas.</b> Organiza a oficina e funciona ao lado do programa que já usa.</p>
      <div class="compare">
        <div class="box us"><h3>DriveCell</h3><ul><li>Quadro com os carros</li><li>Ordens de reparação</li><li>Marcações</li><li>O que está por cobrar</li></ul></div>
        <div class="box them"><h3>O seu programa</h3><ul><li>Faturas</li><li>Comunicação à AT</li><li>Contabilidade</li><li>Fica como está</li></ul></div>
      </div>
      ${foot()}
    </div>`,
  },
  {
    file: "09-margem.png",
    html: `<div class="post light">
      ${brand()}
      <div class="kicker">Faturação e margem</div>
      <h1 class="serif">Sabe quanto ganha <em>em cada reparação?</em></h1>
      <p class="sub">Registe o custo das peças e vê <b>a margem de cada ordem e do mês.</b></p>
      <div class="stats">
        <div class="panel stat"><span>Faturado</span><b>8420 €</b></div>
        <div class="panel stat"><span>Custo</span><b>5210 €</b></div>
        <div class="panel stat gold"><span>Margem</span><b>3210 €</b></div>
      </div>
      <div class="panel alert">
        <div class="t"><i>!</i>Vendido abaixo do custo</div>
        <p>Pastilhas dianteiras: vendidas a 28,00 €, custaram 31,50 €. O preço do fornecedor mudou e o seu não.</p>
      </div>
      ${foot()}
    </div>`,
  },
  {
    file: "10-preco.png",
    html: `<div class="post dark">
      ${brand(true)}
      <div class="kicker">Quanto custa?</div>
      <div class="price"><b>39 €</b><span>por mês</span></div>
      <p class="price-alt">ou 349 € por ano · IVA incluído</p>
      <ul class="ticks">
        <li><span>30 dias grátis<small>com os dados da sua oficina, sem cartão</small></span></li>
        <li><span>Nós passamos os seus dados<small>clientes e viaturas, de um Excel ou de outro programa</small></span></li>
        <li><span>Sem fidelização<small>cancela quando quiser</small></span></li>
        <li><span>Sem custo de entrada<small>criar a conta e ensinar a equipa está incluído</small></span></li>
      </ul>
      ${foot()}
    </div>`,
  },
  {
    file: "11-dados.png",
    html: `<div class="post light">
      ${brand()}
      <div class="kicker">Os seus dados</div>
      <h1 class="serif">Os dados são <em>da sua oficina.</em></h1>
      <ul class="ticks">
        <li><span>Exporta quando quiser<small>clientes, viaturas e ordens, em ficheiros que abrem no Excel</small></span></li>
        <li><span>Se deixar de usar, não perde nada<small>a conta fica só para consulta durante 90 dias e pode exportar tudo</small></span></li>
        <li><span>Cada oficina só vê os seus dados<small>e cada pessoa entra com o seu acesso</small></span></li>
      </ul>
      ${foot()}
    </div>`,
  },
  {
    file: "12-fundador.png",
    html: `<div class="post light">
      ${brand()}
      <div class="kicker">Quem está por trás</div>
      <h1 class="serif">Quem lhe responde <em>somos nós.</em></h1>
      <p class="sub">Uma equipa portuguesa que fez o DriveCell <b>a pensar nas oficinas independentes.</b></p>
      <ul class="ticks">
        <li><span>Mensagens respondidas por pessoas<small>não por um robô</small></span></li>
        <li><span>Ajudamos a começar<small>passamos os dados e ensinamos a equipa, na oficina ou à distância</small></span></li>
      </ul>
      ${foot()}
    </div>`,
  },
  {
    file: "13-antes-depois.png",
    html: `<div class="post light">
      ${brand()}
      <div class="kicker">Antes e depois</div>
      <h1 class="serif">Menos papéis, <em>mais tempo na oficina.</em></h1>
      <div class="split">
        <div class="col before"><h3>Antes</h3><ul>
          <li>Marcações num caderno</li><li>Carros num quadro branco</li><li>Contas à mão</li><li>“Isto já foi pago?”</li></ul></div>
        <div class="col after"><h3>Com o DriveCell</h3><ul>
          <li>Marcações no calendário</li><li>Todos os carros num quadro</li><li>Total calculado</li><li>Por cobrar à vista</li></ul></div>
      </div>
      ${foot()}
    </div>`,
  },
  {
    file: "14-comecar.png",
    html: `<div class="post dark">
      ${brand(true)}
      <div class="kicker">Como começar</div>
      <h1 class="serif">Começar é <em>simples.</em></h1>
      <ol class="steps">
        <li><b>1</b><p>Mande-nos uma mensagem<small>marcamos uma demonstração de 15 minutos</small></p></li>
        <li><b>2</b><p>Nós preparamos tudo<small>passamos os seus clientes e viaturas e ensinamos a equipa</small></p></li>
        <li><b>3</b><p>Use 30 dias grátis<small>sem cartão; no fim, decide se continua</small></p></li>
      </ol>
      ${foot("Fale connosco por mensagem")}
    </div>`,
  },
  {
    file: "15-boas-festas.png",
    html: `<div class="post dark festas">
      ${brand(true)}
      <h1 class="serif">Boas <em>festas!</em></h1>
      <p class="sub">Um bom Natal e um 2027 com a oficina cheia de trabalho.</p>
      <div style="margin-top:70px" class="star"></div>
    </div>`,
  },
];

rmSync(BUILD, { recursive: true, force: true });
mkdirSync(BUILD, { recursive: true });
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const tab = await browser.newPage({ viewport: { width: W, height: H } });
for (const p of POSTS) {
  const file = join(BUILD, "page.html");
  writeFileSync(file, page(p.html));
  await tab.goto("file://" + file, { waitUntil: "networkidle" });
  await tab.evaluate(() => document.fonts.ready);
  // O rodapé usa margin-top:auto; se o conteúdo o empurrar para fora, o texto não cabe.
  const over = await tab.evaluate(() => {
    const post = document.querySelector(".post");
    return post.scrollHeight > post.clientHeight + 1;
  });
  if (over) console.warn("ATENÇÃO: o texto não cabe em", p.file);
  await tab.screenshot({ path: join(OUT, p.file) });
  console.log("✓", p.file);
}
await browser.close();
rmSync(BUILD, { recursive: true, force: true });
console.log("Gerado em", OUT);
