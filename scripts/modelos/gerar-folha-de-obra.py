"""
Modelo grátis de folha de obra para oficina (página /modelos/folha-de-obra-oficina).

Uso (a partir da raiz do repositório):
  python3 -m venv /tmp/modelos-venv && /tmp/modelos-venv/bin/pip install openpyxl python-docx
  /tmp/modelos-venv/bin/python scripts/modelos/gerar-folha-de-obra.py

Saída em public/modelos/:
  folha-de-obra-oficina.pdf    A4 em branco, para imprimir
  folha-de-obra-oficina.xlsx   para preencher no computador (soma as linhas, o IVA e o total)
  folha-de-obra-oficina.docx   para editar (nome e logótipo da oficina) e imprimir
  folha-de-obra-exemplo.png    o mesmo A4 preenchido à mão, para a página (dados inventados)

O PDF e a imagem são HTML renderizado com o Playwright do projeto.
"""
import base64
import subprocess
from pathlib import Path

from docx import Document
from docx.enum.section import WD_ORIENT
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Mm, Pt, RGBColor
from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.worksheet.page import PageMargins

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]
OUT = REPO / "public/modelos"
NAME = "folha-de-obra-oficina"
CREDIT = "Modelo grátis de drivecell.pt"
NOTE = "Documento interno da oficina. Não substitui a fatura."

LABOUR_ROWS = 4
PARTS_ROWS = 7

# Exemplo preenchido (dados inventados).
EX = {
    "numero": "0147",
    "entrada": "12/03",
    "prevista": "13/03, 17h",
    "rececao": "Rui",
    "cliente": "Manuel Sousa",
    "telefone": "910 000 000",
    "nif": "",
    "email": "",
    "matricula": "AX-24-PL",
    "modelo": "Renault Clio 1.5 dCi",
    "ano": "2017",
    "km": "148 320",
    "vin": "",
    "combustivel": 1,  # índice da caixa marcada: Reserva, 1/4, 1/2, 3/4, Cheio
    "pedido": ["Revisão dos 150 mil.", "Barulho a travar, à frente."],
    "diagnostico": ["Pastilhas no fim e discos com rebordo.", "Pneus traseiros a meio. Avisar o cliente."],
    "labour": [("Revisão (óleo e filtros)", "1,0", "40,00", "40,00"), ("Pastilhas e discos da frente", "1,5", "40,00", "60,00")],
    "parts": [
        ("", "Óleo 5W30", "4,5 L", "9,50", "42,75"),
        ("", "Filtro de óleo", "1", "8,90", "8,90"),
        ("", "Filtro de ar", "1", "12,40", "12,40"),
        ("", "Filtro do habitáculo", "1", "11,20", "11,20"),
        ("", "Discos da frente (par)", "1", "64,00", "64,00"),
        ("", "Pastilhas da frente", "1", "32,50", "32,50"),
    ],
    "totais": ("171,75", "100,00", "271,75", "23", "62,50", "334,25"),
    "danos": ["Risco no para-choques traseiro."],
    "objetos": "Cadeira de criança",
    "orcamento": "340",
    "limite": "380",
    "assin_data": "12/03",
    "entregue": "13/03",
    "km_saida": "148 331",
}

LOGO = "data:image/png;base64," + base64.b64encode((REPO / "public/logos/logo-full-color.png").read_bytes()).decode()

CSS = """
@page { size: A4; margin: 0; }
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width: 210mm; background: #fff; }
body { font-family: Inter, Arial, sans-serif; color: #0f1d2b; font-size: 8.4pt; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.page { width: 210mm; height: 297mm; padding: 10mm 11mm 8mm; display: flex; flex-direction: column; gap: 2.2mm; overflow: hidden; }
.head { display: flex; justify-content: space-between; align-items: stretch; gap: 6mm; }
.head h1 { font-family: "Instrument Serif", Georgia, serif; font-weight: 400; font-size: 30pt; line-height: 1; color: #0d2c4a; }
.head .num { margin-top: 2.5mm; display: flex; align-items: flex-end; gap: 2mm; font-size: 9pt; font-weight: 600; color: #0d2c4a; }
.head .num .line { width: 32mm; }
.stamp { width: 78mm; height: 20mm; border: 0.3mm dashed #b9b2a4; border-radius: 1.5mm; padding: 1.4mm 2mm; font-size: 6.6pt; color: #8a8478; }
.row { display: flex; gap: 4mm; }
.row > * { flex: 1; min-width: 0; }
.box { border: 0.3mm solid #c9c2b4; border-radius: 1.5mm; padding: 2mm 2.6mm 2.4mm; }
.box h2 { font-size: 6.8pt; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #86652f; margin-bottom: 1mm; }
.f { display: flex; align-items: flex-end; gap: 1.6mm; height: 6.1mm; }
.f label { flex: none; color: #344150; white-space: nowrap; }
.line { flex: 1; min-width: 0; height: 100%; border-bottom: 0.25mm solid #9a9384; position: relative; }
.v { position: absolute; left: 1mm; bottom: -0.4mm; font-family: Caveat, cursive; font-size: 13.5pt; line-height: 1; color: #1d3f8f; white-space: nowrap; }
.v.r { left: auto; right: 1.2mm; }
.f2 { display: flex; gap: 3mm; }
.f2 > .f, .f2 > div > .f { flex: 1; }
.fuel { display: flex; align-items: flex-end; gap: 2mm; height: 6.4mm; color: #344150; }
.fuel span { display: inline-flex; align-items: center; gap: 0.8mm; }
.chk { display: inline-block; width: 2.8mm; height: 2.8mm; border: 0.25mm solid #6d685e; border-radius: 0.4mm; position: relative; }
.chk.on::after { content: "✓"; position: absolute; left: -0.2mm; top: -2.4mm; font-family: Caveat, cursive; font-size: 14pt; color: #1d3f8f; }
.lines .line { display: block; height: 6.1mm; }
table { width: 100%; border-collapse: collapse; }
th { font-size: 6.4pt; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: #344150; text-align: left; padding: 0 1.4mm 0.8mm; border-bottom: 0.3mm solid #0d2c4a; }
td { height: 6mm; border-bottom: 0.25mm solid #c9c2b4; padding: 0 1.4mm; position: relative; }
td + td, th + th { border-left: 0.25mm solid #e1dbcf; }
th.n, td.n { text-align: right; }
td .v { left: 1.4mm; bottom: 0.4mm; }
td.n .v { left: auto; right: 1.4mm; }
.tot { width: 72mm; flex: none !important; }
.tot table td { height: 6.4mm; }
.tot table td:first-child { color: #344150; }
.tot td + td { border-left: 0; }
.tot tr.big td { border-bottom: 0.4mm solid #0d2c4a; font-weight: 700; color: #0d2c4a; font-size: 9pt; }
.small { color: #344150; line-height: 1.45; }
.blank { display: inline-block; width: 18mm; height: 4.6mm; border-bottom: 0.25mm solid #9a9384; position: relative; vertical-align: -0.6mm; }
.sig { display: flex; gap: 4mm; margin-top: 1mm; }
.sig .f:first-child { flex: 1.6; }
.sig .f { flex: 1; }
.foot { margin-top: auto; display: flex; justify-content: space-between; align-items: center; font-size: 6.6pt; color: #5a6572; border-top: 0.25mm solid #d8d1c3; padding-top: 1.6mm; }
.foot span:last-child { display: inline-flex; align-items: center; gap: 1.6mm; }
.foot img { height: 3.2mm; }
"""


def val(text, right=False, filled=False):
    if not filled or not text:
        return ""
    return f'<span class="v{" r" if right else ""}">{text}</span>'


def field(label, value="", filled=False):
    return f'<div class="f"><label>{label}</label><span class="line">{val(value, filled=filled)}</span></div>'


def sheet(filled: bool) -> str:
    e = EX if filled else {k: ("" if isinstance(v, str) else v) for k, v in EX.items()}

    def g(key):
        return e[key] if filled else ""

    fuel_labels = ["Reserva", "¼", "½", "¾", "Cheio"]
    fuel = "".join(
        f'<span><i class="chk{" on" if filled and i == EX["combustivel"] else ""}"></i>{lab}</span>'
        for i, lab in enumerate(fuel_labels)
    )

    def lines(key, n):
        items = EX[key] if filled else []
        return "".join(
            f'<span class="line">{val(items[i] if i < len(items) else "", filled=filled)}</span>' for i in range(n)
        )

    labour = ""
    for i in range(LABOUR_ROWS):
        row = EX["labour"][i] if filled and i < len(EX["labour"]) else ("", "", "", "")
        labour += (
            f"<tr><td>{val(row[0], filled=filled)}</td><td class='n'>{val(row[1], filled=filled)}</td>"
            f"<td class='n'>{val(row[2], filled=filled)}</td><td class='n'>{val(row[3], filled=filled)}</td></tr>"
        )
    parts = ""
    for i in range(PARTS_ROWS):
        row = EX["parts"][i] if filled and i < len(EX["parts"]) else ("", "", "", "", "")
        parts += (
            f"<tr><td>{val(row[0], filled=filled)}</td><td>{val(row[1], filled=filled)}</td>"
            f"<td class='n'>{val(row[2], filled=filled)}</td><td class='n'>{val(row[3], filled=filled)}</td>"
            f"<td class='n'>{val(row[4], filled=filled)}</td></tr>"
        )
    t = EX["totais"] if filled else ("",) * 6
    iva_label = f"IVA ({t[3]} %)" if filled else "IVA (____ %)"

    return f"""
<div class="page">
  <div class="head">
    <div>
      <h1>Folha de obra</h1>
      <div class="num">N.º <span class="line">{val(g("numero"), filled=filled)}</span></div>
    </div>
    <div class="stamp">Oficina (nome, contacto ou carimbo)</div>
  </div>

  <div class="f2">
    {field("Data de entrada", g("entrada"), filled)}
    {field("Entrega prevista", g("prevista"), filled)}
    {field("Rececionado por", g("rececao"), filled)}
  </div>

  <div class="row">
    <div class="box"><h2>Cliente</h2>
      {field("Nome", g("cliente"), filled)}
      {field("Telefone", g("telefone"), filled)}
      {field("NIF", g("nif"), filled)}
      {field("Email", g("email"), filled)}
    </div>
    <div class="box"><h2>Viatura</h2>
      <div class="f2">{field("Matrícula", g("matricula"), filled)}{field("Ano", g("ano"), filled)}</div>
      {field("Marca e modelo", g("modelo"), filled)}
      <div class="f2"><div style="flex:0.7;display:flex">{field("Km", g("km"), filled)}</div><div style="flex:1.3;display:flex">{field("N.º de chassis", g("vin"), filled)}</div></div>
      <div class="fuel">Combustível: {fuel}</div>
    </div>
  </div>

  <div class="row">
    <div class="box lines"><h2>Pedido do cliente</h2>{lines("pedido", 3)}</div>
    <div class="box lines"><h2>Diagnóstico e observações</h2>{lines("diagnostico", 3)}</div>
  </div>

  <div class="box"><h2>Mão de obra</h2>
    <table>
      <colgroup><col><col style="width:20mm"><col style="width:24mm"><col style="width:26mm"></colgroup>
      <tr><th>Trabalho realizado</th><th class="n">Horas</th><th class="n">Preço/hora</th><th class="n">Total (€)</th></tr>
      {labour}
    </table>
  </div>

  <div class="box"><h2>Peças e materiais</h2>
    <table>
      <colgroup><col style="width:30mm"><col><col style="width:20mm"><col style="width:24mm"><col style="width:26mm"></colgroup>
      <tr><th>Referência</th><th>Descrição</th><th class="n">Qtd.</th><th class="n">Preço un.</th><th class="n">Total (€)</th></tr>
      {parts}
    </table>
  </div>

  <div class="row">
    <div class="box lines"><h2>Estado da viatura à entrada</h2>
      {field("Danos visíveis", EX["danos"][0] if filled else "", filled)}
      <span class="line"></span>
      {field("Objetos deixados na viatura", g("objetos"), filled)}
      {field("Outras observações", "", filled)}
    </div>
    <div class="box tot"><h2>Totais (€)</h2>
      <table>
        <tr><td>Peças</td><td class="n">{val(t[0], filled=filled)}</td></tr>
        <tr><td>Mão de obra</td><td class="n">{val(t[1], filled=filled)}</td></tr>
        <tr><td>Subtotal</td><td class="n">{val(t[2], filled=filled)}</td></tr>
        <tr><td>{iva_label}</td><td class="n">{val(t[4], filled=filled)}</td></tr>
        <tr class="big"><td>Total</td><td class="n">{val(t[5], filled=filled)}</td></tr>
      </table>
    </div>
  </div>

  <div class="box"><h2>Autorização e entrega</h2>
    <p class="small">Autorizo os trabalhos descritos. Orçamento aprovado: <span class="blank">{val(g("orcamento"), filled=filled)}</span> €.
      Contactar-me antes de ultrapassar <span class="blank">{val(g("limite"), filled=filled)}</span> €.</p>
    <div class="sig">
      {field("Assinatura do cliente", "M. Sousa" if filled else "", filled)}
      {field("Data", g("assin_data"), filled)}
    </div>
    <div class="sig">
      {field("Entregue em", g("entregue"), filled)}
      {field("Km à saída", g("km_saida"), filled)}
      {field("Assinatura", "M. Sousa" if filled else "", filled)}
    </div>
    <div class="fuel">Pago: <span><i class="chk{" on" if filled else ""}"></i>Sim</span><span><i class="chk"></i>Não</span>
      <span style="margin-left:4mm">Forma de pagamento:</span><span><i class="chk"></i>Dinheiro</span><span><i class="chk{" on" if filled else ""}"></i>Multibanco</span><span><i class="chk"></i>Transferência</span></div>
  </div>

  <div class="foot"><span>{NOTE}</span><span>{CREDIT}<img src="{LOGO}" alt=""></span></div>
</div>"""


FONTS = (
    '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700'
    '&family=Instrument+Serif&family=Caveat:wght@500&display=swap" rel="stylesheet">'
)


def doc(body: str) -> str:
    return f'<!doctype html><html lang="pt-PT"><head><meta charset="utf-8">{FONTS}<style>{CSS}</style></head><body>{body}</body></html>'


def build_pdf_and_png():
    tmp = HERE / ".build"
    tmp.mkdir(exist_ok=True)
    (tmp / "branco.html").write_text(doc(sheet(False)), encoding="utf-8")
    (tmp / "exemplo.html").write_text(doc(sheet(True)), encoding="utf-8")
    render = r"""
import { createRequire } from "node:module";
const require = createRequire(process.argv[2] + "/package.json");
const { chromium } = require("playwright");
const dir = process.argv[3];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 794, height: 1123 }, deviceScaleFactor: 2 });
for (const name of ["branco", "exemplo"]) {
  await page.goto("file://" + dir + "/" + name + ".html", { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  const over = await page.evaluate(() => { const p = document.querySelector(".page"); return p.scrollHeight - p.clientHeight; });
  if (over > 1) console.log("ATENÇÃO: o conteúdo passa a página em", over, "px:", name);
  if (name === "branco") await page.pdf({ path: dir + "/branco.pdf", printBackground: true, preferCSSPageSize: true });
  else await page.locator(".page").screenshot({ path: dir + "/exemplo.png" });
}
await browser.close();
"""
    (tmp / "render.mjs").write_text(render, encoding="utf-8")
    subprocess.run(["node", str(tmp / "render.mjs"), str(REPO), str(tmp)], check=True)
    (tmp / "branco.pdf").replace(OUT / f"{NAME}.pdf")
    (tmp / "exemplo.png").replace(OUT / "folha-de-obra-exemplo.png")
    for f in tmp.iterdir():
        f.unlink()
    tmp.rmdir()


# ---------------------------------------------------------------------------
# Excel
# ---------------------------------------------------------------------------

NAVY = "0D2C4A"
GOLD = "86652F"
GREY = "C9C2B4"


def build_xlsx():
    wb = Workbook()
    ws = wb.active
    ws.title = "Folha de obra"
    widths = {"A": 16, "B": 30, "C": 10, "D": 12, "E": 14}
    for col, w in widths.items():
        ws.column_dimensions[col].width = w

    thin = Side(style="thin", color=GREY)
    navy = Side(style="medium", color=NAVY)
    label_font = Font(name="Arial", size=9, color="344150")
    head_font = Font(name="Arial", size=8, bold=True, color=GOLD)
    th_font = Font(name="Arial", size=8, bold=True, color="344150")
    input_fill = PatternFill("solid", fgColor="FBF9F4")

    def section(row, title):
        c = ws.cell(row=row, column=1, value=title.upper())
        c.font = head_font
        ws.row_dimensions[row].height = 18
        return row + 1

    def labelled(row, label, span_to="E"):
        ws.cell(row=row, column=1, value=label).font = label_font
        ws.merge_cells(f"B{row}:{span_to}{row}")
        c = ws[f"B{row}"]
        c.fill = input_fill
        c.border = Border(bottom=thin)
        for col in "CDE"[: "BCDE".index(span_to)]:
            ws[f"{col}{row}"].border = Border(bottom=thin)
        return row + 1

    ws["A1"] = "Folha de obra"
    ws["A1"].font = Font(name="Georgia", size=22, color=NAVY)
    ws.row_dimensions[1].height = 32
    ws["D1"] = "N.º"
    ws["D1"].font = label_font
    ws["D1"].alignment = Alignment(horizontal="right")
    ws["E1"].fill = input_fill
    ws["E1"].border = Border(bottom=thin)
    ws["A2"] = "Oficina:"
    ws["A2"].font = label_font
    ws.merge_cells("B2:E2")
    ws["B2"].fill = input_fill

    r = 4
    for lab in ("Data de entrada", "Entrega prevista", "Rececionado por"):
        r = labelled(r, lab)
    r += 1
    r = section(r, "Cliente")
    for lab in ("Nome", "Telefone", "NIF", "Email"):
        r = labelled(r, lab)
    r += 1
    r = section(r, "Viatura")
    for lab in ("Matrícula", "Marca e modelo", "Ano", "Km", "N.º de chassis (VIN)", "Combustível"):
        r = labelled(r, lab)
    r += 1
    r = section(r, "Pedido do cliente")
    for _ in range(3):
        r = labelled(r, "")
    r = section(r, "Diagnóstico e observações")
    for _ in range(3):
        r = labelled(r, "")
    r += 1

    # Mão de obra
    r = section(r, "Mão de obra")
    for col, text in zip("ABCDE", ("Trabalho realizado", "", "Horas", "Preço/hora", "Total (€)")):
        c = ws[f"{col}{r}"]
        c.value = text or None
        c.font = th_font
        c.border = Border(bottom=navy)
        if col in "CDE":
            c.alignment = Alignment(horizontal="right")
    r += 1
    labour_first = r
    for _ in range(LABOUR_ROWS):
        ws.merge_cells(f"A{r}:B{r}")
        for col in "ABCDE":
            ws[f"{col}{r}"].border = Border(bottom=thin)
            if col in "ACD":
                ws[f"{col}{r}"].fill = input_fill
        ws[f"C{r}"].number_format = "0.0"
        ws[f"D{r}"].number_format = "#,##0.00"
        ws[f"E{r}"] = f'=IF(OR(C{r}="",D{r}=""),"",C{r}*D{r})'
        ws[f"E{r}"].number_format = "#,##0.00"
        r += 1
    labour_last = r - 1
    r += 1

    # Peças
    r = section(r, "Peças e materiais")
    for col, text in zip("ABCDE", ("Referência", "Descrição", "Qtd.", "Preço un.", "Total (€)")):
        c = ws[f"{col}{r}"]
        c.value = text
        c.font = th_font
        c.border = Border(bottom=navy)
        if col in "CDE":
            c.alignment = Alignment(horizontal="right")
    r += 1
    parts_first = r
    for _ in range(PARTS_ROWS + 3):
        for col in "ABCDE":
            ws[f"{col}{r}"].border = Border(bottom=thin)
            if col in "ABCD":
                ws[f"{col}{r}"].fill = input_fill
        ws[f"D{r}"].number_format = "#,##0.00"
        ws[f"E{r}"] = f'=IF(OR(C{r}="",D{r}=""),"",C{r}*D{r})'
        ws[f"E{r}"].number_format = "#,##0.00"
        r += 1
    parts_last = r - 1
    r += 1

    # Totais
    r = section(r, "Totais (€)")
    totals = [
        ("Peças", f"=SUM(E{parts_first}:E{parts_last})"),
        ("Mão de obra", f"=SUM(E{labour_first}:E{labour_last})"),
        ("Subtotal", f"=E{r}+E{r + 1}"),
    ]
    for lab, formula in totals:
        ws[f"D{r}"] = lab
        ws[f"D{r}"].font = label_font
        ws[f"E{r}"] = formula
        ws[f"E{r}"].number_format = "#,##0.00"
        ws[f"E{r}"].border = Border(bottom=thin)
        r += 1
    subtotal_row = r - 1
    ws[f"B{r}"] = "Taxa de IVA (pode alterar):"
    ws[f"B{r}"].font = label_font
    ws[f"B{r}"].alignment = Alignment(horizontal="right")
    ws[f"C{r}"] = 0.23
    ws[f"C{r}"].number_format = "0%"
    ws[f"C{r}"].fill = input_fill
    ws[f"D{r}"] = "IVA"
    ws[f"D{r}"].font = label_font
    ws[f"E{r}"] = f"=ROUND(E{subtotal_row}*C{r},2)"
    ws[f"E{r}"].number_format = "#,##0.00"
    ws[f"E{r}"].border = Border(bottom=thin)
    r += 1
    ws[f"D{r}"] = "Total"
    ws[f"D{r}"].font = Font(name="Arial", size=10, bold=True, color=NAVY)
    ws[f"E{r}"] = f"=E{subtotal_row}+E{r - 1}"
    ws[f"E{r}"].number_format = "#,##0.00"
    ws[f"E{r}"].font = Font(name="Arial", size=10, bold=True, color=NAVY)
    ws[f"E{r}"].border = Border(bottom=navy)
    r += 2

    r = section(r, "Estado da viatura à entrada")
    r = labelled(r, "Danos visíveis")
    r = labelled(r, "Objetos na viatura")
    r += 1
    r = section(r, "Autorização e entrega")
    r = labelled(r, "Orçamento aprovado (€)")
    r = labelled(r, "Contactar acima de (€)")
    r = labelled(r, "Entregue em")
    r = labelled(r, "Km à saída")
    r = labelled(r, "Pago / forma")
    r += 1
    ws[f"A{r}"] = NOTE
    ws[f"A{r}"].font = Font(name="Arial", size=8, italic=True, color="5A6572")
    ws[f"A{r + 1}"] = CREDIT + " (drivecell.pt/modelos/folha-de-obra-oficina)"
    ws[f"A{r + 1}"].font = Font(name="Arial", size=8, color="5A6572")

    for row in ws.iter_rows():
        for c in row:
            if c.font is None or c.font.name == "Calibri":
                c.font = Font(name="Arial", size=10)
    ws.page_setup.paperSize = ws.PAPERSIZE_A4
    ws.page_setup.orientation = "portrait"
    ws.page_setup.fitToWidth = 1
    ws.page_setup.fitToHeight = 1
    ws.sheet_properties.pageSetUpPr.fitToPage = True
    ws.page_margins = PageMargins(left=0.4, right=0.4, top=0.4, bottom=0.4)
    ws.print_area = f"A1:E{r + 1}"
    ws.sheet_view.showGridLines = False
    wb.properties.title = "Folha de obra"
    wb.properties.creator = "DriveCell Oficinas"
    wb.save(OUT / f"{NAME}.xlsx")


# ---------------------------------------------------------------------------
# Word
# ---------------------------------------------------------------------------


def cell_border(cell, bottom="C9C2B4", size=4, top=None, left=None, right=None):
    tc_pr = cell._tc.get_or_add_tcPr()
    borders = OxmlElement("w:tcBorders")
    for edge, color in (("top", top), ("left", left), ("right", right), ("bottom", bottom)):
        el = OxmlElement(f"w:{edge}")
        if color:
            el.set(qn("w:val"), "single")
            el.set(qn("w:sz"), str(size))
            el.set(qn("w:color"), color)
        else:
            el.set(qn("w:val"), "nil")
        borders.append(el)
    tc_pr.append(borders)


CONTENT_MM = 182  # A4 (210 mm) menos 14 mm de margem de cada lado


def set_widths(table, widths):
    """Larguras fixas em mm (sem isto o Word e o Quick Look encolhem as colunas ao texto)."""
    table.autofit = False  # w:tblLayout fixed, na posição certa do tblPr
    tbl_pr = table._tbl.tblPr
    tbl_w = tbl_pr.find(qn("w:tblW"))
    if tbl_w is None:
        tbl_w = OxmlElement("w:tblW")
        tbl_pr.append(tbl_w)
    tbl_w.set(qn("w:w"), str(int(Mm(sum(widths)).twips)))
    tbl_w.set(qn("w:type"), "dxa")
    for col, w in zip(table._tbl.tblGrid.findall(qn("w:gridCol")), widths):
        col.set(qn("w:w"), str(int(Mm(w).twips)))
    for row in table.rows:
        for cell, w in zip(row.cells, widths):
            cell.width = Mm(w)


def build_docx():
    d = Document()
    sec = d.sections[0]
    sec.orientation = WD_ORIENT.PORTRAIT
    sec.page_width, sec.page_height = Mm(210), Mm(297)
    for side in ("left_margin", "right_margin"):
        setattr(sec, side, Mm(14))
    sec.top_margin = sec.bottom_margin = Mm(12)
    style = d.styles["Normal"]
    style.font.name = "Arial"
    style.font.size = Pt(9)
    style.paragraph_format.space_after = Pt(0)

    def para(text="", size=9, bold=False, color=None, after=0, before=0, align=None):
        p = d.add_paragraph()
        p.paragraph_format.space_after = Pt(after)
        p.paragraph_format.space_before = Pt(before)
        if align:
            p.alignment = align
        run = p.add_run(text)
        run.font.size = Pt(size)
        run.bold = bold
        if color:
            run.font.color.rgb = RGBColor.from_string(color)
        return p

    def heading(text):
        para(text.upper(), size=7.5, bold=True, color=GOLD, before=7, after=2)

    def lines_table(labels, cols=1, label_mm=30):
        """Etiqueta + linha para escrever; sem etiquetas, linhas a toda a largura."""
        if not any(labels):
            t = d.add_table(rows=len(labels), cols=1)
            for r in range(len(labels)):
                cell_border(t.cell(r, 0))
                t.rows[r].height = Mm(7)
            set_widths(t, [CONTENT_MM])
            return t
        rows = (len(labels) + cols - 1) // cols
        t = d.add_table(rows=rows, cols=cols * 2)
        for i, lab in enumerate(labels):
            r, c = divmod(i, cols)
            lc, vc = t.cell(r, c * 2), t.cell(r, c * 2 + 1)
            lc.text = lab
            lc.paragraphs[0].runs[0].font.color.rgb = RGBColor.from_string("344150")
            cell_border(lc, bottom=None)
            cell_border(vc)
            t.rows[r].height = Mm(7)
        value_mm = CONTENT_MM / cols - label_mm
        set_widths(t, [label_mm, value_mm] * cols)
        return t

    def grid(headers, n, widths):
        t = d.add_table(rows=n + 1, cols=len(headers))
        for j, h in enumerate(headers):
            c = t.cell(0, j)
            c.text = h
            run = c.paragraphs[0].runs[0]
            run.font.size = Pt(7.5)
            run.bold = True
            cell_border(c, bottom=NAVY, size=8)
        for i in range(1, n + 1):
            t.rows[i].height = Mm(6.5)
            for j in range(len(headers)):
                cell_border(t.cell(i, j))
        set_widths(t, widths)
        return t

    head = d.add_table(rows=1, cols=2)
    left, right = head.cell(0, 0), head.cell(0, 1)
    set_widths(head, [100, 82])
    p = left.paragraphs[0]
    run = p.add_run("Folha de obra")
    run.font.name = "Georgia"
    run.font.size = Pt(26)
    run.font.color.rgb = RGBColor.from_string(NAVY)
    left.add_paragraph("N.º ____________")
    right.text = "Oficina (escreva aqui o nome e o contacto, ou ponha o logótipo)"
    right.paragraphs[0].runs[0].font.size = Pt(7.5)
    right.paragraphs[0].runs[0].font.color.rgb = RGBColor.from_string("8A8478")
    for edge_cell in (left,):
        cell_border(edge_cell, bottom=None)
    cell_border(right, bottom="B9B2A4", top="B9B2A4", left="B9B2A4", right="B9B2A4")

    para(before=6)
    lines_table(["Data de entrada", "Entrega prevista", "Rececionado por"], cols=3, label_mm=29)
    heading("Cliente")
    lines_table(["Nome", "Telefone", "NIF", "Email"], cols=2, label_mm=20)
    heading("Viatura")
    lines_table(["Matrícula", "Ano", "Marca e modelo", "Km", "N.º de chassis (VIN)", "Combustível"], cols=2, label_mm=36)
    heading("Pedido do cliente")
    lines_table(["", "", ""])
    heading("Diagnóstico e observações")
    lines_table(["", "", ""])
    heading("Mão de obra")
    grid(["Trabalho realizado", "Horas", "Preço/hora", "Total (€)"], LABOUR_ROWS, [100, 22, 28, 32])
    heading("Peças e materiais")
    grid(["Referência", "Descrição", "Qtd.", "Preço un.", "Total (€)"], PARTS_ROWS, [32, 72, 22, 26, 30])
    heading("Totais (€)")
    tt = d.add_table(rows=5, cols=2)
    for i, lab in enumerate(["Peças", "Mão de obra", "Subtotal", "IVA (____ %)", "Total"]):
        tt.cell(i, 0).text = lab
        if lab == "Total":
            tt.cell(i, 0).paragraphs[0].runs[0].bold = True
        cell_border(tt.cell(i, 0), bottom=None)
        cell_border(tt.cell(i, 1), bottom=NAVY if lab == "Total" else "C9C2B4", size=8 if lab == "Total" else 4)
        tt.rows[i].height = Mm(6.5)
    set_widths(tt, [40, 42])
    tt.alignment = WD_TABLE_ALIGNMENT.RIGHT
    heading("Estado da viatura à entrada")
    lines_table(["Danos visíveis", "Objetos deixados na viatura", "Outras observações"], label_mm=48)
    heading("Autorização e entrega")
    para("Autorizo os trabalhos descritos. Orçamento aprovado: ________ €. Contactar-me antes de ultrapassar ________ €.", after=4)
    lines_table(["Assinatura do cliente", "Data", "Entregue em", "Km à saída"], cols=2, label_mm=38)
    para("Pago:  ☐ Sim   ☐ Não        Forma de pagamento:  ☐ Dinheiro   ☐ Multibanco   ☐ Transferência", before=6)
    para(NOTE, size=7, color="5A6572", before=10)
    para(CREDIT, size=7, color="5A6572")
    d.core_properties.title = "Folha de obra"
    d.core_properties.author = "DriveCell Oficinas"
    d.save(OUT / f"{NAME}.docx")


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    build_pdf_and_png()
    build_xlsx()
    build_docx()
    for f in sorted(OUT.iterdir()):
        print(f"{f.relative_to(REPO)}  {f.stat().st_size // 1024} KB")
