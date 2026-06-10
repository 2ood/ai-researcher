#!/usr/bin/env python3
"""cms-server.py - local backend for the Content Dashboard (static/admin).

Serves the admin UI and commits content edits to the LOCAL git repo instead of
pushing straight to GitHub. Run from the repo root:

    python cms-server.py

then open http://localhost:8787/ . Each Save writes the file and makes a local
commit scoped to just that file; nothing is pushed. Run `git push` yourself when
you're ready to publish in bulk.

When the admin page can't reach this server (e.g. the copy deployed on GitHub
Pages) it falls back to its original GitHub-API behavior, so the deployed
dashboard is unaffected.
"""
import json
import os
import posixpath
import subprocess
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

ADDR = ("127.0.0.1", 8787)
REPO_ROOT = os.getcwd()
ADMIN_DIR = os.path.join(REPO_ROOT, "static", "admin")


def resolve(p):
    """Repo-relative path -> (forward-slash rel, absolute fs path). Rejects escapes."""
    if not p or "\x00" in p:
        raise ValueError("invalid path")
    p = p.replace("\\", "/")
    clean = posixpath.normpath("/" + p).lstrip("/")  # rooting at "/" collapses any ".." escape
    if not clean or clean == ".":
        raise ValueError("invalid path")
    full = os.path.join(REPO_ROOT, *clean.split("/"))
    return clean, full


def git(*args):
    r = subprocess.run(["git", *args], cwd=REPO_ROOT, capture_output=True, text=True)
    return r.returncode, (r.stdout + r.stderr)


def is_no_change(out):
    o = out.lower()
    return "nothing to commit" in o or "no changes" in o


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ADMIN_DIR, **kw)

    def log_message(self, fmt, *args):
        pass  # quiet

    # ---- routing ----
    def do_GET(self):
        u = urlparse(self.path)
        if u.path == "/api/ping":
            return self._json(200, {"ok": True})
        if u.path == "/api/list":
            return self._list(parse_qs(u.query))
        if u.path == "/api/get":
            return self._get(parse_qs(u.query))
        if u.path.startswith("/api/"):
            return self._json(404, {"error": "not found"})
        return super().do_GET()

    def do_POST(self):
        u = urlparse(self.path)
        if u.path == "/api/save":
            return self._save()
        if u.path == "/api/delete":
            return self._delete()
        return self._json(404, {"error": "not found"})

    # ---- handlers ----
    def _list(self, q):
        try:
            rel, full = resolve((q.get("dir") or [""])[0])
            names = sorted(os.listdir(full))
        except ValueError as e:
            return self._json(400, {"error": str(e)})
        except OSError as e:
            return self._json(404, {"error": str(e)})
        out = []
        for name in names:
            typ = "dir" if os.path.isdir(os.path.join(full, name)) else "file"
            out.append({"type": typ, "name": name, "path": rel + "/" + name, "sha": ""})
        return self._json(200, out)

    def _get(self, q):
        try:
            _, full = resolve((q.get("path") or [""])[0])
            with open(full, "rb") as f:
                text = f.read().decode("utf-8")
        except ValueError as e:
            return self._json(400, {"error": str(e)})
        except OSError as e:
            return self._json(404, {"error": str(e)})
        return self._json(200, {"text": text, "sha": ""})

    def _save(self):
        req = self._read_json()
        if req is None:
            return
        try:
            rel, full = resolve(req.get("path", ""))
        except ValueError as e:
            return self._json(400, {"error": str(e)})
        os.makedirs(os.path.dirname(full), exist_ok=True)
        with open(full, "wb") as f:  # binary: keep LF line endings, no translation
            f.write(req.get("text", "").encode("utf-8"))
        msg = req.get("message") or ("content(admin): update " + rel)
        code, out = git("add", "--", rel)
        if code != 0:
            return self._json(500, {"error": out.strip()})
        # Pathspec commit: only `rel` is committed, even if other changes are staged.
        code, out = git("commit", "-m", msg, "--", rel)
        if code != 0:
            if is_no_change(out):
                return self._json(200, {"sha": "", "noop": True})
            return self._json(500, {"error": out.strip()})
        return self._json(200, {"sha": ""})

    def _delete(self):
        req = self._read_json()
        if req is None:
            return
        try:
            rel, _ = resolve(req.get("path", ""))
        except ValueError as e:
            return self._json(400, {"error": str(e)})
        code, out = git("rm", "--", rel)
        if code != 0:
            return self._json(500, {"error": out.strip()})
        msg = req.get("message") or ("content(admin): delete " + rel)
        code, out = git("commit", "-m", msg, "--", rel)
        if code != 0:
            return self._json(500, {"error": out.strip()})
        return self._json(200, {"ok": True})

    # ---- io ----
    def _read_json(self):
        try:
            n = int(self.headers.get("Content-Length", 0))
            return json.loads(self.rfile.read(n) or b"{}")
        except (ValueError, json.JSONDecodeError) as e:
            self._json(400, {"error": "bad JSON: %s" % e})
            return None

    def _json(self, code, obj):
        data = json.dumps(obj).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)


def main():
    if not os.path.isfile(os.path.join(ADMIN_DIR, "index.html")):
        sys.exit("cms-server: run this from the repo root - static/admin/index.html not found here (%s)" % REPO_ROOT)
    httpd = ThreadingHTTPServer(ADDR, Handler)
    print("Content Dashboard (local) -> http://%s:%d/" % ADDR)
    print("Repo: %s" % REPO_ROOT)
    print("Saves commit locally; run `git push` when ready. Ctrl+C to stop.")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nstopped.")


if __name__ == "__main__":
    main()
