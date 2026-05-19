"""Render the strategic memo markdown into a clean, presentation-grade PDF."""

import os
import re
from pathlib import Path

from reportlab.lib.colors import HexColor, white, black, Color
from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch, cm, mm
from reportlab.platypus import (
    BaseDocTemplate, Frame, PageTemplate, Paragraph, Spacer,
    Table, TableStyle, PageBreak, KeepTogether,
)


# ---------- Brand palette ----------
BRAND = HexColor("#0d9488")
BRAND_DARK = HexColor("#0f766e")
BRAND_LIGHT = HexColor("#ccfbf1")
INK = HexColor("#1a1a1a")
INK_SOFT = HexColor("#44403d")
MUTED = HexColor("#78716c")
PAPER = HexColor("#fafaf7")
LIGHT_GREY = HexColor("#e7e5e4")
LIGHTER_GREY = HexColor("#f5f4f3")
ROW_ALT = HexColor("#fbfaf8")


# ---------- Document setup ----------
HERE = Path(__file__).resolve().parent

import sys
if len(sys.argv) >= 2:
    SOURCE = Path(sys.argv[1]).resolve()
else:
    SOURCE = HERE / "Strategic_Memo_Dental_Operations_Software.md"

# Output PDF goes next to the source markdown with the same stem
OUT = SOURCE.with_suffix(".pdf")


def _on_page(canvas, doc):
    """Header bar + footer."""
    canvas.saveState()

    # Brand bar at the very top
    canvas.setFillColor(BRAND)
    canvas.rect(0, A4[1] - 4 * mm, A4[0], 4 * mm, fill=1, stroke=0)

    # Header text — subtle
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(MUTED)
    canvas.drawString(20 * mm, A4[1] - 12 * mm,
                      SOURCE.stem.replace("_", " "))
    canvas.drawRightString(A4[0] - 20 * mm, A4[1] - 12 * mm, "Internal · May 2026")

    # Footer
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(MUTED)
    canvas.drawString(20 * mm, 12 * mm,
                      "Goodcare Dental Booking Platform")
    canvas.drawRightString(A4[0] - 20 * mm, 12 * mm, f"Page {doc.page}")

    canvas.restoreState()


# ---------- Paragraph styles ----------
def build_styles():
    base = getSampleStyleSheet()
    styles = {}

    styles["TitleBig"] = ParagraphStyle(
        name="TitleBig", parent=base["Title"], fontName="Helvetica-Bold",
        fontSize=26, leading=32, textColor=INK,
        spaceAfter=4, alignment=TA_LEFT,
    )
    styles["Subtitle"] = ParagraphStyle(
        name="Subtitle", parent=base["Normal"], fontName="Helvetica",
        fontSize=14, leading=20, textColor=INK_SOFT,
        spaceAfter=20, alignment=TA_LEFT,
    )
    styles["MetaLine"] = ParagraphStyle(
        name="MetaLine", parent=base["Normal"], fontName="Helvetica",
        fontSize=9, leading=14, textColor=MUTED, spaceAfter=2,
    )
    styles["SectionLabel"] = ParagraphStyle(
        name="SectionLabel", parent=base["Normal"], fontName="Helvetica-Bold",
        fontSize=10, leading=14, textColor=BRAND_DARK,
        spaceBefore=14, spaceAfter=4, alignment=TA_LEFT,
    )
    styles["H1"] = ParagraphStyle(
        name="H1", parent=base["Heading1"], fontName="Helvetica-Bold",
        fontSize=18, leading=24, textColor=INK,
        spaceBefore=16, spaceAfter=8, alignment=TA_LEFT,
    )
    styles["H2"] = ParagraphStyle(
        name="H2", parent=base["Heading2"], fontName="Helvetica-Bold",
        fontSize=13, leading=18, textColor=BRAND_DARK,
        spaceBefore=12, spaceAfter=4, alignment=TA_LEFT,
    )
    styles["H3"] = ParagraphStyle(
        name="H3", parent=base["Heading3"], fontName="Helvetica-Bold",
        fontSize=11, leading=15, textColor=INK,
        spaceBefore=8, spaceAfter=2, alignment=TA_LEFT,
    )
    styles["Body"] = ParagraphStyle(
        name="Body", parent=base["BodyText"], fontName="Helvetica",
        fontSize=10, leading=14.5, textColor=INK,
        spaceAfter=6, alignment=TA_LEFT,
    )
    styles["Bullet"] = ParagraphStyle(
        name="Bullet", parent=base["BodyText"], fontName="Helvetica",
        fontSize=10, leading=14.5, textColor=INK,
        leftIndent=14, bulletIndent=2, spaceAfter=2,
    )
    styles["Numbered"] = ParagraphStyle(
        name="Numbered", parent=styles["Bullet"], leftIndent=16, bulletIndent=2,
    )
    styles["Callout"] = ParagraphStyle(
        name="Callout", parent=base["BodyText"], fontName="Helvetica-Bold",
        fontSize=10.5, leading=15, textColor=BRAND_DARK,
        spaceBefore=4, spaceAfter=8, alignment=TA_LEFT,
    )
    styles["Quote"] = ParagraphStyle(
        name="Quote", parent=styles["Body"], fontName="Helvetica-Oblique",
        leftIndent=14, rightIndent=14, textColor=INK_SOFT,
    )
    styles["TableCell"] = ParagraphStyle(
        name="TableCell", parent=base["BodyText"], fontName="Helvetica",
        fontSize=9, leading=12, textColor=INK_SOFT,
    )
    styles["TableHead"] = ParagraphStyle(
        name="TableHead", parent=base["BodyText"], fontName="Helvetica-Bold",
        fontSize=9, leading=12, textColor=white,
    )
    styles["FooterLight"] = ParagraphStyle(
        name="FooterLight", parent=styles["Body"], fontName="Helvetica",
        textColor=MUTED, fontSize=9,
    )
    return styles


styles = build_styles()


# ---------- Inline formatting (bold + italic + code) ----------
def render_inline(text: str) -> str:
    # Order matters — handle bold-italic first if needed.
    # markdown2 already converts to HTML; but we're parsing raw markdown.
    # Convert **bold** and *italic* and `code` to HTML reportlab understands.
    text = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    # Bold first
    text = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", text)
    text = re.sub(r"__(.+?)__", r"<b>\1</b>", text)
    # Italic (after bold to avoid clobbering)
    text = re.sub(r"(?<!\*)\*([^*]+?)\*(?!\*)", r"<i>\1</i>", text)
    text = re.sub(r"(?<!_)_([^_]+?)_(?!_)", r"<i>\1</i>", text)
    # Inline code
    text = re.sub(r"`([^`]+?)`",
                  r'<font face="Courier" color="#0f766e">\1</font>', text)
    return text


# ---------- Markdown → flowables ----------
def parse_markdown(text: str):
    flowables = []
    lines = text.split("\n")
    i = 0

    def flush_table(rows):
        if not rows:
            return
        # First row is header, second row is separator
        header = rows[0]
        body = rows[2:]  # skip separator row
        col_count = len(header)

        data = [[Paragraph(render_inline(c.strip()), styles["TableHead"]) for c in header]]
        for r in body:
            cells = r + [""] * (col_count - len(r))  # pad short rows
            data.append([Paragraph(render_inline(c.strip()), styles["TableCell"])
                         for c in cells[:col_count]])

        # Distribute width
        avail = A4[0] - 40 * mm  # respect margins
        col_widths = [avail / col_count] * col_count

        t = Table(data, colWidths=col_widths, repeatRows=1)
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), BRAND_DARK),
            ("TEXTCOLOR", (0, 0), (-1, 0), white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 9),
            ("BOTTOMPADDING", (0, 0), (-1, 0), 6),
            ("TOPPADDING", (0, 0), (-1, 0), 6),

            ("GRID", (0, 0), (-1, -1), 0.25, LIGHT_GREY),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING", (0, 1), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 1), (-1, -1), 4),

            # Zebra rows
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [white, ROW_ALT]),
        ]))
        flowables.append(Spacer(1, 4))
        flowables.append(t)
        flowables.append(Spacer(1, 8))

    def is_table_row(line):
        s = line.strip()
        return s.startswith("|") and s.endswith("|")

    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        # Skip empty lines
        if not stripped:
            i += 1
            continue

        # Horizontal rule
        if stripped == "---":
            flowables.append(Spacer(1, 4))
            flowables.append(
                Table([[""]], colWidths=[A4[0] - 40 * mm], rowHeights=[1],
                      style=TableStyle([
                          ("LINEBELOW", (0, 0), (-1, -1), 0.5, LIGHT_GREY),
                      ])))
            flowables.append(Spacer(1, 4))
            i += 1
            continue

        # Headings
        if stripped.startswith("# "):
            flowables.append(Paragraph(render_inline(stripped[2:].strip()),
                                       styles["TitleBig"]))
            i += 1
            continue
        if stripped.startswith("## "):
            flowables.append(Paragraph(render_inline(stripped[3:].strip()),
                                       styles["H1"]))
            i += 1
            continue
        if stripped.startswith("### "):
            flowables.append(Paragraph(render_inline(stripped[4:].strip()),
                                       styles["H2"]))
            i += 1
            continue
        if stripped.startswith("#### "):
            flowables.append(Paragraph(render_inline(stripped[5:].strip()),
                                       styles["H3"]))
            i += 1
            continue

        # Table
        if is_table_row(line):
            rows = []
            while i < len(lines) and is_table_row(lines[i]):
                cells = [c.strip() for c in lines[i].strip().strip("|").split("|")]
                rows.append(cells)
                i += 1
            flush_table(rows)
            continue

        # Bulleted lists
        if stripped.startswith("- "):
            items = []
            while i < len(lines) and lines[i].strip().startswith("- "):
                items.append(lines[i].strip()[2:])
                i += 1
            for it in items:
                flowables.append(Paragraph(render_inline(it), styles["Bullet"],
                                           bulletText="•"))
            continue

        # Numbered lists
        if re.match(r"^\d+\.\s", stripped):
            items = []
            while i < len(lines) and re.match(r"^\d+\.\s", lines[i].strip()):
                m = re.match(r"^(\d+)\.\s+(.*)$", lines[i].strip())
                items.append((m.group(1), m.group(2)))
                i += 1
            for num, body in items:
                flowables.append(Paragraph(render_inline(body), styles["Numbered"],
                                           bulletText=f"{num}."))
            continue

        # Bold-only paragraph (e.g. **Conclusion:** ...)
        # Treat normal paragraph — the inline renderer handles bold.
        # Collect contiguous non-empty, non-special lines into one paragraph.
        para_lines = [line]
        i += 1
        while i < len(lines):
            nxt = lines[i]
            ns = nxt.strip()
            if (not ns
                    or ns.startswith("#")
                    or ns == "---"
                    or ns.startswith("- ")
                    or re.match(r"^\d+\.\s", ns)
                    or is_table_row(nxt)):
                break
            para_lines.append(nxt)
            i += 1
        joined = " ".join(l.strip() for l in para_lines)
        flowables.append(Paragraph(render_inline(joined), styles["Body"]))

    return flowables


# ---------- Build ----------
def build():
    text = SOURCE.read_text(encoding="utf-8")
    flowables = parse_markdown(text)

    doc = BaseDocTemplate(
        str(OUT),
        pagesize=A4,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
        topMargin=22 * mm,
        bottomMargin=18 * mm,
        title="Strategic Memo — Dental Operations Software",
        author="Goodcare Dental Booking Platform",
    )

    frame = Frame(
        doc.leftMargin, doc.bottomMargin,
        doc.width, doc.height,
        leftPadding=0, bottomPadding=0,
        rightPadding=0, topPadding=0,
        showBoundary=0,
    )
    doc.addPageTemplates([PageTemplate(id="memo", frames=[frame],
                                       onPage=_on_page)])

    doc.build(flowables)
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    build()
