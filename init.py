#!/usr/bin/env python3
"""init.py - personalize this template after cloning.

Run once from the repo root:

    python init.py

Interactively rewrites the owner-editable values in
config/_default/hugo.toml (title, baseURL) and config/_default/params.yaml
(affiliation, tagline, social links, palette, favicon). Edits are surgical:
comments, file structure, and the language list are left untouched, so the
script is safe to re-run. Press Enter at any prompt to keep the current value.
"""
import os
import re
import sys

# UTF-8 console so emoji defaults (e.g. the favicon) print on Windows too.
try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stdin.reconfigure(encoding="utf-8")
except Exception:
    pass

ROOT = os.path.dirname(os.path.abspath(__file__))
HUGO = os.path.join(ROOT, "config", "_default", "hugo.toml")
PARAMS = os.path.join(ROOT, "config", "_default", "params.yaml")
PALETTES = ["forest", "slate", "crimson", "plum"]


def read(path):
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def write(path, text):
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)


def ask(label, default=""):
    suffix = " [%s]" % default if default else ""
    try:
        val = input("%s%s: " % (label, suffix)).strip()
    except EOFError:
        val = ""
    return val or default


def ask_palette(default):
    while True:
        val = ask("Color palette (%s)" % "/".join(PALETTES), default).lower()
        if val in PALETTES:
            return val
        print("  ! pick one of: %s" % ", ".join(PALETTES))


# ---- surgical field editors ----------------------------------------------
def get_toml_key(text, key):
    m = re.search(r'(?m)^%s\s*=\s*"(.*?)"' % re.escape(key), text)
    return m.group(1) if m else ""


def set_toml_key(text, key, value):
    """Replace a top-level `key = "..."` line; leave everything else intact."""
    esc = value.replace("\\", "\\\\").replace('"', '\\"')
    pat = re.compile(r'(?m)^(%s\s*=\s*)".*?"' % re.escape(key))
    new, n = pat.subn(lambda m: m.group(1) + '"%s"' % esc, text, count=1)
    return new if n else text


def get_yaml_scalar(text, key):
    m = re.search(r'(?m)^%s:[ \t]*(.*)$' % re.escape(key), text)
    return m.group(1).strip().strip('"\'') if m else ""


def yaml_scalar(value):
    """Render a YAML value, quoting only when needed (keeps the file readable)."""
    s = str(value)
    if s == "" or s != s.strip() or re.search(r":\s|#|^[\s>|@`!%&*\[\]{}]", s):
        return '"%s"' % s.replace("\\", "\\\\").replace('"', '\\"')
    return s


def set_yaml_scalar(text, key, value):
    """Replace a top-level (unindented) `key: value` line."""
    pat = re.compile(r'(?m)^(%s:[ \t]*).*$' % re.escape(key))
    new, n = pat.subn(lambda m: m.group(1) + yaml_scalar(value), text, count=1)
    return new if n else text


def main():
    if not (os.path.isfile(HUGO) and os.path.isfile(PARAMS)):
        sys.exit("init: run this from the repo root (config/_default/hugo.toml not found).")

    print("Personalize your academic portfolio. Press Enter to keep a value.\n")
    hugo = read(HUGO)
    params = read(PARAMS)

    # Identity + deploy URL
    name = ask("Your name (site title)", get_toml_key(hugo, "title"))
    owner = ask("GitHub username (for the Pages URL; optional)", "")
    repo = ask("Repository name", "") if owner else ""
    base_default = "https://%s.github.io/%s/" % (owner, repo) if owner and repo \
        else get_toml_key(hugo, "baseURL")
    base = ask("Site baseURL", base_default)

    # Profile + social
    description = ask("Affiliation / description", get_yaml_scalar(params, "description"))
    tagline = ask("Tagline (one line)", get_yaml_scalar(params, "tagline"))
    email = ask("Email", get_yaml_scalar(params, "email"))
    scholar = ask("Google Scholar URL", get_yaml_scalar(params, "googleScholar"))
    github_default = "https://github.com/%s" % owner if owner else get_yaml_scalar(params, "github")
    github = ask("GitHub URL", github_default)
    linkedin = ask("LinkedIn URL", get_yaml_scalar(params, "linkedin"))
    favicon = ask("Favicon emoji", get_yaml_scalar(params, "faviconEmoji") or "🌲")
    palette = ask_palette(get_yaml_scalar(params, "palette") or "forest")

    # Apply
    hugo = set_toml_key(hugo, "title", name)
    hugo = set_toml_key(hugo, "baseURL", base)
    for key, val in [
        ("description", description), ("tagline", tagline), ("email", email),
        ("googleScholar", scholar), ("github", github), ("linkedin", linkedin),
        ("faviconEmoji", favicon), ("palette", palette),
    ]:
        params = set_yaml_scalar(params, key, val)

    write(HUGO, hugo)
    write(PARAMS, params)

    print("\n✓ Updated config/_default/hugo.toml and config/_default/params.yaml\n")
    print("Next steps:")
    print("  hugo server            # preview at http://localhost:1313/")
    print("  python cms-server.py   # edit content at http://localhost:8787/")
    print("  git add -A && git commit -m \"chore: personalize template\" && git push")
    print("\nThen replace the placeholder content: data/<lang>/*.yml, content/,")
    print("static/images/profile.svg, and static/cv.pdf. To add/remove languages,")
    print("see the README (config/_default/hugo.toml [languages]).")


if __name__ == "__main__":
    main()
