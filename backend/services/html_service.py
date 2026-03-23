"""
HTML service — generate printable HTML from contract DOCX
For browser-based PDF generation
"""
import os
from docx import Document


def docx_to_html(file_path: str) -> str:
    """Convert DOCX to styled HTML for printing."""
    if not os.path.exists(file_path):
        return "<p>Plik nie znaleziony</p>"

    doc = Document(file_path)

    html_parts = ["""<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="utf-8">
<style>
  body { font-family: 'Times New Roman', serif; font-size: 11pt; margin: 2cm; color: #000; }
  h1, h2, h3 { font-size: 12pt; text-align: center; }
  p { margin: 4px 0; line-height: 1.5; }
  .para-heading { font-weight: bold; margin-top: 14px; }
  .signature-block { margin-top: 40px; display: flex; justify-content: space-between; }
  .sig { text-align: center; width: 200px; border-top: 1px solid #000; padding-top: 5px; font-size: 10pt; }
  @media print { body { margin: 1cm; } }
</style>
</head>
<body>"""]

    for i, para in enumerate(doc.paragraphs):
        text = para.text.strip()
        if not text:
            html_parts.append("<p>&nbsp;</p>")
            continue

        if text.startswith("§") or "UMOWA" in text.upper()[:20] or "ZAŁĄCZNIK" in text.upper()[:20]:
            html_parts.append(f'<p class="para-heading">{text}</p>')
        elif i < 5:
            html_parts.append(f'<h3>{text}</h3>')
        elif any(r.bold for r in para.runs if r.text.strip()):
            html_parts.append(f'<p><strong>{text}</strong></p>')
        else:
            html_parts.append(f'<p>{text}</p>')

    html_parts.append("</body></html>")
    return "\n".join(html_parts)
