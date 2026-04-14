#!/usr/bin/env python3
"""
Consolidates JSON security scan reports into a structured PDF (or HTML fallback).
Each tool's findings are parsed, summarised, and presented with recommendations.
Usage: python scripts/generate_security_report.py <report_dir>
"""
import html as html_module
import json
import sys
from datetime import datetime
from pathlib import Path

# ── Severity colours ──────────────────────────────────────────────────────────
SEVERITY_COLOUR = {
    "critical": "#7b0000",
    "high":     "#c0392b",
    "medium":   "#e67e22",
    "low":      "#27ae60",
    "info":     "#2980b9",
    "unknown":  "#7f8c8d",
}


def sev_badge(level: str) -> str:
    level = level.lower()
    colour = SEVERITY_COLOUR.get(level, SEVERITY_COLOUR["unknown"])
    label = html_module.escape(level.upper())
    return (
        f'<span style="background:{colour};color:#fff;padding:2px 8px;'
        f'border-radius:4px;font-size:11px;font-weight:bold;">{label}</span>'
    )


# ── Per-tool parsers ──────────────────────────────────────────────────────────

def parse_trufflehog(raw: str) -> dict:
    """JSONL format — one JSON object per line. Only verified secrets are reported."""
    findings = []
    for line in raw.strip().splitlines():
        try:
            obj = json.loads(line)
        except json.JSONDecodeError:
            continue
        if "DetectorName" not in obj:
            continue  # skip info/summary lines
        if not obj.get("Verified", False):
            continue  # skip unverified detections
        git = obj.get("SourceMetadata", {}).get("Data", {}).get("Git", {})
        findings.append({
            "detector": obj.get("DetectorName", "Unknown"),
            "file":     git.get("file", ""),
            "commit":   git.get("commit", "")[:10],
            "line":     git.get("line", ""),
            "raw":      obj.get("Raw", ""),
        })
    return {"findings": findings, "total": len(findings)}


def parse_pipaudit(data: dict) -> dict:
    """pip-audit JSON: list of {name, version, vulns:[{id, description, fix_versions}]}"""
    vulns = []
    packages = data if isinstance(data, list) else data.get("dependencies", [])
    for pkg in packages:
        for v in pkg.get("vulns", []):
            fix = v.get("fix_versions") or []
            vulns.append({
                "package":     pkg.get("name", ""),
                "version":     pkg.get("version", ""),
                "id":          v.get("id", ""),
                "description": v.get("description", ""),
                "fix":         fix[0] if fix else "No fix available",
            })
    return {"vulnerabilities": vulns, "total": len(vulns)}


def parse_bandit(data: dict) -> dict:
    """Bandit JSON: results[] with issue_severity, issue_text, filename, line_number."""
    results = data.get("results", [])
    findings = []
    for r in results:
        findings.append({
            "severity":   r.get("issue_severity", "UNKNOWN"),
            "confidence": r.get("issue_confidence", "UNKNOWN"),
            "text":       r.get("issue_text", ""),
            "file":       r.get("filename", "").replace("/home/mdoub/Github/Find-One/", ""),
            "line":       r.get("line_number", ""),
            "test_id":    r.get("test_id", ""),
            "test_name":  r.get("test_name", ""),
            "more_info":  r.get("more_info", ""),
        })
    # sort by severity
    order = {"HIGH": 0, "MEDIUM": 1, "LOW": 2}
    findings.sort(key=lambda x: order.get(x["severity"].upper(), 3))
    return {"findings": findings, "total": len(findings)}


def parse_npmaudit(data: dict) -> dict:
    """npm audit JSON v7+: vulnerabilities{} or v6: advisories{}."""
    vulns = []
    # npm v7+ format
    for name, info in data.get("vulnerabilities", {}).items():
        sev = info.get("severity", "unknown")
        via = info.get("via", [])
        advisories = [v for v in via if isinstance(v, dict)]
        title = advisories[0].get("title", name) if advisories else name
        url   = advisories[0].get("url", "") if advisories else ""
        fix_available = info.get("fixAvailable", False)
        fix_text = "Run `npm audit fix`" if fix_available else "No automatic fix available"
        vulns.append({
            "package":  name,
            "severity": sev,
            "title":    title,
            "url":      url,
            "fix":      fix_text,
        })
    # npm v6 format fallback
    for adv_id, adv in data.get("advisories", {}).items():
        vulns.append({
            "package":  adv.get("module_name", ""),
            "severity": adv.get("severity", "unknown"),
            "title":    adv.get("title", ""),
            "url":      adv.get("url", ""),
            "fix":      adv.get("recommendation", ""),
        })
    order = {"critical": 0, "high": 1, "moderate": 2, "medium": 3, "low": 4}
    vulns.sort(key=lambda x: order.get(x["severity"].lower(), 5))
    return {"vulnerabilities": vulns, "total": len(vulns)}


def parse_semgrep(data: dict) -> dict:
    """Semgrep JSON: results[] with check_id, path, start.line, extra.message, extra.severity."""
    findings = []
    for r in data.get("results", []):
        extra = r.get("extra", {})
        findings.append({
            "rule":     r.get("check_id", ""),
            "file":     r.get("path", "").replace("/home/mdoub/Github/Find-One/", ""),
            "line":     r.get("start", {}).get("line", ""),
            "severity": extra.get("severity", "INFO"),
            "message":  extra.get("message", ""),
        })
    return {"findings": findings, "total": len(findings)}


# ── HTML section builders ──────────────────────────────────────────────────────

def section_trufflehog(data: dict) -> str:
    findings = data["findings"]
    if not findings:
        return "<p class='clean'>✅ No verified secrets detected.</p>"
    rows = ""
    for f in findings:
        rows += f"""
        <tr>
          <td>{sev_badge('high')} VERIFIED LEAK</td>
          <td>{html_module.escape(f['detector'])}</td>
          <td>{html_module.escape(f['file'])} line {f['line']}</td>
          <td><code>{html_module.escape(f['raw'][:80])}</code></td>
          <td>{html_module.escape(f['commit'])}</td>
        </tr>"""
    return f"""
    <table><thead><tr>
      <th>Statut</th><th>Détecteur</th><th>Fichier</th><th>Valeur</th><th>Commit</th>
    </tr></thead><tbody>{rows}</tbody></table>
    <p class='rec rec-high'><strong>⚠️ CRITIQUE :</strong> Révoquer immédiatement les secrets
    détectés, les remplacer par des variables d'environnement, et utiliser
    <code>git filter-repo</code> pour purger l'historique.</p>"""


def section_pipaudit(data: dict) -> str:
    vulns = data["vulnerabilities"]
    if not vulns:
        return "<p class='clean'>✅ No known vulnerabilities in Python dependencies.</p>"
    rows = ""
    for v in vulns:
        rows += f"""
        <tr>
          <td><strong>{html_module.escape(v['package'])}</strong> {html_module.escape(v['version'])}</td>
          <td>{html_module.escape(v['id'])}</td>
          <td>{html_module.escape(v['description'][:200])}</td>
          <td><code>pip install {html_module.escape(v['package'])}>={html_module.escape(v['fix'])}</code></td>
        </tr>"""
    return f"""
    <table><thead><tr>
      <th>Package</th><th>CVE / ID</th><th>Description</th><th>Correctif</th>
    </tr></thead><tbody>{rows}</tbody></table>
    <p class='rec'><strong>Recommandation :</strong> Mettre à jour les packages listés dans
    <code>backend/requirements.txt</code> vers les versions indiquées et relancer les tests.</p>"""


def section_bandit(data: dict) -> str:
    findings = data["findings"]
    high = [f for f in findings if f["severity"].upper() == "HIGH"]
    medium = [f for f in findings if f["severity"].upper() == "MEDIUM"]
    if not findings:
        return "<p class='clean'>✅ No issues found by Bandit.</p>"
    rows = ""
    for f in findings:
        rows += f"""
        <tr>
          <td>{sev_badge(f['severity'])}</td>
          <td>{html_module.escape(f['test_id'])} — {html_module.escape(f['test_name'])}</td>
          <td>{html_module.escape(f['file'])}:{f['line']}</td>
          <td>{html_module.escape(f['text'][:200])}</td>
        </tr>"""
    rec = ""
    if high:
        rec += "<p class='rec rec-high'><strong>⚠️ HIGH :</strong> Corriger immédiatement les findings HIGH avant tout déploiement.</p>"
    if medium:
        rec += "<p class='rec'><strong>MEDIUM :</strong> Planifier la correction des findings MEDIUM dans le prochain sprint.</p>"
    return f"""
    <table><thead><tr>
      <th>Sévérité</th><th>Règle</th><th>Fichier</th><th>Description</th>
    </tr></thead><tbody>{rows}</tbody></table>
    {rec}"""


def section_npmaudit(data: dict) -> str:
    vulns = data["vulnerabilities"]
    if not vulns:
        return "<p class='clean'>✅ No known vulnerabilities in JavaScript dependencies.</p>"
    rows = ""
    for v in vulns:
        rows += f"""
        <tr>
          <td>{sev_badge(v['severity'])}</td>
          <td><strong>{html_module.escape(v['package'])}</strong></td>
          <td>{html_module.escape(v['title'])}</td>
          <td>{html_module.escape(v['fix'])}</td>
        </tr>"""
    return f"""
    <table><thead><tr>
      <th>Sévérité</th><th>Package</th><th>Vulnérabilité</th><th>Correctif</th>
    </tr></thead><tbody>{rows}</tbody></table>
    <p class='rec'><strong>Recommandation :</strong> Lancer <code>cd frontend && npm audit fix</code>
    pour les correctifs automatiques. Pour les breaking changes, mettre à jour manuellement.</p>"""


def section_semgrep(data: dict) -> str:
    findings = data["findings"]
    if not findings:
        return "<p class='clean'>✅ No issues found by Semgrep.</p>"
    rows = ""
    for f in findings:
        rows += f"""
        <tr>
          <td>{sev_badge(f['severity'])}</td>
          <td><code>{html_module.escape(f['rule'].split('.')[-1])}</code></td>
          <td>{html_module.escape(f['file'])}:{f['line']}</td>
          <td>{html_module.escape(f['message'][:200])}</td>
        </tr>"""
    return f"""
    <table><thead><tr>
      <th>Sévérité</th><th>Règle</th><th>Fichier</th><th>Message</th>
    </tr></thead><tbody>{rows}</tbody></table>
    <p class='rec'><strong>Recommandation :</strong> Corriger les findings ERROR/WARNING en priorité.
    Les findings INFO sont informatifs.</p>"""


# ── Tool registry ─────────────────────────────────────────────────────────────

TOOLS = {
    "trufflehog": {
        "label": "TruffleHog — Secret Scanning",
        "parse": lambda raw, _: parse_trufflehog(raw),
        "render": section_trufflehog,
        "jsonl": True,
    },
    "pip-audit": {
        "label": "pip-audit — Python SCA",
        "parse": lambda _, data: parse_pipaudit(data),
        "render": section_pipaudit,
        "jsonl": False,
    },
    "bandit": {
        "label": "Bandit — Python SAST",
        "parse": lambda _, data: parse_bandit(data),
        "render": section_bandit,
        "jsonl": False,
    },
    "npm-audit": {
        "label": "npm audit — JavaScript SCA",
        "parse": lambda _, data: parse_npmaudit(data),
        "render": section_npmaudit,
        "jsonl": False,
    },
    "semgrep": {
        "label": "Semgrep — Multi-language SAST",
        "parse": lambda _, data: parse_semgrep(data),
        "render": section_semgrep,
        "jsonl": False,
    },
}


# ── Loader ────────────────────────────────────────────────────────────────────

def load_reports(report_dir: str) -> dict:
    reports = {}
    for json_file in sorted(Path(report_dir).glob("*.json")):
        tool_key = json_file.stem.split("_")[0]
        if tool_key not in TOOLS:
            continue
        try:
            raw = json_file.read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError) as e:
            reports[tool_key] = {"error": str(e)}
            continue
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            data = {}
        meta = TOOLS[tool_key]
        try:
            reports[tool_key] = meta["parse"](raw, data)
        except Exception as e:
            reports[tool_key] = {"error": f"Parse error: {e}"}
    return reports


# ── HTML builder ──────────────────────────────────────────────────────────────

CSS = """
  body { font-family: Arial, sans-serif; margin: 40px; color: #222; font-size: 13px; }
  h1 { color: #c0392b; margin-bottom: 4px; }
  h2 { color: #2c3e50; border-bottom: 2px solid #ccc; padding-bottom: 6px; margin-top: 40px; }
  .meta { color: #666; margin-bottom: 30px; }
  .summary-box { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 30px; }
  .summary-card { border: 1px solid #ddd; border-radius: 6px; padding: 12px 20px; min-width: 140px; text-align: center; }
  .summary-card .count { font-size: 28px; font-weight: bold; }
  .summary-card .label { font-size: 11px; color: #666; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
  th { background: #2c3e50; color: #fff; padding: 8px; text-align: left; }
  td { padding: 7px 8px; border-bottom: 1px solid #eee; vertical-align: top; }
  tr:nth-child(even) td { background: #f9f9f9; }
  code { background: #f0f0f0; padding: 1px 4px; border-radius: 3px; font-size: 11px; }
  .clean { color: #27ae60; font-weight: bold; padding: 10px 0; }
  .rec { background: #fef9e7; border-left: 4px solid #f39c12; padding: 10px 14px; margin-top: 12px; }
  .rec-high { background: #fdf2f2; border-left-color: #c0392b; }
  pre { background: #f8f8f8; padding: 14px; font-size: 11px; overflow-x: auto; }
"""


def build_summary(reports: dict) -> str:
    cards = ""
    for key, meta in TOOLS.items():
        if key not in reports:
            continue
        data = reports[key]
        if "error" in data:
            count, colour = "ERR", "#7f8c8d"
        else:
            count = data.get("total", 0)
            colour = "#c0392b" if count else "#27ae60"
        label = html_module.escape(meta["label"].split("—")[0].strip())
        cards += (
            f'<div class="summary-card">'
            f'<div class="count" style="color:{colour}">{count}</div>'
            f'<div class="label">{label}</div>'
            f'</div>'
        )
    return f'<div class="summary-box">{cards}</div>'


def build_html(reports: dict, timestamp: str) -> str:
    sections = ""
    for key, meta in TOOLS.items():
        if key not in reports:
            continue
        data = reports[key]
        label = html_module.escape(meta["label"])
        if "error" in data:
            body = f"<p style='color:red'>Erreur : {html_module.escape(data['error'])}</p>"
        else:
            body = meta["render"](data)
        sections += f"<section><h2>{label}</h2>{body}</section>"

    return f"""<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Find-One Security Report — {timestamp}</title>
  <style>{CSS}</style>
</head>
<body>
  <h1>Find-One — Rapport de Sécurité</h1>
  <p class="meta">Généré le : {timestamp}</p>
  {build_summary(reports)}
  {sections}
</body>
</html>"""


# ── Entry point ───────────────────────────────────────────────────────────────

def main():
    if len(sys.argv) < 2:
        print("Usage: python generate_security_report.py <report_dir>")
        sys.exit(1)

    report_dir = str(Path(sys.argv[1]).resolve())
    if not Path(report_dir).is_dir():
        print(f"Error: {report_dir} is not a directory.")
        sys.exit(1)

    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    reports = load_reports(report_dir)
    if not reports:
        print(f"No recognised JSON reports found in {report_dir}")
        sys.exit(1)

    html_content = build_html(reports, timestamp)
    base = Path(report_dir)
    html_path = base / f"security-report_{timestamp}.html"
    pdf_path  = base / f"security-report_{timestamp}.pdf"

    with open(html_path, "w", encoding="utf-8") as f:
        f.write(html_content)
    print(f"HTML report: {html_path}")

    try:
        from weasyprint import HTML
        HTML(string=html_content, base_url=str(base)).write_pdf(pdf_path)
        print(f"PDF  report: {pdf_path}")
    except ImportError:
        print("WeasyPrint not installed. HTML report only.")
    except Exception as e:
        print(f"PDF generation failed ({e}). HTML report at: {html_path}")


if __name__ == "__main__":
    main()
