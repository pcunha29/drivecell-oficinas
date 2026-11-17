"""
Folheto A5 da campanha das 100 oficinas (HTML → PDF com o Playwright do projeto).

Uso (a partir da raiz do repositório):
  python3 -m venv /tmp/folheto-venv && /tmp/folheto-venv/bin/pip install qrcode pillow
  /tmp/folheto-venv/bin/python marketing/campanha-100-oficinas/gerar-folheto.py

Opcional (variáveis de ambiente):
  FOLHETO_NOME="Pedro"                      → "Sou o Pedro, da DriveCell. Respondo eu."
  FOLHETO_FOTO=caminho/foto.jpg             → foto redonda no bloco de contacto
  FOLHETO_CAPTURA=caminho/captura.png       → captura da app (telemóvel, recortada) ao lado dos pontos

Saída: folheto-A5.pdf (1 página A5), folheto-A4-2x.pdf (2 por A4, para imprimir em casa e cortar)
e folheto-A5-preview.png, nesta pasta.

Decisões (council de 06/11/2026): dizer logo o que é; título que bate com o cartão
"Por cobrar" da app; 3 pontos; fundo branco (impressão caseira, sem sangria); pedido leve
(vídeo de 1 minuto por WhatsApp); "você"; sem numeração (o registo está na folha Excel).
"""
import base64
import io
import mimetypes
import os
import subprocess
import urllib.parse
from pathlib import Path

import qrcode
from qrcode.constants import ERROR_CORRECT_L

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]

PHONE = "351912079695"
PHONE_LABEL = "912 079 695"
QR_MESSAGE = "Olá! Quero ver o DriveCell. (folheto)"
WA_URL = f"https://wa.me/{PHONE}?text={urllib.parse.quote(QR_MESSAGE)}"

NAME = os.environ.get("FOLHETO_NOME", "").strip()
PHOTO = os.environ.get("FOLHETO_FOTO", "").strip()
SHOT = os.environ.get("FOLHETO_CAPTURA", "").strip()


def data_uri(path: Path) -> str:
    mime = mimetypes.guess_type(path.name)[0] or "image/png"
    return f"data:{mime};base64," + base64.b64encode(path.read_bytes()).decode()


qr = qrcode.QRCode(error_correction=ERROR_CORRECT_L, box_size=12, border=3)
qr.add_data(WA_URL)
qr.make(fit=True)
buf = io.BytesIO()
qr.make_image(fill_color="#0d2c4a", back_color="white").save(buf, format="PNG")
qr_uri = "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()

logo_uri = data_uri(REPO / "public/logos/logo-full-color.png")
photo_html = f'<img class="photo" src="{data_uri(Path(PHOTO))}" alt="">' if PHOTO else ""
who_html = (
    f"<span class=\"who\">Sou o {NAME}, da DriveCell. Respondo eu.</span>"
    if NAME
    else "<span class=\"who\">Fale connosco: respondemos nós, não um robô.</span>"
)
shot_html = (
    f'<figure class="shot"><img src="{data_uri(Path(SHOT))}" alt="O quadro de ordens no telemóvel"></figure>'
    if SHOT
    else ""
)
body_class = "with-shot" if SHOT else "no-shot"

CSS = """
@page { size: A5; margin: 0; }
* { box-sizing: border-box; margin: 0; padding: 0; }
:root { --night: #0d2c4a; --gold: #b18d56; --gold-soft: #c9a66b; --ink: #0f1d2b; --ink2: #3a4654; --line: #d8d1c3; }
html, body { width: 148mm; height: 210mm; background: #fff; }
body { font-family: Inter, Arial, sans-serif; color: var(--ink); -webkit-print-color-adjust: exact; print-color-adjust: exact; }
/* Margem de segurança de 9 mm: a jato de tinta em papel normal não imprime até à borda. */
.page { width: 148mm; height: 210mm; padding: 9mm 10mm 8mm; display: flex; flex-direction: column; gap: 4.2mm; }
.brand { display: flex; align-items: baseline; gap: 2.2mm; border-bottom: 0.6mm solid var(--gold); padding-bottom: 2.6mm; }
.brand img { height: 7.5mm; width: auto; }
.brand span { font-size: 9pt; font-weight: 600; letter-spacing: 0.18em; text-transform: uppercase; color: var(--gold); }
.what { font-size: 10.5pt; font-weight: 600; color: var(--night); margin-top: -1.4mm; }
h1 { font-family: "Instrument Serif", Georgia, serif; font-weight: 400; font-size: 30pt; line-height: 1.02; color: var(--night); letter-spacing: -0.005em; -webkit-text-stroke: 0.25px var(--night); }
h1 em { color: var(--gold); -webkit-text-stroke: 0.25px var(--gold); }
.sub { font-size: 11pt; line-height: 1.4; color: var(--ink2); }
.middle { display: grid; gap: 5mm; align-items: center; }
.with-shot .middle { grid-template-columns: 1fr 52mm; }
ul { list-style: none; display: flex; flex-direction: column; gap: 3mm; }
li { display: flex; gap: 2.6mm; font-size: 10.5pt; line-height: 1.38; }
li::before { content: ""; flex: none; width: 4.4mm; height: 4.4mm; margin-top: 0.3mm; border-radius: 50%;
  background: var(--night) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23c9a66b' stroke-width='3.2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M5 12l5 5L20 7'/%3E%3C/svg%3E") center/62% no-repeat; }
li b { font-weight: 600; color: var(--night); }
.shot { margin: 0; }
.shot img { width: 100%; height: auto; display: block; border-radius: 3mm; border: 0.3mm solid var(--line); box-shadow: 0 1.5mm 4mm rgba(13,44,74,0.15); }
/* Oferta: só contorno, para não gastar tinta nem molhar o papel. */
.offer { border: 0.7mm solid var(--night); border-radius: 2mm; padding: 4mm 5mm; display: flex; flex-direction: column; gap: 1.4mm; }
.offer .big { font-family: "Instrument Serif", Georgia, serif; font-size: 20pt; line-height: 1.05; color: var(--night); -webkit-text-stroke: 0.2px var(--night); }
.offer .big em { color: var(--gold); }
.offer p { font-size: 9.5pt; line-height: 1.4; color: var(--ink2); }
.offer .small { font-size: 8.5pt; color: var(--ink2); border-top: 0.3mm solid var(--line); padding-top: 1.6mm; margin-top: 0.6mm; }
.contact { margin-top: auto; display: flex; align-items: center; gap: 4.5mm; border-top: 0.3mm solid var(--line); padding-top: 4mm; }
.qr { width: 30mm; height: 30mm; flex: none; }
.qr img { width: 100%; height: 100%; display: block; image-rendering: pixelated; }
.cta { display: flex; flex-direction: column; gap: 1mm; min-width: 0; }
.cta .ask { font-size: 12pt; font-weight: 700; color: var(--night); line-height: 1.25; }
.cta .ask span { font-weight: 400; color: var(--ink2); font-size: 10pt; }
.cta .phone { font-size: 18pt; font-weight: 700; color: var(--night); letter-spacing: 0.01em; line-height: 1.1; }
.cta .phone small { font-size: 9.5pt; font-weight: 500; color: var(--ink2); letter-spacing: 0; }
.cta .who { font-size: 9pt; color: var(--ink2); }
.cta .demo { font-size: 8.5pt; color: var(--gold); font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; }
.photo { width: 24mm; height: 24mm; border-radius: 50%; object-fit: cover; border: 0.6mm solid var(--gold-soft); flex: none; }
.foot { font-size: 8pt; color: var(--ink2); display: flex; justify-content: space-between; }
"""

flyer = f"""
<div class="page {body_class}">
  <div class="brand"><img src="{logo_uri}" alt="DriveCell"><span>Oficinas</span></div>
  <p class="what">Programa simples para gerir a oficina — no telemóvel ou no computador.</p>
  <h1>Que carros estão prontos? <em>Quanto tem por cobrar?</em></h1>
  <p class="sub">Veja tudo num relance, sem caderno nem quadro branco.</p>
  <div class="middle">
    <ul>
      <li><span><b>Todos os carros num quadro:</b> em espera, em curso, concluídos e entregues. A equipa toda vê o mesmo.</span></li>
      <li><span><b>Por cobrar:</b> quanto lhe devem, em quantas ordens e há quantos dias.</span></li>
      <li><span><b>Marcações da semana</b> no mesmo sítio. Sem instalar nada.</span></li>
    </ul>
    {shot_html}
  </div>
  <div class="offer">
    <div class="big">30 dias grátis, <em>com os dados da sua oficina.</em></div>
    <p>Nós passamos os seus clientes e viaturas e ensinamos a equipa. Sem cartão. Depois, 39 € por mês (IVA incluído), sem fidelização.</p>
    <p class="small">Funciona ao lado do seu programa de faturação.</p>
  </div>
  <div class="contact">
    <div class="qr"><img src="{qr_uri}" alt="QR para o WhatsApp"></div>
    <div class="cta">
      <span class="ask">Quer ver? <span>Mande «quero ver» por WhatsApp e enviamos um vídeo de 1 minuto.</span></span>
      <span class="phone">{PHONE_LABEL} <small>ligue ou WhatsApp</small></span>
      {who_html}
      <span class="demo">Ou marque uma demonstração de 15 min</span>
    </div>
    {photo_html}
  </div>
  <div class="foot"><span>drivecell.pt</span><span>geral@drivecell.pt</span></div>
</div>
"""

head = (
    '<meta charset="utf-8"><link rel="preconnect" href="https://fonts.googleapis.com">'
    '<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">'
)
a5 = f"<!doctype html><html lang=\"pt-PT\"><head>{head}<style>{CSS}</style></head><body>{flyer}</body></html>"

# A4 deitado com 2 folhetos lado a lado e uma linha de corte ao meio.
a4_css = CSS.replace("@page { size: A5; margin: 0; }", "@page { size: A4 landscape; margin: 0; }").replace(
    "html, body { width: 148mm; height: 210mm; background: #fff; }",
    "html, body { width: 297mm; height: 210mm; background: #fff; } .sheet { display: flex; width: 297mm; height: 210mm; }"
    # Linha de corte sem ocupar espaço (uma borda tiraria 0,2 mm ao 2.º folheto e mudava as quebras de linha).
    " .sheet > .page + .page { box-shadow: inset 0.25mm 0 0 #c8c8c8; }",
)
a4 = f"<!doctype html><html lang=\"pt-PT\"><head>{head}<style>{a4_css}</style></head><body><div class=\"sheet\">{flyer}{flyer}</div></body></html>"

tmp = HERE / ".build"
tmp.mkdir(exist_ok=True)
(tmp / "a5.html").write_text(a5, encoding="utf-8")
(tmp / "a4.html").write_text(a4, encoding="utf-8")

RENDER = r"""
import { createRequire } from "node:module";
const require = createRequire(process.argv[2] + "/package.json");
const { chromium } = require("playwright");
const [,, , dir] = process.argv;
const browser = await chromium.launch();
for (const [name, fmt, landscape] of [["a5", "A5", false], ["a4", "A4", true]]) {
  const page = await browser.newPage({ viewport: landscape ? { width: 1123, height: 794 } : { width: 560, height: 794 }, deviceScaleFactor: 2 });
  await page.goto("file://" + dir + "/" + name + ".html", { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({ path: dir + "/" + name + ".pdf", format: fmt, landscape, printBackground: true, preferCSSPageSize: true });
  if (name === "a5") await page.screenshot({ path: dir + "/a5.png" });
  const over = await page.evaluate(() => [...document.querySelectorAll(".page")].some(p => p.scrollHeight > p.clientHeight + 1));
  console.log(name, over ? "ATENÇÃO: o conteúdo não cabe na página" : "cabe na página");
}
await browser.close();
"""
(tmp / "render.mjs").write_text(RENDER, encoding="utf-8")
subprocess.run(["node", str(tmp / "render.mjs"), str(REPO), str(tmp)], check=True)

(tmp / "a5.pdf").replace(HERE / "folheto-A5.pdf")
(tmp / "a4.pdf").replace(HERE / "folheto-A4-2x.pdf")
(tmp / "a5.png").replace(HERE / "folheto-A5-preview.png")
print("WhatsApp do QR:", WA_URL)
print("Gerado: folheto-A5.pdf, folheto-A4-2x.pdf, folheto-A5-preview.png")
