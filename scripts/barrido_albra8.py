#!/usr/bin/env python3
"""Barrido de ALBRA8: estado actual de los 24 repos vs fecha de corte del exilio (2026-11-07)."""
import json, os, sys, urllib.request

TOKEN = os.environ.get("GITHUB_TOKEN", "")
HDRS = {"Authorization": f"Bearer {TOKEN}", "Accept": "application/vnd.github+json", "User-Agent": "chat-x-audit"}
CUT = "2026-11-07T00:00:00Z"

def api(url):
    req = urllib.request.Request(url, headers=HDRS)
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode())

repos = api("https://api.github.com/users/ALBRA8/repos?per_page=100&sort=pushed")
print(f"TOTAL REPOS: {len(repos)}")
print(f"{'REPO':<26}{'PUSHED':<12}{'SHA':<10}{'FECHA COMMIT':<12}MENSAJE")
out = {}
for r in sorted(repos, key=lambda x: x.get("pushed_at") or "", reverse=True):
    name = r["name"]
    pushed = (r.get("pushed_at") or "")[:10]
    try:
        cs = api(f"https://api.github.com/repos/ALBRA8/{name}/commits?per_page=1")
        if cs:
            c = cs[0]
            sha = c["sha"][:7]
            date = c["commit"]["committer"]["date"][:10]
            msg = c["commit"]["message"].splitlines()[0][:70]
        else:
            sha, date, msg = "vacío", "-", "-"
    except Exception as e:
        sha, date, msg = f"ERR", "-", str(e)[:50]
    flag = "  <-- MOVIDO DESDE EL CORTE" if (r.get("pushed_at") or "") >= CUT and name != "CHAT-X" else ""
    print(f"{name:<26}{pushed:<12}{sha:<10}{date:<12}{msg}{flag}")
    out[name] = {"pushed_at": r.get("pushed_at"), "sha": sha, "default_branch": r.get("default_branch")}
json.dump(out, open("/tmp/albra8_sweep.json", "w"), indent=1)
print("\nGuardado: /tmp/albra8_sweep.json")
