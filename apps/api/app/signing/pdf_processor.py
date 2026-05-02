"""PDF processing utilities using PyMuPDF (fitz) and ReportLab."""

import io
from datetime import datetime
from typing import Any

import fitz  # PyMuPDF


def get_page_count(file_path: str) -> int:
    """Return the number of pages in a document file.

    Supports PDF via PyMuPDF. For DOCX/DOC files, falls back to 1
    (python-docx does not expose a reliable page count).
    """
    import os
    ext = os.path.splitext(file_path)[-1].lower()
    if ext in (".docx", ".doc"):
        if ext == ".docx":
            try:
                from docx import Document as DocxDocument
                docx_doc = DocxDocument(file_path)
                return max(1, len(docx_doc.sections))
            except Exception:
                return 1
        return 1  # .doc — no pure-Python page counter
    # Default: treat as PDF
    with fitz.open(file_path) as doc:
        return doc.page_count


def _render_placeholder_page(dpi: int = 150) -> bytes:
    """Return a gray placeholder PNG for document types that cannot be rendered
    (e.g. legacy .doc files that PyMuPDF cannot open).

    The image is roughly A4-proportioned and contains a centred message.
    """
    import os as _os

    # Target canvas size matches the default DPI-scaled PDF page
    width_px = int(8.5 * dpi)
    height_px = int(11 * dpi)

    # Try to render via Pillow (optional dependency); fall back to a raw PNG if not available.
    try:
        from PIL import Image, ImageDraw, ImageFont  # type: ignore

        img = Image.new("RGB", (width_px, height_px), color=(240, 240, 240))
        draw = ImageDraw.Draw(img)

        msg_lines = ["Document preview", "not available"]
        font_size = max(24, dpi // 6)

        # Pillow's default font is tiny; try to load a system font, ignore on failure.
        font = None
        try:
            font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", font_size)
        except Exception:
            try:
                font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", font_size)
            except Exception:
                font = ImageFont.load_default()

        # Bounding box of the combined text block
        line_heights = []
        line_widths = []
        for line in msg_lines:
            bbox = draw.textbbox((0, 0), line, font=font)
            line_widths.append(bbox[2] - bbox[0])
            line_heights.append(bbox[3] - bbox[1])

        total_h = sum(line_heights) + (len(msg_lines) - 1) * int(font_size * 0.4)
        y = (height_px - total_h) // 2
        for i, line in enumerate(msg_lines):
            x = (width_px - line_widths[i]) // 2
            draw.text((x, y), line, fill=(120, 120, 120), font=font)
            y += line_heights[i] + int(font_size * 0.4)

        buf = io.BytesIO()
        img.save(buf, format="PNG")
        return buf.getvalue()

    except ImportError:
        pass

    # Minimal hard-coded 1×1 gray PNG as last resort (valid PNG, always works).
    import struct
    import zlib

    def _png_chunk(tag: bytes, data: bytes) -> bytes:
        c = struct.pack(">I", len(data)) + tag + data
        return c + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    w, h = width_px, height_px
    ihdr = struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0)
    raw_rows = b"".join(b"\x00" + bytes([0x99, 0x99, 0x99]) * w for _ in range(h))
    idat = zlib.compress(raw_rows)
    return (
        b"\x89PNG\r\n\x1a\n"
        + _png_chunk(b"IHDR", ihdr)
        + _png_chunk(b"IDAT", idat)
        + _png_chunk(b"IEND", b"")
    )


def render_page(file_path: str, page_num: int = 0, dpi: int = 150) -> bytes:
    """Render a document page as PNG bytes.

    For PDF files this uses PyMuPDF.  For non-PDF formats (e.g. .doc, .docx)
    that PyMuPDF cannot open, a placeholder image is returned instead of
    raising an error so that the editor never shows a broken image.

    Args:
        file_path: Path to the document file.
        page_num: Zero-based page index.
        dpi: Rendering resolution (default 150).

    Returns:
        PNG image as bytes.
    """
    import os as _os

    ext = _os.path.splitext(file_path)[-1].lower()
    if ext in (".docx", ".doc"):
        # PyMuPDF cannot render Word documents — return a placeholder page.
        return _render_placeholder_page(dpi)

    with fitz.open(file_path) as doc:
        if page_num < 0 or page_num >= doc.page_count:
            raise ValueError(
                f"Page {page_num} is out of range for document with {doc.page_count} pages"
            )
        page = doc.load_page(page_num)
        zoom = dpi / 72
        mat = fitz.Matrix(zoom, zoom)
        pix = page.get_pixmap(matrix=mat, alpha=False)
        return pix.tobytes("png")


def apply_fields_to_pdf(file_path: str, fields: list[dict[str, Any]]) -> bytes:
    """Overlay field values onto the PDF and return the modified PDF bytes.

    Args:
        file_path: Path to the source PDF.
        fields: List of field dicts with keys: type, page, x, y, width, height, value, label.

    Returns:
        Modified PDF as bytes.
    """
    with fitz.open(file_path) as doc:
        for field in fields:
            if not field.get("value"):
                continue

            page_num = (field.get("page") or 1) - 1
            if page_num < 0 or page_num >= doc.page_count:
                continue

            page = doc.load_page(page_num)
            page_rect = page.rect

            # Field coordinates are stored as percentages of page dimensions.
            # Convert from % to PDF points using the actual page rectangle.
            x_pct = float(field.get("x", 0))
            y_pct = float(field.get("y", 0))
            w_pct = float(field.get("width", 10))
            h_pct = float(field.get("height", 5))

            pw = page_rect.width
            ph = page_rect.height
            x = pw * x_pct / 100.0
            y = ph * y_pct / 100.0
            w = pw * w_pct / 100.0
            h = ph * h_pct / 100.0

            rect = fitz.Rect(x, y, x + w, y + h)
            value = str(field["value"])
            field_type = field.get("type", "text")

            if field_type in ("signature", "initial"):
                # Draw text in a styled box to simulate a signature
                page.draw_rect(rect, color=(0.2, 0.4, 0.8), width=1)
                page.insert_textbox(
                    rect,
                    value,
                    fontsize=14,
                    color=(0.1, 0.2, 0.6),
                    align=1,  # center
                )
            elif field_type == "date_signed":
                page.insert_textbox(
                    rect,
                    value,
                    fontsize=10,
                    color=(0, 0, 0),
                    align=0,
                )
            elif field_type == "checkbox":
                if value.lower() in ("true", "1", "yes", "checked"):
                    # Draw checkmark
                    page.draw_rect(rect, color=(0, 0, 0), width=1)
                    p1 = fitz.Point(x + w * 0.2, y + h * 0.5)
                    p2 = fitz.Point(x + w * 0.45, y + h * 0.75)
                    p3 = fitz.Point(x + w * 0.8, y + h * 0.25)
                    page.draw_polyline([p1, p2, p3], color=(0, 0.6, 0), width=2)
            else:
                page.insert_textbox(
                    rect,
                    value,
                    fontsize=10,
                    color=(0, 0, 0),
                    align=0,
                )

        return doc.tobytes(garbage=4, deflate=True)


def generate_certificate(envelope_data: dict[str, Any], audit_events: list[dict[str, Any]]) -> bytes:
    """Generate a completion certificate PDF for a signed envelope.

    Args:
        envelope_data: Dict with envelope metadata (subject, id, sent_at, completed_at).
        audit_events: List of audit event dicts.

    Returns:
        PDF certificate as bytes.
    """
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.platypus import (
        SimpleDocTemplate,
        Paragraph,
        Spacer,
        Table,
        TableStyle,
        HRFlowable,
    )

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=inch,
        leftMargin=inch,
        topMargin=inch,
        bottomMargin=inch,
    )
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "CertTitle",
        parent=styles["Heading1"],
        fontSize=24,
        spaceAfter=12,
        textColor=colors.HexColor("#1a1a2e"),
    )
    subtitle_style = ParagraphStyle(
        "CertSubtitle",
        parent=styles["Normal"],
        fontSize=12,
        textColor=colors.HexColor("#4a4a6a"),
        spaceAfter=6,
    )
    label_style = ParagraphStyle(
        "Label",
        parent=styles["Normal"],
        fontSize=10,
        textColor=colors.HexColor("#666666"),
        spaceAfter=2,
    )
    value_style = ParagraphStyle(
        "Value",
        parent=styles["Normal"],
        fontSize=11,
        textColor=colors.HexColor("#1a1a2e"),
        spaceAfter=8,
    )

    elements = []

    elements.append(Paragraph("Certificate of Completion", title_style))
    elements.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor("#1a73e8")))
    elements.append(Spacer(1, 0.2 * inch))

    elements.append(Paragraph("Document Details", styles["Heading2"]))
    elements.append(Spacer(1, 0.1 * inch))

    subject = envelope_data.get("subject", "N/A")
    env_id = str(envelope_data.get("id", "N/A"))
    completed_at = envelope_data.get("completed_at")
    sent_at = envelope_data.get("sent_at")

    details_data = [
        ["Subject:", subject],
        ["Envelope ID:", env_id],
        ["Sent:", str(sent_at) if sent_at else "N/A"],
        ["Completed:", str(completed_at) if completed_at else "N/A"],
        ["Certificate Generated:", datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")],
    ]
    details_table = Table(details_data, colWidths=[2 * inch, 4.5 * inch])
    details_table.setStyle(
        TableStyle(
            [
                ("FONTSIZE", (0, 0), (-1, -1), 10),
                ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#666666")),
                ("TEXTCOLOR", (1, 0), (1, -1), colors.HexColor("#1a1a2e")),
                ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    elements.append(details_table)
    elements.append(Spacer(1, 0.3 * inch))

    if audit_events:
        elements.append(Paragraph("Audit Trail", styles["Heading2"]))
        elements.append(Spacer(1, 0.1 * inch))

        audit_data = [["Timestamp", "Event", "Details"]]
        for event in audit_events:
            ts = str(event.get("created_at", ""))[:19]
            evt = str(event.get("event_type", ""))
            details = str(event.get("details") or "")[:60]
            audit_data.append([ts, evt, details])

        audit_table = Table(audit_data, colWidths=[2 * inch, 2 * inch, 2.5 * inch])
        audit_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1a73e8")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 9),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8f9fa")]),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#dadce0")),
                    ("TOPPADDING", (0, 0), (-1, -1), 4),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ]
            )
        )
        elements.append(audit_table)

    doc.build(elements)
    return buffer.getvalue()
