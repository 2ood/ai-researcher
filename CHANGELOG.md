# Changelog

All notable changes to this project are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com).

## [Unreleased] — 2026-06-10

### Added
- **Paste-to-upload images** in the admin Markdown editor — pressing Ctrl+V with an
  image on the clipboard hashes the bytes (SHA-256, 16 hex chars), uploads the file to
  `static/images/uploads/<hash>.<ext>`, and inserts a `![](…)` link at the cursor.
  Identical images dedupe automatically (same hash → no redundant commit). Backed by a
  new `POST /api/upload` endpoint in `cms-server.py`; falls back to the GitHub Contents
  API when not served locally.
- **Image render hook** (`layouts/_default/_markup/render-image.html`) — rewrites
  root-relative image sources (`/images/...`) through the site's base path so they
  resolve under the deployed subpath (`…/ai-researcher/…`), mirroring the link hook.
- **Image captions** — when an image has alt text, it renders as a captioned figure;
  the caption is centered and semi-transparent carbon.
- **Click-to-zoom lightbox** — clicking any content image opens it full-screen in a
  fading overlay (Esc or click anywhere to close). Adds a third vanilla-JS behavior in
  `static/js/main.js`, plus a new `assets/scss/_lightbox.scss` partial.
- **Live image preview in local mode** — `cms-server.py` now serves repo `static/`
  images under `/images/`, so pasted images appear immediately in the editor preview.
- **Emoji favicon** (🌲) as an inline SVG data URI in the page `<head>`.
- **Local CMS backend** (`cms-server.py`) — a zero-dependency Python server that
  serves the admin dashboard and commits content edits to the **local** git repo
  instead of pushing to GitHub. Edits accumulate as local commits and are pushed
  in bulk manually. Commits are scoped to the edited file so unrelated staged
  changes are never swept in. When the dashboard isn't served by this backend
  (e.g. the copy deployed on GitHub Pages), it falls back to its original
  GitHub-API behavior.
- **Full-width split markdown editor** in the admin dashboard — rendered preview
  on the left, textarea on the right, edge-to-edge with no gaps. Shared by the
  blog and research-interest editors.
- **Research Interests** admin section rebuilt as a list → single-editor flow
  (like the blog): rows with Edit/Delete/New, and the split markdown editor for
  the `details` body.
- **Relative-link support in content** — a link render hook
  (`layouts/_default/_markup/render-link.html`) rewrites root-relative
  destinations such as `/blog/first-post/` through the site's base path, so
  internal links written without the domain work both locally and under the
  deployed subpath (`…/ai-researcher/…`).
- **Custom 404 page** (`layouts/404.html` + `assets/scss/_notfound.scss`) using
  the site chrome; served by GitHub Pages for unknown URLs.
- **Downloadable CV** at `static/cv.pdf`, wired to the existing CV button.

### Changed
- **Mobile/tablet side padding** widened from 8px to 16px (`.container`), which was
  uncomfortably tight to read against on phones. The `.container` rule, previously
  duplicated across `_base.scss` and `_layout.scss`, is consolidated into one
  definition so future padding edits take fully.
- **Content images** now fill the content column (full width, height auto) on both
  blog posts and research-interest pages.
- **Page background** brightened: `$porcelain` `#FEFEFA` → `#FFFEFC`, trimming the warm
  yellow cast for a crisper look while staying off-white (SPEC.md reconciled to match).
- **News** entries now render newest-first via a template-level date sort (both
  the home "latest" list and the full news page), independent of file order.
- **Research-interest detail** body now fills the content column (removed the
  `65ch` cap) so its width matches the rest of the page.
- **CV header** styling: forest accent border and restyled heading.

### Fixed
- **Hugo deprecation** — replaced the deprecated `.Site.LanguageCode` template
  access and `languageCode` config key with `.Language.Locale` and `locale`
  (the `<html lang>` attribute still renders `en`).
- **Hugo deprecation** — replaced `.Site.Data` with `hugo.Data` across all
  templates and content adapters.
- **CV download 404 on production** — the CV asset was named `CV.pdf` while the
  link points to `cv.pdf`. Renamed to `cv.pdf` to match; the previous casing
  worked only on case-insensitive local filesystems and would 404 on
  case-sensitive hosting (GitHub Pages).

### Security
- **Admin token TTL** — the GitHub token kept in `localStorage` now self-expires
  after 2 days (client-side), in addition to its GitHub-side expiration, so a leaked
  browser profile only exposes it briefly.
- **`cms-server.py` restricted to local-only** — rejects non-loopback clients and
  foreign `Host` headers (guards against DNS-rebinding), and the path resolver now
  rejects Windows drive-letter paths and verifies every path is contained within the
  repo root (via `realpath` + `commonpath`), not just by collapsing `..`.
- **Admin CDN dependencies pinned** — `js-yaml` and `marked` now load with
  Subresource Integrity (SRI) hashes and `crossorigin`, so a compromised CDN cannot
  inject code (and steal the token) into the dashboard.
- **Stopped advertising `/admin`** — removed the `Disallow: /admin/` line from
  `robots.txt` (it disclosed the path to anyone reading the file while doing nothing
  against malicious bots); the admin page keeps its `noindex` meta.
