"""
Modelos grátis de ordem de reparação e de orçamento para oficina
(páginas /modelos/ordem-de-reparacao e /modelos/orcamento-oficina).

Usa o mesmo aspeto e as mesmas funções de gerar-folha-de-obra.py.

Uso (a partir da raiz do repositório):
  python3 -m venv /tmp/modelos-venv && /tmp/modelos-venv/bin/pip install openpyxl python-docx
  /tmp/modelos-venv/bin/python scripts/modelos/gerar-ordem-e-orcamento.py

Saída em public/modelos/, para cada modelo (ordem-de-reparacao, orcamento-oficina):
  <nome>.pdf, <nome>.xlsx, <nome>.docx e <nome>-exemplo.png (preenchido, dados inventados)
"""
import importlib.util
import subprocess
from pathlib import Path

from docx import Document
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.shared import Mm, Pt, RGBColor
from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.worksheet.page import PageMargins

HERE = Path(__file__).resolve().parent
_spec = importlib.util.spec_from_file_location("folha", HERE / "gerar-folha-de-obra.py")
folha = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(folha)

REPO, OUT = folha.REPO, folha.OUT
val, field, LOGO, FONTS = folha.val, folha.field, folha.LOGO, folha.FONTS
NAVY, GOLD, GREY = folha.NAVY, folha.GOLD, folha.GREY
CREDIT = folha.CREDIT

EXTRA_CSS = """
.car { display: flex; gap: 4mm; align-items: stretch; }
.car figure { margin: 0; width: 74mm; flex: none; display: flex; flex-direction: column; gap: 1mm; }
.car svg { width: 100%; height: auto; display: block; }
.car figcaption { font-size: 6.4pt; color: #5a6572; }
.car .right { flex: 1; min-width: 0; }
.checks { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 1.6mm 3mm; min-height: 6.1mm; color: #344150; }
.checks span { display: inline-flex; align-items: center; gap: 0.9mm; white-space: nowrap; }
td.c, th.c { text-align: center; }
td.c .chk { vertical-align: middle; }
.cond { margin: 0; padding-left: 3.4mm; color: #344150; line-height: 1.5; font-size: 7.6pt; }
.cond li { margin-bottom: 0.6mm; }
.mark { font-family: Caveat, cursive; font-size: 15pt; fill: #1d3f8f; stroke: none; }
"""


def doc(body: str) -> str:
    return (
        f'<!doctype html><html lang="pt-PT"><head><meta charset="utf-8">{FONTS}'
        f"<style>{folha.CSS}{EXTRA_CSS}</style></head><body>{body}</body></html>"
    )


def chk(on: bool, label: str = "") -> str:
    return f'<span><i class="chk{" on" if on else ""}"></i>{label}</span>'


def head(title, filled, number, stamp="Oficina (nome, contacto ou carimbo)"):
    return f"""
  <div class="head">
    <div>
      <h1>{title}</h1>
      <div class="num">N.º <span class="line">{val(number, filled=filled)}</span></div>
    </div>
    <div class="stamp">{stamp}</div>
  </div>"""


def foot(note):
    return f'<div class="foot"><span>{note}</span><span>{CREDIT}<img src="{LOGO}" alt=""></span></div>'


# ---------------------------------------------------------------------------
# Ordem de reparação
# ---------------------------------------------------------------------------

ORDEM_EX = {
    "numero": "0213",
    "entrada": "04/06",
    "hora": "08:40",
    "prevista": "05/06, 18h",
    "cliente": "Ana Ferreira",
    "telefone": "930 000 000",
    "nif": "",
    "matricula": "BG-07-QE",
    "ano": "2019",
    "modelo": "Peugeot 208 1.2 PureTech",
    "km": "86 450",
    "vin": "",
    "danos": ["Jante da frente direita riscada.", "Amolgadela pequena na porta traseira esquerda."],
    "objetos": "Nada",
    "trabalhos": [
        ("Revisão anual", "180,00", True),
        ("Luz do motor acesa: diagnóstico", "35,00", True),
        ("Escovas do limpa-vidros", "25,00", True),
        ("Alinhamento da direção", "30,00", False),
    ],
    "estimado": "240",
    "limite": "300",
    "data_assin": "04/06",
}

# Carro visto de cima, com a frente à esquerda. Linhas finas para se poder marcar à mão.
CAR_SVG = """
<svg viewBox="-12 0 234 104" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="#6d685e" stroke-width="1.1">
  <text x="-11" y="56" font-size="7" fill="#5a6572" stroke="none" font-family="Inter, Arial">FRENTE</text>
  <text x="190" y="56" font-size="7" fill="#5a6572" stroke="none" font-family="Inter, Arial">TRÁS</text>
  <text x="96" y="7" font-size="6.5" fill="#5a6572" stroke="none" font-family="Inter, Arial">LADO DIREITO</text>
  <text x="93" y="102" font-size="6.5" fill="#5a6572" stroke="none" font-family="Inter, Arial">LADO ESQUERDO</text>
  <rect x="40" y="10" width="26" height="8" rx="3"/><rect x="138" y="10" width="26" height="8" rx="3"/>
  <rect x="40" y="86" width="26" height="8" rx="3"/><rect x="138" y="86" width="26" height="8" rx="3"/>
  <path d="M42 16 C34 16 30 26 30 52 C30 78 34 88 42 88 L170 88 C180 88 186 80 186 52 C186 24 180 16 170 16 Z"/>
  <path d="M70 22 L84 28 L84 76 L70 82 C64 70 64 34 70 22 Z"/>
  <path d="M84 28 L150 28 L150 76 L84 76"/>
  <path d="M150 28 L162 24 C167 38 167 66 162 80 L150 76"/>
  <path d="M112 16 L112 28 M112 76 L112 88"/>
  <path d="M74 16 L72 11 L80 11 L82 16 M74 88 L72 93 L80 93 L82 88"/>
  {marks}
</svg>"""


def ordem_sheet(filled: bool) -> str:
    e = ORDEM_EX

    def g(k):
        return e[k] if filled else ""

    marks = (
        '<text class="mark" x="44" y="26">X</text><text class="mark" x="128" y="84">X</text>' if filled else ""
    )
    rows = ""
    for i in range(8):
        desc, est, ok = e["trabalhos"][i] if filled and i < len(e["trabalhos"]) else ("", "", False)
        rows += (
            f"<tr><td>{val(desc, filled=filled)}</td><td class='n'>{val(est, filled=filled)}</td>"
            f"<td class='c'><i class='chk{' on' if ok else ''}'></i></td></tr>"
        )
    danos = e["danos"] if filled else []
    return f"""
<div class="page">
  {head("Ordem de reparação", filled, g("numero"))}
  <div class="f2">
    {field("Data de entrada", g("entrada"), filled)}
    {field("Hora", g("hora"), filled)}
    {field("Entrega prevista", g("prevista"), filled)}
  </div>

  <div class="row">
    <div class="box"><h2>Cliente</h2>
      {field("Nome", g("cliente"), filled)}
      {field("Telefone", g("telefone"), filled)}
      {field("NIF", g("nif"), filled)}
      <div class="checks">Contacto: {chk(False, "Chamada")}{chk(filled, "WhatsApp")}{chk(False, "SMS")}{chk(False, "Email")}</div>
    </div>
    <div class="box"><h2>Viatura</h2>
      <div class="f2">{field("Matrícula", g("matricula"), filled)}{field("Ano", g("ano"), filled)}</div>
      {field("Marca e modelo", g("modelo"), filled)}
      <div class="f2"><div style="flex:0.7;display:flex">{field("Km", g("km"), filled)}</div><div style="flex:1.3;display:flex">{field("N.º de chassis", g("vin"), filled)}</div></div>
      <div class="fuel">Combustível: {chk(False, "Reserva")}{chk(False, "¼")}{chk(filled, "½")}{chk(False, "¾")}{chk(False, "Cheio")}</div>
    </div>
  </div>

  <div class="box"><h2>Estado da viatura à entrada</h2>
    <div class="car">
      <figure>{CAR_SVG.replace("{marks}", marks)}<figcaption>Marque com X onde há riscos, amolgadelas ou peças partidas.</figcaption></figure>
      <div class="right lines">
        {field("Danos", danos[0] if danos else "", filled)}
        <span class="line">{val(danos[1] if len(danos) > 1 else "", filled=filled)}</span>
        <span class="line"></span>
        {field("Objetos deixados na viatura", g("objetos"), filled)}
        <div class="checks">Entregou: {chk(filled, "Chave")}{chk(False, "Chave suplente")}{chk(filled, "Livro de revisões")}</div>
      </div>
    </div>
  </div>

  <div class="box"><h2>Trabalhos pedidos pelo cliente</h2>
    <table>
      <colgroup><col><col style="width:34mm"><col style="width:24mm"></colgroup>
      <tr><th>Descrição</th><th class="n">Valor estimado (€)</th><th class="c">Autorizado</th></tr>
      {rows}
    </table>
  </div>

  <div class="row">
    <div class="box"><h2>Valor e prazo</h2>
      {field("Valor estimado total (€)", g("estimado"), filled)}
      {field("Contactar antes de ultrapassar (€)", g("limite"), filled)}
      {field("Prazo previsto", g("prevista"), filled)}
    </div>
    <div class="box"><h2>O cliente autoriza</h2>
      <div class="checks">{chk(filled, "Ensaio em estrada")}</div>
      <div class="checks">{chk(False, "Devolver as peças substituídas")}</div>
      <div class="checks">{chk(filled, "Peças de qualidade equivalente, se mais baratas")}</div>
    </div>
  </div>

  <div class="box lines"><h2>Observações</h2>
    <span class="line">{val("Cliente espera pela chamada antes das 12h." if filled else "", filled=filled)}</span>
    <span class="line"></span>
  </div>

  <div class="box"><h2>Assinaturas</h2>
    <p class="small">Confirmo os dados acima e autorizo os trabalhos assinalados. Trabalhos não autorizados só são feitos depois de me contactarem.</p>
    <div class="sig">
      {field("Cliente", "A. Ferreira" if filled else "", filled)}
      {field("Data", g("data_assin"), filled)}
      {field("Pela oficina", "Rui" if filled else "", filled)}
    </div>
  </div>

  <div class="box"><h2>Levantamento da viatura</h2>
    <div class="sig">
      {field("Data", "", filled)}
      {field("Km à saída", "", filled)}
      {field("Assinatura do cliente", "", filled)}
    </div>
  </div>

  {foot("Documento interno da oficina. Não substitui a fatura.")}
</div>"""


# ---------------------------------------------------------------------------
# Orçamento
# ---------------------------------------------------------------------------

ORC_EX = {
    "numero": "0058",
    "data": "21/10",
    "validade": "20/11",
    "prazo": "3 dias úteis",
    "cliente": "Carla Mendes",
    "telefone": "960 000 000",
    "nif": "",
    "email": "",
    "matricula": "45-QX-21",
    "ano": "2015",
    "modelo": "Volkswagen Golf 1.6 TDI",
    "km": "201 300",
    "pedido": ["Embraiagem a patinar nas subidas.", "Pediu também para ver o barulho do volante do motor."],
    "itens": [
        ("P", "Kit de embraiagem", "1", "189,00", "189,00"),
        ("P", "Volante bimassa", "1", "315,00", "315,00"),
        ("P", "Óleo da caixa de velocidades", "2 L", "14,50", "29,00"),
        ("MO", "Substituir embraiagem e volante", "5,0 h", "40,00", "200,00"),
        ("MO", "Ensaio em estrada", "0,5 h", "40,00", "20,00"),
    ],
    "totais": ("533,00", "220,00", "753,00", "23", "173,19", "926,19"),
}

ORC_CONDITIONS = [
    "Preços em euros, sem IVA. O IVA é somado no fim.",
    "Orçamento válido até à data indicada.",
    "Peças sujeitas a disponibilidade do fornecedor.",
    "Trabalhos que não constem deste orçamento só são feitos com autorização do cliente.",
    "Este orçamento não é uma fatura.",
]


def orcamento_sheet(filled: bool) -> str:
    e = ORC_EX

    def g(k):
        return e[k] if filled else ""

    rows = ""
    for i in range(12):
        it = e["itens"][i] if filled and i < len(e["itens"]) else ("",) * 5
        rows += (
            f"<tr><td class='c'>{val(it[0], filled=filled)}</td><td>{val(it[1], filled=filled)}</td>"
            f"<td class='n'>{val(it[2], filled=filled)}</td><td class='n'>{val(it[3], filled=filled)}</td>"
            f"<td class='n'>{val(it[4], filled=filled)}</td></tr>"
        )
    t = e["totais"] if filled else ("",) * 6
    iva_label = f"IVA ({t[3]} %)" if filled else "IVA (____ %)"
    pedido = e["pedido"] if filled else []
    conds = "".join(f"<li>{c}</li>" for c in ORC_CONDITIONS)
    return f"""
<div class="page">
  {head("Orçamento", filled, g("numero"), "Oficina (nome, morada, NIF e contacto)")}
  <div class="f2">
    {field("Data", g("data"), filled)}
    {field("Válido até", g("validade"), filled)}
    {field("Prazo de execução", g("prazo"), filled)}
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
      {field("Km", g("km"), filled)}
      {field("N.º de chassis", "", filled)}
    </div>
  </div>

  <div class="box lines"><h2>Pedido ou problema</h2>
    <span class="line">{val(pedido[0] if pedido else "", filled=filled)}</span>
    <span class="line">{val(pedido[1] if len(pedido) > 1 else "", filled=filled)}</span>
  </div>

  <div class="box"><h2>Peças e mão de obra</h2>
    <table>
      <colgroup><col style="width:14mm"><col><col style="width:22mm"><col style="width:26mm"><col style="width:26mm"></colgroup>
      <tr><th class="c">Tipo</th><th>Descrição</th><th class="n">Qtd./Horas</th><th class="n">Preço un. (€)</th><th class="n">Total (€)</th></tr>
      {rows}
    </table>
    <p class="small" style="margin-top:1.2mm;font-size:6.6pt">Tipo: P = peça ou material, MO = mão de obra.</p>
  </div>

  <div class="row">
    <div class="box"><h2>Condições</h2><ul class="cond">{conds}</ul></div>
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

  <div class="box lines"><h2>Observações</h2>
    <span class="line">{val("Pneus da frente no limite: aconselhamos trocar em breve." if filled else "", filled=filled)}</span>
    <span class="line"></span>
  </div>

  <div class="box"><h2>Aceitação do cliente</h2>
    <div class="checks">{chk(filled, "Aceito o orçamento e autorizo os trabalhos descritos.")}</div>
    <div class="sig">
      {field("Assinatura do cliente", "C. Mendes" if filled else "", filled)}
      {field("Data", "22/10" if filled else "", filled)}
    </div>
  </div>

  {foot("Orçamento sem valor de fatura.")}
</div>"""


# ---------------------------------------------------------------------------
# PDF e imagem
# ---------------------------------------------------------------------------

RENDER = r"""
import { createRequire } from "node:module";
const require = createRequire(process.argv[2] + "/package.json");
const { chromium } = require("playwright");
const dir = process.argv[3];
const names = process.argv[4].split(",");
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 794, height: 1123 }, deviceScaleFactor: 2 });
for (const name of names) {
  for (const kind of ["branco", "exemplo"]) {
    await page.goto("file://" + dir + "/" + name + "-" + kind + ".html", { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    const over = await page.evaluate(() => { const p = document.querySelector(".page"); return p.scrollHeight - p.clientHeight; });
    if (over > 1) console.log("ATENÇÃO: o conteúdo passa a página em", over, "px:", name, kind);
    if (kind === "branco") await page.pdf({ path: dir + "/" + name + ".pdf", printBackground: true, preferCSSPageSize: true });
    else await page.locator(".page").screenshot({ path: dir + "/" + name + "-exemplo.png" });
  }
}
await browser.close();
"""


def build_pdfs_and_pngs(sheets):
    tmp = HERE / ".build-ordem-orcamento"
    tmp.mkdir(exist_ok=True)
    for name, fn in sheets.items():
        (tmp / f"{name}-branco.html").write_text(doc(fn(False)), encoding="utf-8")
        (tmp / f"{name}-exemplo.html").write_text(doc(fn(True)), encoding="utf-8")
    (tmp / "render.mjs").write_text(RENDER, encoding="utf-8")
    subprocess.run(["node", str(tmp / "render.mjs"), str(REPO), str(tmp), ",".join(sheets)], check=True)
    for name in sheets:
        (tmp / f"{name}.pdf").replace(OUT / f"{name}.pdf")
        (tmp / f"{name}-exemplo.png").replace(OUT / f"{name}-exemplo.png")
    for f in tmp.iterdir():
        f.unlink()
    tmp.rmdir()


# ---------------------------------------------------------------------------
# Excel e Word, a partir de uma lista de blocos comum aos dois
# ---------------------------------------------------------------------------
# ("fields", [rótulos]) | ("section", título) | ("lines", n) | ("checks", rótulo, [opções])
# ("text", texto) | ("table", [(cabeçalho, largura_word_mm)], linhas, calcula_total)
# ("totals",) | ("note", texto)

ORDEM_BLOCKS = [
    ("fields", ["Data de entrada", "Hora", "Entrega prevista"]),
    ("section", "Cliente"),
    ("fields", ["Nome", "Telefone", "NIF"]),
    ("checks", "Contacto", ["Chamada", "WhatsApp", "SMS", "Email"]),
    ("section", "Viatura"),
    ("fields", ["Matrícula", "Marca e modelo", "Ano", "Km", "N.º de chassis (VIN)"]),
    ("checks", "Combustível", ["Reserva", "¼", "½", "¾", "Cheio"]),
    ("section", "Estado da viatura à entrada"),
    ("fields", ["Danos visíveis"]),
    ("lines", 2),
    ("fields", ["Objetos deixados na viatura"]),
    ("checks", "Entregou", ["Chave", "Chave suplente", "Livro de revisões"]),
    ("section", "Trabalhos pedidos pelo cliente"),
    ("table", [("Descrição", 118), ("Valor estimado (€)", 36), ("Autorizado (S/N)", 28)], 8, False),
    ("section", "Valor e prazo"),
    ("fields", ["Valor estimado total (€)", "Contactar antes de ultrapassar (€)", "Prazo previsto"]),
    ("section", "O cliente autoriza"),
    ("checks", "", ["Ensaio em estrada", "Devolver as peças substituídas", "Peças de qualidade equivalente"]),
    ("section", "Observações"),
    ("lines", 2),
    ("section", "Assinaturas"),
    ("text", "Confirmo os dados acima e autorizo os trabalhos assinalados. Trabalhos não autorizados só são feitos depois de me contactarem."),
    ("fields", ["Cliente", "Data", "Pela oficina"]),
    ("section", "Levantamento da viatura"),
    ("fields", ["Data", "Km à saída", "Assinatura do cliente"]),
    ("note", "Documento interno da oficina. Não substitui a fatura."),
]

ORC_BLOCKS = [
    ("fields", ["Data", "Válido até", "Prazo de execução"]),
    ("section", "Cliente"),
    ("fields", ["Nome", "Telefone", "NIF", "Email"]),
    ("section", "Viatura"),
    ("fields", ["Matrícula", "Marca e modelo", "Ano", "Km"]),
    ("section", "Pedido ou problema"),
    ("lines", 2),
    ("section", "Peças e mão de obra"),
    ("table", [("Tipo (P/MO)", 22), ("Descrição", 82), ("Qtd./Horas", 24), ("Preço un. (€)", 26), ("Total (€)", 28)], 13, True),
    ("totals",),
    ("section", "Condições"),
    *[("text", f"• {c}") for c in ORC_CONDITIONS],
    ("section", "Observações"),
    ("lines", 2),
    ("section", "Aceitação do cliente"),
    ("text", "☐ Aceito o orçamento e autorizo os trabalhos descritos."),
    ("fields", ["Assinatura do cliente", "Data"]),
    ("note", "Orçamento sem valor de fatura."),
]


def build_xlsx(title, oficina_label, blocks, path):
    wb = Workbook()
    ws = wb.active
    ws.title = title[:31]
    for col, w in {"A": 18, "B": 30, "C": 11, "D": 13, "E": 14}.items():
        ws.column_dimensions[col].width = w
    thin = Side(style="thin", color=GREY)
    navy = Side(style="medium", color=NAVY)
    label_font = Font(name="Arial", size=9, color="344150")
    head_font = Font(name="Arial", size=8, bold=True, color=GOLD)
    th_font = Font(name="Arial", size=8, bold=True, color="344150")
    fill = PatternFill("solid", fgColor="FBF9F4")

    ws["A1"] = title
    ws["A1"].font = Font(name="Georgia", size=22, color=NAVY)
    ws.row_dimensions[1].height = 32
    ws["D1"] = "N.º"
    ws["D1"].font = label_font
    ws["D1"].alignment = Alignment(horizontal="right")
    ws["E1"].fill = fill
    ws["E1"].border = Border(bottom=thin)
    ws["A2"] = oficina_label
    ws["A2"].font = label_font
    ws.merge_cells("B2:E2")
    ws["B2"].fill = fill

    def input_row(r, label):
        ws.cell(row=r, column=1, value=label or None).font = label_font
        ws.merge_cells(f"B{r}:E{r}")
        ws[f"B{r}"].fill = fill
        for col in "BCDE":
            ws[f"{col}{r}"].border = Border(bottom=thin)

    r = 4
    table_rows = None
    for block in blocks:
        kind = block[0]
        if kind == "section":
            r += 1
            ws.cell(row=r, column=1, value=block[1].upper()).font = head_font
            ws.row_dimensions[r].height = 18
            r += 1
        elif kind == "fields":
            for lab in block[1]:
                input_row(r, lab)
                r += 1
        elif kind == "lines":
            for _ in range(block[1]):
                input_row(r, "")
                r += 1
        elif kind == "checks":
            input_row(r, block[1] or None)
            ws[f"B{r}"] = "  ".join(f"☐ {o}" for o in block[2])
            ws[f"B{r}"].font = Font(name="Arial", size=9, color="344150")
            r += 1
        elif kind == "text":
            ws.merge_cells(f"A{r}:E{r}")
            ws[f"A{r}"] = block[1]
            ws[f"A{r}"].font = Font(name="Arial", size=8.5, color="344150")
            ws[f"A{r}"].alignment = Alignment(wrap_text=True, vertical="top")
            ws.row_dimensions[r].height = 24 if len(block[1]) > 95 else 14
            r += 1
        elif kind == "table":
            headers, n, calc = block[1], block[2], block[3]
            cols = "ABCDE" if len(headers) == 5 else None
            # 3 colunas: Descrição em A:C, as outras em D e E.
            spans = [("A", "E")] if not cols else None
            if len(headers) == 3:
                spans = [("A", "C"), ("D", "D"), ("E", "E")]
            elif len(headers) == 5:
                spans = [(c, c) for c in "ABCDE"]
            for (a, b), (text, _) in zip(spans, headers):
                if a != b:
                    ws.merge_cells(f"{a}{r}:{b}{r}")
                c = ws[f"{a}{r}"]
                c.value = text
                c.font = th_font
                if text.startswith(("Valor", "Qtd", "Preço", "Total")):
                    c.alignment = Alignment(horizontal="right")
                for col in "ABCDE":
                    ws[f"{col}{r}"].border = Border(bottom=navy)
            r += 1
            first = r
            for _ in range(n):
                for (a, b), (text, _) in zip(spans, headers):
                    if a != b:
                        ws.merge_cells(f"{a}{r}:{b}{r}")
                for col in "ABCDE":
                    ws[f"{col}{r}"].border = Border(bottom=thin)
                    ws[f"{col}{r}"].fill = fill
                if calc:
                    ws[f"D{r}"].number_format = "#,##0.00"
                    ws[f"E{r}"] = f'=IF(OR(C{r}="",D{r}=""),"",C{r}*D{r})'
                    ws[f"E{r}"].number_format = "#,##0.00"
                    ws[f"E{r}"].fill = PatternFill(fill_type=None)
                elif len(headers) == 3:
                    ws[f"D{r}"].number_format = "#,##0.00"
                r += 1
            table_rows = (first, r - 1)
        elif kind == "totals":
            first, last = table_rows
            r += 1
            lines = [
                ("Peças", f'=SUMIF(A{first}:A{last},"P",E{first}:E{last})'),
                ("Mão de obra", f'=SUMIF(A{first}:A{last},"MO",E{first}:E{last})'),
                ("Subtotal", f"=E{r}+E{r + 1}"),
            ]
            for lab, formula in lines:
                ws[f"D{r}"] = lab
                ws[f"D{r}"].font = label_font
                ws[f"E{r}"] = formula
                ws[f"E{r}"].number_format = "#,##0.00"
                ws[f"E{r}"].border = Border(bottom=thin)
                r += 1
            sub = r - 1
            ws[f"B{r}"] = "Taxa de IVA (pode alterar):"
            ws[f"B{r}"].font = label_font
            ws[f"B{r}"].alignment = Alignment(horizontal="right")
            ws[f"C{r}"] = 0.23
            ws[f"C{r}"].number_format = "0%"
            ws[f"C{r}"].fill = fill
            ws[f"D{r}"] = "IVA"
            ws[f"D{r}"].font = label_font
            ws[f"E{r}"] = f"=ROUND(E{sub}*C{r},2)"
            ws[f"E{r}"].number_format = "#,##0.00"
            ws[f"E{r}"].border = Border(bottom=thin)
            r += 1
            bold = Font(name="Arial", size=10, bold=True, color=NAVY)
            ws[f"D{r}"] = "Total"
            ws[f"D{r}"].font = bold
            ws[f"E{r}"] = f"=E{sub}+E{r - 1}"
            ws[f"E{r}"].number_format = "#,##0.00"
            ws[f"E{r}"].font = bold
            ws[f"E{r}"].border = Border(bottom=navy)
            ws[f"A{r - 4}"] = "Tipo: P = peça, MO = mão de obra"
            ws[f"A{r - 4}"].font = Font(name="Arial", size=8, color="5A6572")
            r += 1
        elif kind == "note":
            r += 1
            ws[f"A{r}"] = block[1]
            ws[f"A{r}"].font = Font(name="Arial", size=8, italic=True, color="5A6572")
            ws[f"A{r + 1}"] = CREDIT
            ws[f"A{r + 1}"].font = Font(name="Arial", size=8, color="5A6572")
            r += 2

    ws.page_setup.paperSize = ws.PAPERSIZE_A4
    ws.page_setup.orientation = "portrait"
    ws.page_setup.fitToWidth = 1
    ws.page_setup.fitToHeight = 1
    ws.sheet_properties.pageSetUpPr.fitToPage = True
    ws.page_margins = PageMargins(left=0.4, right=0.4, top=0.4, bottom=0.4)
    ws.print_area = f"A1:E{r}"
    ws.sheet_view.showGridLines = False
    wb.properties.title = title
    wb.properties.creator = "DriveCell Oficinas"
    wb.save(path)


def build_docx(title, oficina_label, blocks, path):
    d = Document()
    sec = d.sections[0]
    sec.page_width, sec.page_height = Mm(210), Mm(297)
    sec.left_margin = sec.right_margin = Mm(14)
    sec.top_margin = sec.bottom_margin = Mm(12)
    style = d.styles["Normal"]
    style.font.name = "Arial"
    style.font.size = Pt(9)
    style.paragraph_format.space_after = Pt(0)

    def para(text="", size=9, bold=False, color=None, after=0, before=0):
        p = d.add_paragraph()
        p.paragraph_format.space_after = Pt(after)
        p.paragraph_format.space_before = Pt(before)
        run = p.add_run(text)
        run.font.size = Pt(size)
        run.bold = bold
        if color:
            run.font.color.rgb = RGBColor.from_string(color)
        return p

    def label_rows(labels, label_mm):
        t = d.add_table(rows=len(labels), cols=2)
        for i, lab in enumerate(labels):
            lc, vc = t.cell(i, 0), t.cell(i, 1)
            if lab:
                lc.text = lab
                lc.paragraphs[0].runs[0].font.color.rgb = RGBColor.from_string("344150")
            folha.cell_border(lc, bottom=None)
            folha.cell_border(vc)
            t.rows[i].height = Mm(7)
        folha.set_widths(t, [label_mm, folha.CONTENT_MM - label_mm])

    head = d.add_table(rows=1, cols=2)
    left, right = head.cell(0, 0), head.cell(0, 1)
    run = left.paragraphs[0].add_run(title)
    run.font.name = "Georgia"
    run.font.size = Pt(26)
    run.font.color.rgb = RGBColor.from_string(NAVY)
    left.add_paragraph("N.º ____________")
    right.text = oficina_label
    right.paragraphs[0].runs[0].font.size = Pt(7.5)
    right.paragraphs[0].runs[0].font.color.rgb = RGBColor.from_string("8A8478")
    folha.cell_border(left, bottom=None)
    folha.cell_border(right, bottom="B9B2A4", top="B9B2A4", left="B9B2A4", right="B9B2A4")
    folha.set_widths(head, [100, 82])
    para(before=4)

    for block in blocks:
        kind = block[0]
        if kind == "section":
            para(block[1].upper(), size=7.5, bold=True, color=GOLD, before=7, after=2)
        elif kind == "fields":
            label_rows(block[1], 58 if max(len(x) for x in block[1]) > 22 else 40)
        elif kind == "lines":
            label_rows([""] * block[1], 1)
        elif kind == "checks":
            prefix = f"{block[1]}:  " if block[1] else ""
            para(prefix + "     ".join(f"☐ {o}" for o in block[2]), color="344150", before=4, after=2)
        elif kind == "text":
            para(block[1], size=8.5, color="344150", after=2)
        elif kind == "table":
            headers, n = block[1], block[2]
            t = d.add_table(rows=n + 1, cols=len(headers))
            for j, (h, _) in enumerate(headers):
                c = t.cell(0, j)
                c.text = h
                c.paragraphs[0].runs[0].font.size = Pt(7.5)
                c.paragraphs[0].runs[0].bold = True
                folha.cell_border(c, bottom=NAVY, size=8)
            for i in range(1, n + 1):
                t.rows[i].height = Mm(6.5)
                for j in range(len(headers)):
                    folha.cell_border(t.cell(i, j))
            folha.set_widths(t, [w for _, w in headers])
        elif kind == "totals":
            para("Tipo: P = peça ou material, MO = mão de obra.", size=7, color="5A6572", before=2)
            tt = d.add_table(rows=5, cols=2)
            for i, lab in enumerate(["Peças", "Mão de obra", "Subtotal", "IVA (____ %)", "Total"]):
                tt.cell(i, 0).text = lab
                if lab == "Total":
                    tt.cell(i, 0).paragraphs[0].runs[0].bold = True
                folha.cell_border(tt.cell(i, 0), bottom=None)
                folha.cell_border(tt.cell(i, 1), bottom=NAVY if lab == "Total" else GREY, size=8 if lab == "Total" else 4)
                tt.rows[i].height = Mm(6.5)
            folha.set_widths(tt, [40, 42])
            tt.alignment = WD_TABLE_ALIGNMENT.RIGHT
        elif kind == "note":
            para(block[1], size=7, color="5A6572", before=10)
            para(CREDIT, size=7, color="5A6572")
    d.core_properties.title = title
    d.core_properties.author = "DriveCell Oficinas"
    d.save(path)


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    build_pdfs_and_pngs({"ordem-de-reparacao": ordem_sheet, "orcamento-oficina": orcamento_sheet})
    build_xlsx("Ordem de reparação", "Oficina:", ORDEM_BLOCKS, OUT / "ordem-de-reparacao.xlsx")
    build_docx("Ordem de reparação", "Oficina (escreva aqui o nome e o contacto, ou ponha o logótipo)", ORDEM_BLOCKS, OUT / "ordem-de-reparacao.docx")
    build_xlsx("Orçamento", "Oficina:", ORC_BLOCKS, OUT / "orcamento-oficina.xlsx")
    build_docx("Orçamento", "Oficina (nome, morada, NIF e contacto, ou o logótipo)", ORC_BLOCKS, OUT / "orcamento-oficina.docx")
    for f in sorted(OUT.iterdir()):
        if f.name.startswith(("ordem", "orcamento")):
            print(f"{f.relative_to(REPO)}  {f.stat().st_size // 1024} KB")
