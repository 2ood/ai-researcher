# Kyungmin Choi — Academic Portfolio

A personal academic portfolio and research blog for an AI/ML researcher at
**GIST (Gwangju Institute of Science and Technology), Data Science Lab**. It is a
public-facing showcase — bio, research interests, publications, and CV — and a
"thinking-out-loud" blog for research notes, written in English and Korean.

The design is deliberately quiet and paper-like: a warm off-white background,
forest-green accents, and the bilingual **Chiron GoRound TC** typeface, so Hangul
and Latin render with equal care. The full design intent and conventions live in
[SPEC.md](SPEC.md).

**Live site:** https://2ood.github.io/ai-researcher/

## Stack

- **Hugo (Extended)** — static site generator with native Sass compilation
- **Go templates** + **SCSS** (one partial per page/component) + **YAML** data files
- **Vanilla JS only** — no framework, no build step (filter tabs, mobile nav, image lightbox)
- **GitHub Pages** via GitHub Actions (`hugo --minify` on push to `main`)

No Node.js, no CMS service, no database — the build is the Hugo binary alone.

## Project layout

```
content/   Markdown pages + blog posts; data-driven pages via _content.gotmpl
data/      Structured content: publications, news, cv, research_interests (YAML)
layouts/   Go templates — _default/ shell, per-section views, partials, render hooks
assets/    SCSS (main.scss entry, _variables.scss tokens, per-component partials)
static/    Images, cv.pdf, vanilla JS, and the local admin dashboard
```

## Local development

```bash
hugo server          # live-reload preview at http://localhost:1313/
hugo --minify        # production build into public/
```

## Editing content

Content can be edited two ways:

1. **Directly** — edit the Markdown in `content/` or the YAML in `data/`, then commit.
2. **Local admin dashboard** — a zero-dependency Python backend that serves a content
   editor and commits each save to your **local** git repo (push in bulk when ready):

   ```bash
   python cms-server.py     # then open http://localhost:8787/
   ```

   The dashboard offers schema-driven editors for publications/news/CV, a split
   Markdown editor for blog posts and research interests, and **paste-to-upload
   images** (Ctrl+V): pasted images are hashed, written to `static/images/uploads/`,
   and a Markdown link is inserted at the cursor. Image alt text renders as a
   caption, and content images open in a click-to-zoom lightbox on the site.

   When the dashboard is served from GitHub Pages instead, it falls back to
   committing through the GitHub API. Use a **fine-grained token** scoped to this
   repo (Contents: read/write) with a **short expiration** — the dashboard also
   self-expires the stored token after 2 days. The local `cms-server.py` only
   accepts loopback requests and refuses to run as a public server.

## Deployment

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds with Hugo
Extended and publishes `public/` to GitHub Pages.

## Documentation

- [SPEC.md](SPEC.md) — design philosophy, palette, typography, and coding conventions
- [ROADMAP.md](ROADMAP.md) — direction, in-progress work, and completed milestones
- [CHANGELOG.md](CHANGELOG.md) — session-by-session record of changes
