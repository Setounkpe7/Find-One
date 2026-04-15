#!/usr/bin/env python3
"""
Local security scan script for Find-One.
Runs all security tools and generates a PDF report.

Usage: python scripts/local_security_scan.py
"""

import json
import os
import subprocess
from datetime import datetime
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent

TOOLS = [
    {
        "name": "TruffleHog",
        "cmd": ["trufflehog", "git", "file://.", "--only-verified", "--json"],
        "output_file": "trufflehog.json",
        "parse": "jsonlines",
    },
    {
        "name": "pip-audit",
        "cmd": ["pip-audit", "-r", "backend/requirements.txt", "-f", "json"],
        "output_file": "pip-audit.json",
        "parse": "json",
    },
    {
        "name": "npm audit",
        "cmd": ["npm", "audit", "--json"],
        "cwd": "frontend",
        "output_file": "npm-audit.json",
        "parse": "json",
    },
    {
        "name": "Bandit",
        "cmd": ["bandit", "-r", "backend/app/", "-f", "json"],
        "output_file": "bandit.json",
        "parse": "json",
    },
    {
        "name": "Semgrep",
        "cmd": ["semgrep", "scan", "--config=auto", "--json", "backend/", "frontend/src/"],
        "output_file": "semgrep.json",
        "parse": "json",
    },
    {
        "name": "Checkov",
        "cmd": ["checkov", "-d", ".", "--output", "json"],
        "output_file": "checkov.json",
        "parse": "json",
    },
]

HTML_STYLE = """
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  body { font-family: Arial, sans-serif; font-size: 11px; margin: 20px; color: #1f2937; }
  h1 { color: #1e3a5f; font-size: 22px; border-bottom: 2px solid #1e3a5f; padding-bottom: 8px; }
  h2 { color: #1e3a5f; font-size: 16px; margin-top: 24px; border-bottom: 1px solid #e5e7eb;
       padding-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 10px; }
  th { background: #1e3a5f; color: white; padding: 6px 8px; text-align: left; }
  td { padding: 5px 8px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
  tr:nth-child(even) { background: #f9fafb; }
  .critical, .HIGH, .high { background: #fee2e2; color: #991b1b; font-weight: bold; }
  .medium, .MEDIUM { background: #fef3c7; color: #92400e; }
  .low, .LOW { background: #fefce8; color: #713f12; }
  .skipped { color: #6b7280; font-style: italic; }
  .summary-table td { font-size: 12px; padding: 8px; }
  .badge-ok { background: #d1fae5; color: #065f46; padding: 2px 8px; border-radius: 4px; }
  .badge-fail { background: #fee2e2; color: #991b1b; padding: 2px 8px; border-radius: 4px; }
  .badge-skip { background: #f3f4f6; color: #6b7280; padding: 2px 8px; border-radius: 4px; }
</style>
</head>
<body>
"""


def run_tool(tool: dict, report_dir: Path) -> dict:
    """Run a single security tool and return its result."""
    name = tool["name"]
    cwd = REPO_ROOT / tool.get("cwd", "")
    output_file = report_dir / tool["output_file"]

    try:
        result = subprocess.run(
            tool["cmd"],
            capture_output=True,
            text=True,
            cwd=str(cwd),
        )
        raw = result.stdout or result.stderr or ""
    except FileNotFoundError:
        return {"name": name, "status": "skipped", "data": None, "raw": ""}

    if not raw.strip():
        output_file.write_text("{}")
        return {"name": name, "status": "ok", "data": {}, "raw": ""}

    parse_mode = tool.get("parse", "json")

    if parse_mode == "jsonlines":
        lines = [ln for ln in raw.splitlines() if ln.strip()]
        parsed = []
        for line in lines:
            try:
                parsed.append(json.loads(line))
            except json.JSONDecodeError:
                pass
        output_file.write_text(json.dumps(parsed, indent=2))
        return {"name": name, "status": "ok", "data": parsed, "raw": raw}

    try:
        data = json.loads(raw)
        output_file.write_text(json.dumps(data, indent=2))
        return {"name": name, "status": "ok", "data": data, "raw": raw}
    except json.JSONDecodeError:
        txt_path = output_file.with_suffix(".txt")
        txt_path.write_text(raw)
        return {"name": name, "status": "parse_error", "data": None, "raw": raw}


def count_findings(result: dict) -> tuple[int, int, int]:
    """Return (total, high, medium) counts for a tool result."""
    name = result["name"]
    data = result.get("data")
    if not data:
        return 0, 0, 0

    if name == "Bandit":
        issues = data.get("results", [])
        high = sum(1 for i in issues if i.get("issue_severity") == "HIGH")
        medium = sum(1 for i in issues if i.get("issue_severity") == "MEDIUM")
        return len(issues), high, medium

    if name == "pip-audit":
        vulns = data.get("dependencies", [])
        total = sum(len(d.get("vulns", [])) for d in vulns)
        return total, 0, 0

    if name == "npm audit":
        vulns = data.get("vulnerabilities", {})
        total = len(vulns)
        high = sum(1 for v in vulns.values() if v.get("severity") in ("high", "critical"))
        return total, high, 0

    if name == "TruffleHog":
        items = data if isinstance(data, list) else []
        return len(items), len(items), 0

    if name == "Semgrep":
        findings = data.get("results", []) if isinstance(data, dict) else []
        return len(findings), 0, 0

    if name == "Checkov":
        if isinstance(data, list):
            total = sum(
                len(d.get("results", {}).get("failed_checks", []))
                for d in data
                if isinstance(d, dict)
            )
        elif isinstance(data, dict):
            total = len(data.get("results", {}).get("failed_checks", []))
        else:
            total = 0
        return total, 0, 0

    return 0, 0, 0


def _severity_class(severity: str) -> str:
    s = severity.upper()
    if s in ("HIGH", "CRITICAL"):
        return "HIGH"
    if s == "MEDIUM":
        return "MEDIUM"
    if s == "LOW":
        return "LOW"
    return ""


def _esc(text: object, limit: int = 0) -> str:
    s = str(text) if text is not None else ""
    if limit and len(s) > limit:
        s = s[:limit] + "…"
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def build_tool_section(result: dict) -> str:
    name = result["name"]
    status = result["status"]
    data = result.get("data")

    if status == "skipped":
        return f"<h2>{_esc(name)}</h2><p class='skipped'>Tool not installed — skipped.</p>\n"

    if status == "parse_error":
        return (
            f"<h2>{_esc(name)}</h2>"
            f"<p class='skipped'>Could not parse output as JSON. Raw output saved as .txt.</p>\n"
        )

    if name == "Bandit":
        issues = data.get("results", []) if data else []
        if not issues:
            return f"<h2>{_esc(name)}</h2><p>No issues found.</p>\n"
        rows = "".join(
            f"<tr class='{_severity_class(i.get('issue_severity',''))}'>"
            f"<td>{_esc(i.get('filename'))}</td>"
            f"<td>{_esc(i.get('line_number'))}</td>"
            f"<td>{_esc(i.get('test_id'))}</td>"
            f"<td>{_esc(i.get('issue_text'))}</td>"
            f"<td>{_esc(i.get('issue_severity'))}</td>"
            f"<td>{_esc(i.get('issue_confidence'))}</td>"
            "</tr>"
            for i in issues
        )
        return (
            f"<h2>{_esc(name)}</h2><table>"
            "<tr><th>File</th><th>Line</th><th>Test ID</th>"
            "<th>Issue</th><th>Severity</th><th>Confidence</th></tr>"
            f"{rows}</table>\n"
        )

    if name == "pip-audit":
        deps = data.get("dependencies", []) if data else []
        rows = []
        for dep in deps:
            for vuln in dep.get("vulns", []):
                fix = ", ".join(vuln.get("fix_versions", [])) or "none"
                rows.append(
                    f"<tr>"
                    f"<td>{_esc(dep.get('name'))}</td>"
                    f"<td>{_esc(dep.get('version'))}</td>"
                    f"<td>{_esc(vuln.get('id'))}</td>"
                    f"<td>{_esc(fix)}</td>"
                    "</tr>"
                )
        if not rows:
            return f"<h2>{_esc(name)}</h2><p>No vulnerabilities found.</p>\n"
        return (
            f"<h2>{_esc(name)}</h2><table>"
            "<tr><th>Package</th><th>Version</th><th>Vuln ID</th><th>Fix Versions</th></tr>"
            f"{''.join(rows)}</table>\n"
        )

    if name == "npm audit":
        vulns = data.get("vulnerabilities", {}) if data else {}
        if not vulns:
            return f"<h2>{_esc(name)}</h2><p>No vulnerabilities found.</p>\n"
        rows = []
        for pkg, info in vulns.items():
            via = ", ".join(
                v if isinstance(v, str) else v.get("source", "?")
                for v in info.get("via", [])
            )
            sev = info.get("severity", "")
            rows.append(
                f"<tr class='{_severity_class(sev)}'>"
                f"<td>{_esc(pkg)}</td>"
                f"<td>{_esc(sev)}</td>"
                f"<td>{_esc(via, 80)}</td>"
                f"<td>{_esc(info.get('fixAvailable'))}</td>"
                "</tr>"
            )
        return (
            f"<h2>{_esc(name)}</h2><table>"
            "<tr><th>Package</th><th>Severity</th><th>Via</th><th>Fix Available</th></tr>"
            f"{''.join(rows)}</table>\n"
        )

    if name == "TruffleHog":
        items = data if isinstance(data, list) else []
        if not items:
            return f"<h2>{_esc(name)}</h2><p>No verified secrets found.</p>\n"
        rows = "".join(
            f"<tr class='HIGH'>"
            f"<td>{_esc(i.get('DetectorName'))}</td>"
            f"<td>{_esc(i.get('Raw'), 40)}</td>"
            f"<td>{_esc(i.get('SourceMetadata'))}</td>"
            "</tr>"
            for i in items
        )
        return (
            f"<h2>{_esc(name)}</h2><table>"
            "<tr><th>Detector</th><th>Raw (truncated)</th><th>Source Metadata</th></tr>"
            f"{rows}</table>\n"
        )

    if name == "Semgrep":
        findings = data.get("results", []) if isinstance(data, dict) else []
        if not findings:
            return f"<h2>{_esc(name)}</h2><p>No findings.</p>\n"
        rows = []
        for finding in findings:
            extra = finding.get("extra", {})
            sev = extra.get("severity", "")
            rows.append(
                f"<tr class='{_severity_class(sev)}'>"
                f"<td>{_esc(finding.get('path'))}</td>"
                f"<td>{_esc(finding.get('check_id'))}</td>"
                f"<td>{_esc(extra.get('message', ''))}</td>"
                f"<td>{_esc(sev)}</td>"
                "</tr>"
            )
        rows_str = "".join(rows)
        return (
            f"<h2>{_esc(name)}</h2><table>"
            "<tr><th>Path</th><th>Check ID</th><th>Message</th><th>Severity</th></tr>"
            f"{rows_str}</table>\n"
        )

    if name == "Checkov":
        if isinstance(data, list):
            checks = [
                c
                for d in data
                if isinstance(d, dict)
                for c in d.get("results", {}).get("failed_checks", [])
            ]
        elif isinstance(data, dict):
            checks = data.get("results", {}).get("failed_checks", [])
        else:
            checks = []
        if not checks:
            return f"<h2>{_esc(name)}</h2><p>No failed checks.</p>\n"
        rows = "".join(
            f"<tr>"
            f"<td>{_esc(c.get('check_id'))}</td>"
            f"<td>{_esc(c.get('check_result', {}).get('result'))}</td>"
            f"<td>{_esc(c.get('resource'))}</td>"
            f"<td>{_esc(c.get('file_path'))}</td>"
            "</tr>"
            for c in checks
        )
        return (
            f"<h2>{_esc(name)}</h2><table>"
            "<tr><th>Check ID</th><th>Result</th><th>Resource</th><th>File</th></tr>"
            f"{rows}</table>\n"
        )

    return f"<h2>{_esc(name)}</h2><p>No data.</p>\n"


def build_html(results: list[dict], scan_time: str) -> str:
    summary_rows = []
    for r in results:
        total, _high, _ = count_findings(r)
        if r["status"] == "skipped":
            badge = "<span class='badge-skip'>SKIPPED</span>"
            count_cell = "—"
        elif total > 0:
            badge = "<span class='badge-fail'>ISSUES</span>"
            count_cell = str(total)
        else:
            badge = "<span class='badge-ok'>OK</span>"
            count_cell = "0"
        summary_rows.append(
            f"<tr><td>{_esc(r['name'])}</td><td>{count_cell}</td><td>{badge}</td></tr>"
        )

    tool_sections = "".join(build_tool_section(r) for r in results)

    return (
        HTML_STYLE
        + f"<h1>Find-One Security Report</h1>"
        f"<p><strong>Date:</strong> {_esc(scan_time)}</p>"
        f"<h2>Summary</h2>"
        f"<table class='summary-table'>"
        f"<tr><th>Tool</th><th>Findings</th><th>Status</th></tr>"
        f"{''.join(summary_rows)}"
        f"</table>"
        f"{tool_sections}"
        f"</body></html>"
    )


def save_report(html: str, report_dir: Path) -> Path:
    try:
        from weasyprint import HTML as WeasyHTML
        pdf_path = report_dir / "security-report.pdf"
        WeasyHTML(string=html).write_pdf(str(pdf_path))
        return pdf_path
    except ImportError:
        print("WARNING: WeasyPrint not installed — saving HTML report instead.")
        html_path = report_dir / "security-report.html"
        html_path.write_text(html, encoding="utf-8")
        return html_path


def print_summary(results: list[dict], report_path: Path, scan_time: str) -> None:
    width = 60
    print("=" * width)
    print(f"Find-One Security Scan — {scan_time}")
    print("=" * width)
    for r in results:
        name = r["name"]
        total, high, medium = count_findings(r)
        if r["status"] == "skipped":
            symbol = "-"
            detail = "not installed"
        elif total == 0:
            symbol = "\u2713"
            detail = "0 findings"
        else:
            symbol = "\u26a0"
            if name == "Bandit":
                detail = f"{total} issues ({high} HIGH, {medium} MEDIUM)"
            else:
                detail = f"{total} findings"
        print(f"{name:<14} {symbol}  {detail}")
    print("-" * width)
    print(f"Report saved to: {report_path}")
    print("=" * width)


def main() -> None:
    os.chdir(REPO_ROOT)
    now = datetime.now()
    scan_time = now.strftime("%Y-%m-%d %H:%M:%S")
    ts = now.strftime("%Y-%m-%d_%H-%M-%S")
    report_dir = REPO_ROOT / "security-reports" / ts
    report_dir.mkdir(parents=True, exist_ok=True)

    results = []
    for tool in TOOLS:
        print(f"Running {tool['name']}...", flush=True)
        results.append(run_tool(tool, report_dir))

    html = build_html(results, scan_time)
    report_path = save_report(html, report_dir)
    print_summary(results, report_path, scan_time)


if __name__ == "__main__":
    main()
