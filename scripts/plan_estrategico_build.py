# -*- coding: utf-8 -*-
"""Motor de render del Plan Estratégico — Fábrica de Video IA (cuerpo ReportLab).

Plan de numeración (Step 3.5 del brief):
| Outline | Tipo    | Cap. | Título                                        |
|---------|---------|------|-----------------------------------------------|
| 1       | cover   | —    | Portada (PDF aparte, se fusiona con pypdf)    |
| 2       | toc     | —    | Tabla de Contenido (numerada 'i')             |
| 3..15   | content | 1-13 | Resumen Ejecutivo ... Próximos Pasos 30/60/90 |

Reglas aplicadas: TocDocTemplate + multiBuild (TOC clicable), CondPageBreak 25%
antes de H1, safe_keep_together (tope 40% altura), tablas 100% Paragraph con
colWidths proporcionales, hAlign CENTER, header HEADER_FILL + franjas
TABLE_STRIPE, install_font_fallback, fondo de página PAGE_BG (Template 07),
numeración: TOC='i', cuerpo arábigo reiniciado en 1.
"""
import os
import sys
import hashlib

SKILL_SCRIPTS = '/home/z/my-project/skills/pdf/scripts'
sys.path.insert(0, SKILL_SCRIPTS)
sys.path.insert(0, '/home/z/my-project/scripts')

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, PageBreak,
                                Table, TableStyle, Image, KeepTogether,
                                CondPageBreak, HRFlowable)
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily
from PIL import Image as PILImage

# Evita referencias dormidas a Helvetica en recursos de página: ReportLab
# usa canvas_basefontname como fuente por defecto en text objects internos.
import reportlab.rl_config as _rl_config
_rl_config.canvas_basefontname = 'FreeSerif'

# ------------------------------------------------------------------
# 1. Fuentes (solo las permitidas por el brief)
# ------------------------------------------------------------------
FONT_DIR = '/usr/share/fonts'
pdfmetrics.registerFont(TTFont('NotoSerifSC', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('NotoSerifSC-Bold', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Bold.ttf'))
# Nota: NotoSansSC solo existe como fuente variable en este sistema y ReportLab
# no la puede parsear. El documento es 100% espanol (sin CJK), por lo que la
# cadena de fallback usa NotoSerifSC (registrada); _has_glyph ignora con
# seguridad las fuentes de fallback no registradas.
pdfmetrics.registerFont(TTFont('SarasaMonoSC', f'{FONT_DIR}/truetype/chinese/SarasaMonoSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('FreeSerif', f'{FONT_DIR}/truetype/freefont/FreeSerif.ttf'))
pdfmetrics.registerFont(TTFont('FreeSerif-Bold', f'{FONT_DIR}/truetype/freefont/FreeSerifBold.ttf'))
pdfmetrics.registerFont(TTFont('FreeSerif-Italic', f'{FONT_DIR}/truetype/freefont/FreeSerifItalic.ttf'))
pdfmetrics.registerFont(TTFont('FreeSerif-BoldItalic', f'{FONT_DIR}/truetype/freefont/FreeSerifBoldItalic.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSans', f'{FONT_DIR}/truetype/dejavu/DejaVuSansMono.ttf'))

registerFontFamily('NotoSerifSC', normal='NotoSerifSC', bold='NotoSerifSC-Bold')
registerFontFamily('FreeSerif', normal='FreeSerif', bold='FreeSerif-Bold',
                   italic='FreeSerif-Italic', boldItalic='FreeSerif-BoldItalic')
registerFontFamily('DejaVuSans', normal='DejaVuSans', bold='DejaVuSans')

from pdf import install_font_fallback  # noqa: E402
install_font_fallback()

# ------------------------------------------------------------------
# 2. Paleta fija del Template 07 Crystal Blue (cuerpo claro)
# ------------------------------------------------------------------
PAGE_BG      = colors.HexColor('#f5f8fc')
SECTION_BG   = colors.HexColor('#edf2f9')
CARD_BG      = colors.HexColor('#e4ecf5')
TABLE_STRIPE = colors.HexColor('#eef3fa')
HEADER_FILL  = colors.HexColor('#1a4a7a')
BORDER       = colors.HexColor('#c0d0e2')
ACCENT       = colors.HexColor('#2d7ab3')
TEXT_PRIMARY = colors.HexColor('#142840')
TEXT_MUTED   = colors.HexColor('#5a7a96')

TABLE_HEADER_COLOR = HEADER_FILL
TABLE_ROW_EVEN     = colors.white
TABLE_ROW_ODD      = TABLE_STRIPE

# ------------------------------------------------------------------
# 3. Geometría y estilos
# ------------------------------------------------------------------
PAGE_W, PAGE_H = A4
MARGIN = 0.9 * inch                      # simétrico izquierda/derecha
AVAIL_W = PAGE_W - 2 * MARGIN
AVAIL_H = PAGE_H - 2 * MARGIN
H1_ORPHAN = AVAIL_H * 0.25               # umbral 25% (pagination.md)
MAX_KEEP = PAGE_H * 0.4                  # tope KeepTogether (report.md)

DOC_TITLE = 'Plan Estratégico — Fábrica de Video IA'
FOOTER_LEFT = 'ALBRA GROUP · Bogotá, Colombia'

body_style = ParagraphStyle('Body', fontName='FreeSerif', fontSize=10.5,
                            leading=17, alignment=TA_JUSTIFY,
                            textColor=TEXT_PRIMARY, spaceBefore=0, spaceAfter=10)
bullet_style = ParagraphStyle('Bullet', fontName='FreeSerif', fontSize=10.5,
                              leading=16.5, alignment=TA_LEFT,
                              textColor=TEXT_PRIMARY, leftIndent=16,
                              bulletIndent=4, bulletFontName='FreeSerif',
                              spaceBefore=0, spaceAfter=5)
h1_style = ParagraphStyle('H1', fontName='FreeSerif', fontSize=22, leading=27,
                          alignment=TA_LEFT, textColor=HEADER_FILL,
                          spaceBefore=8, spaceAfter=2)
h2_style = ParagraphStyle('H2', fontName='FreeSerif', fontSize=15, leading=20,
                          alignment=TA_LEFT, textColor=TEXT_PRIMARY,
                          spaceBefore=14, spaceAfter=6)
quote_style = ParagraphStyle('Quote', fontName='FreeSerif-Italic', fontSize=10.5,
                             leading=16.5, alignment=TA_LEFT,
                             textColor=TEXT_MUTED, spaceBefore=0, spaceAfter=0)
caption_style = ParagraphStyle('Caption', fontName='FreeSerif', fontSize=8.5,
                               leading=12, alignment=TA_CENTER,
                               textColor=TEXT_MUTED, spaceBefore=0, spaceAfter=0)
stat_style = ParagraphStyle('StatBig', fontName='FreeSerif', fontSize=22,
                            leading=26, textColor=ACCENT, alignment=TA_CENTER)
stat_label_style = ParagraphStyle('StatLabel', fontName='FreeSerif', fontSize=9,
                                  leading=12, textColor=TEXT_MUTED,
                                  alignment=TA_CENTER)
toc_title_style = ParagraphStyle('TocTitle', fontName='FreeSerif', fontSize=20,
                                 leading=25, textColor=HEADER_FILL, spaceAfter=6)
toc_l0 = ParagraphStyle('TOC0', fontName='FreeSerif', fontSize=11.5,
                        leading=22, textColor=TEXT_PRIMARY, leftIndent=6)

# ------------------------------------------------------------------
# 4. Plantilla con TOC clicable (TocDocTemplate + multiBuild)
# ------------------------------------------------------------------
class TocDocTemplate(SimpleDocTemplate):
    def afterFlowable(self, flowable):
        if hasattr(flowable, 'bookmark_name'):
            level = getattr(flowable, 'bookmark_level', 0)
            text = getattr(flowable, 'bookmark_text', '')
            key = getattr(flowable, 'bookmark_key', '')
            # El número mostrado = página del cuerpo - 1 (la TOC es 'i')
            self.notify('TOCEntry', (level, text, self.page - 1, key))


def add_heading(text, style, level=0):
    key = 'h_' + hashlib.md5(text.encode('utf-8')).hexdigest()[:8]
    p = Paragraph('<a name="%s"/><b>%s</b>' % (key, text), style)
    p.bookmark_name = key
    p.bookmark_level = level
    p.bookmark_text = text
    p.bookmark_key = key
    return p


def safe_keep_together(elements):
    """KeepTogether solo si el bloque no supera el 40% de la página."""
    total_h = 0
    for el in elements:
        _, h = el.wrap(AVAIL_W, PAGE_H)
        total_h += h
    if total_h <= MAX_KEEP:
        return [KeepTogether(elements)]
    elif len(elements) >= 2:
        return [KeepTogether(elements[:2])] + list(elements[2:])
    return list(elements)

# ------------------------------------------------------------------
# 5. Encabezado / pie de página / fondo de página
# ------------------------------------------------------------------
def on_page(canvas, doc):
    canvas.saveState()
    # Fondo de página (Template 07: cuerpo azul ultra claro)
    canvas.setFillColor(PAGE_BG)
    canvas.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
    # Encabezado: título + regla accent
    canvas.setFont('FreeSerif', 7.5)
    canvas.setFillColor(TEXT_MUTED)
    canvas.drawString(MARGIN, PAGE_H - 40, DOC_TITLE)
    canvas.setStrokeColor(ACCENT)
    canvas.setLineWidth(1.5)
    canvas.line(MARGIN, PAGE_H - 46, PAGE_W - MARGIN, PAGE_H - 46)
    # Pie: regla fina + autor + número
    canvas.setStrokeColor(BORDER)
    canvas.setLineWidth(0.5)
    canvas.line(MARGIN, 46, PAGE_W - MARGIN, 46)
    canvas.setFont('FreeSerif', 7.5)
    canvas.setFillColor(TEXT_MUTED)
    canvas.drawString(MARGIN, 34, FOOTER_LEFT)
    num = 'i' if doc.page == 1 else str(doc.page - 1)
    canvas.drawRightString(PAGE_W - MARGIN, 34, num)
    canvas.restoreState()

# ------------------------------------------------------------------
# 6. Constructores de componentes
# ------------------------------------------------------------------
def build_table(caption, ratios, header, rows, font_size=9, center_cols=None):
    """Tabla segura: celdas 100% Paragraph, anchos proporcionales, centrada."""
    center_cols = center_cols or set()
    col_widths = [r * AVAIL_W for r in ratios]
    assert abs(sum(ratios) - 1.0) < 0.01, 'ratios deben sumar 1.0'
    assert sum(col_widths) <= AVAIL_W + 0.5, 'tabla excede ancho disponible'
    th = ParagraphStyle('TH', fontName='FreeSerif', fontSize=9.5, leading=12.5,
                        textColor=colors.white, alignment=TA_CENTER)
    td = ParagraphStyle('TD', fontName='FreeSerif', fontSize=font_size,
                        leading=font_size + 3.2, textColor=TEXT_PRIMARY,
                        alignment=TA_LEFT)
    tdc = ParagraphStyle('TDC', parent=td, alignment=TA_CENTER)
    data = [[Paragraph('<b>%s</b>' % h, th) for h in header]]
    for row in rows:
        cells = []
        for ci, cell in enumerate(row):
            st = tdc if ci in center_cols else td
            cells.append(Paragraph(str(cell), st))
        data.append(cells)
    t = Table(data, colWidths=col_widths, repeatRows=1, hAlign='CENTER')
    t.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'FreeSerif'),
        ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [TABLE_ROW_EVEN, TABLE_ROW_ODD]),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('VALIGN', (0, 0), (-1, 0), 'MIDDLE'),
        ('VALIGN', (0, 1), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 7),
        ('RIGHTPADDING', (0, 0), (-1, -1), 7),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    return t, caption


def build_callout(stat, label):
    callout = Table(
        [[Paragraph('<b>%s</b>' % stat, stat_style)],
         [Paragraph(label, stat_label_style)]],
        colWidths=[230], hAlign='CENTER')
    callout.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'FreeSerif'),
        ('BACKGROUND', (0, 0), (-1, -1), CARD_BG),
        ('BOX', (0, 0), (-1, -1), 1, ACCENT),
        ('TOPPADDING', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, -1), (-1, -1), 12),
        ('TOPPADDING', (0, 1), (-1, 1), 2),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 2),
        ('LEFTPADDING', (0, 0), (-1, -1), 14),
        ('RIGHTPADDING', (0, 0), (-1, -1), 14),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    return callout


def build_quote(text):
    inner = Paragraph(text, quote_style)
    t = Table([[inner]], colWidths=[AVAIL_W - 40], hAlign='CENTER')
    t.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'FreeSerif'),
        ('LINEBEFORE', (0, 0), (0, 0), 2, ACCENT),
        ('LEFTPADDING', (0, 0), (-1, -1), 16),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    return t


def embed_image(path, max_width, max_height):
    pil = PILImage.open(path)
    ow, oh = pil.size
    ratio_w = max_width / ow if ow > max_width else 1.0
    ratio_h = max_height / oh if oh > max_height else 1.0
    ratio = min(ratio_w, ratio_h)
    return Image(path, width=ow * ratio, height=oh * ratio)

# ------------------------------------------------------------------
# 7. Bloques -> story
# ------------------------------------------------------------------
def blocks_to_story(blocks, story):
    i = 0
    n = len(blocks)
    while i < n:
        b = blocks[i]
        kind = b[0]
        if kind == 'h1':
            head = add_heading(b[1], h1_style, 0)
            rule = HRFlowable(width='100%', thickness=1.2, color=ACCENT,
                              spaceBefore=2, spaceAfter=12)
            group = [head, rule]
            if i + 1 < n and blocks[i + 1][0] == 'body':
                group.append(Paragraph(blocks[i + 1][1], body_style))
                i += 1
            story.append(CondPageBreak(H1_ORPHAN))
            story.extend(safe_keep_together(group))
        elif kind == 'h2':
            story.append(Paragraph('<b>%s</b>' % b[1], h2_style))
        elif kind == 'body':
            story.append(Paragraph(b[1], body_style))
        elif kind == 'bullet':
            for item in b[1]:
                story.append(Paragraph(item, bullet_style, bulletText='•'))
            story.append(Spacer(1, 6))
        elif kind == 'quote':
            story.append(Spacer(1, 8))
            story.extend(safe_keep_together([build_quote(b[1])]))
            story.append(Spacer(1, 14))
        elif kind == 'table':
            caption, ratios, header, rows = b[1], b[2], b[3], b[4]
            fs = b[5] if len(b) > 5 else 9
            center = {2, 3} if len(header) >= 4 and header[1] in ('Probabilidad', 'Precio', 'Créditos', 'Semanas') else set()
            if header[0] == 'Fase' or header[0] == 'Plan':
                center = {1}
            if 'Probabilidad' in header:
                center = {1, 2}
            t, _ = build_table(caption, ratios, header, rows, font_size=fs, center_cols=center)
            story.append(Spacer(1, 14))
            if len(rows) <= 15:
                story.extend(safe_keep_together([t, Spacer(1, 6),
                                                 Paragraph(caption, caption_style)]))
            else:
                story.append(t)
                story.append(Spacer(1, 6))
                story.append(Paragraph(caption, caption_style))
            story.append(Spacer(1, 14))
        elif kind == 'callout':
            story.append(Spacer(1, 8))
            story.extend(safe_keep_together([build_callout(b[1], b[2])]))
            story.append(Spacer(1, 14))
        elif kind == 'figure':
            img = embed_image(b[1], max_width=AVAIL_W * 0.92, max_height=235)
            cap = Paragraph(b[2], caption_style)
            story.append(Spacer(1, 16))
            story.extend(safe_keep_together([img, Spacer(1, 8), cap]))
            story.append(Spacer(1, 16))
        i += 1

# ------------------------------------------------------------------
# 8. Construcción del documento
# ------------------------------------------------------------------
from plan_content_p1 import P1  # noqa: E402
from plan_content_p2 import P2  # noqa: E402

BODY_PDF = '/home/z/my-project/work-assets/body.pdf'
COVER_PDF = '/home/z/my-project/work-assets/cover.pdf'
OUTPUT_PDF = '/home/z/my-project/download/Plan_Estrategico_Fabrica_de_Video_IA.pdf'

story = []

# --- Tabla de contenido (página 'i') ---
toc = TableOfContents()
toc.levelStyles = [toc_l0]
toc.dotsMinLevel = 0
story.append(Paragraph('<b>Tabla de Contenido</b>', toc_title_style))
story.append(HRFlowable(width='100%', thickness=1.2, color=ACCENT,
                        spaceBefore=2, spaceAfter=14))
story.append(toc)
story.append(PageBreak())

# --- Capítulos 1-13 ---
blocks_to_story(P1 + P2, story)

doc = TocDocTemplate(
    BODY_PDF, pagesize=A4,
    leftMargin=MARGIN, rightMargin=MARGIN,
    topMargin=MARGIN, bottomMargin=MARGIN,
    initialFontName='FreeSerif', initialFontSize=10.5,
    title=DOC_TITLE, author='Z.ai', creator='Z.ai',
    subject='Plan estratégico de producto y negocio: plataforma SaaS de fábrica de video IA para creadores LATAM (ecosistema ALBRA)')
doc.multiBuild(story, onFirstPage=on_page, onLaterPages=on_page)
print('body ok ->', BODY_PDF)

# ------------------------------------------------------------------
# 9. Fusión portada + cuerpo (normalizando a A4)
# ------------------------------------------------------------------
from pypdf import PdfReader, PdfWriter  # noqa: E402

A4_W, A4_H = 595.28, 841.89

def normalize_page_to_a4(page):
    box = page.mediabox
    w, h = float(box.width), float(box.height)
    if abs(w - A4_W) > 0.1 or abs(h - A4_H) > 0.1:
        page.scale_to(A4_W, A4_H)
    return page

writer = PdfWriter()
cover_page = PdfReader(COVER_PDF).pages[0]
writer.add_page(normalize_page_to_a4(cover_page))
for page in PdfReader(BODY_PDF).pages:
    writer.add_page(normalize_page_to_a4(page))
writer.add_metadata({
    '/Title': DOC_TITLE,
    '/Author': 'Z.ai',
    '/Creator': 'Z.ai',
    '/Subject': 'Plan estratégico: plataforma SaaS de fábrica de video IA para creadores LATAM (ecosistema ALBRA)',
})
os.makedirs(os.path.dirname(OUTPUT_PDF), exist_ok=True)
with open(OUTPUT_PDF, 'wb') as f:
    writer.write(f)

total = len(PdfReader(OUTPUT_PDF).pages)
print('final ok ->', OUTPUT_PDF, '| paginas:', total)
