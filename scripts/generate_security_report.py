#!/usr/bin/env python3
"""
Consolidates JSON security scan reports into a single PDF (or HTML fallback).
Usage: python scripts/generate_security_report.py <report_dir>
"""
import json
import sys
from datetime import datetime
from pathlib import Path


def load_reports(report_dir: str) -> dict:
    reports = {}
    for json_file in Path(report_dir).glob("*.json"):
        tool = json_file.stem.split("_")[0]
        raw = json_file.read_text(encoding="utf-8")
        try:
            reports[tool] = json.loads(raw)
        except json.JSONDecodeError:
            reports[tool] = {"error": "Could not parse JSON", "raw": raw[:500]}
    return reports


def build_html(reports: dict, timestamp: str) -> str:
    sections = []
    for tool, data in reports.items():
        content = json.dumps(data, indent=2, ensure_ascii=False)[:5000]
        sections.append(f"""
        <section>
          <h2>{tool.upper()}</h2>
          <pre>{content}</pre>
        </section>
        """)

    return f"""<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Security Report — {timestamp}</title>
  <style>
    body {{ font-family: monospace; margin: 40px; color: #222; }}
    h1 {{ color: #c0392b; }}
    h2 {{ color: #2c3e50; border-bottom: 1px solid #ccc; padding-bottom: 8px; }}
    pre {{ background: #f8f8f8; padding: 16px; overflow-x: auto; font-size: 12px; }}
    section {{ margin-bottom: 40px; }}
  </style>
</head>
<body>
  <h1>Find-One Security Report</h1>
  <p>Generated: {timestamp}</p>
  {''.join(sections)}
</body>
</html>"""


def main():
    if len(sys.argv) < 2:
        print("Usage: python generate_security_report.py <report_dir>")
        sys.exit(1)

    report_dir = sys.argv[1]
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")

    reports = load_reports(report_dir)
    if not reports:
        print(f"No JSON reports found in {report_dir}")
        sys.exit(1)

    html_content = build_html(reports, timestamp)

    base = Path(report_dir)
    html_path = base / f"security-report_{timestamp}.html"
    pdf_path = base / f"security-report_{timestamp}.pdf"

    with open(html_path, "w", encoding="utf-8") as f:
        f.write(html_content)
    print(f"HTML report: {html_path}")

    try:
        from weasyprint import HTML
        HTML(filename=html_path).write_pdf(pdf_path)
        print(f"PDF report: {pdf_path}")
    except Exception as e:
        print(f"WeasyPrint not available ({e}). HTML report at: {html_path}")


if __name__ == "__main__":
    main()
