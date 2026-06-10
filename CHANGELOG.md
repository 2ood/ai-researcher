# Changelog

All notable changes to this project are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com).

## [Unreleased] — 2026-06-10

### Added
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
- **News** entries now render newest-first via a template-level date sort (both
  the home "latest" list and the full news page), independent of file order.
- **Research-interest detail** body now fills the content column (removed the
  `65ch` cap) so its width matches the rest of the page.
- **CV header** styling: forest accent border and restyled heading.

### Fixed
- **CV download 404 on production** — the CV asset was named `CV.pdf` while the
  link points to `cv.pdf`. Renamed to `cv.pdf` to match; the previous casing
  worked only on case-insensitive local filesystems and would 404 on
  case-sensitive hosting (GitHub Pages).
