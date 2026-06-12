# Roadmap

High-level direction for the template. Notable changes live in
[CHANGELOG.md](CHANGELOG.md).

## Recently shipped
**2026-06-12**
- **Landing README + bilingual docs (v1.0.0, public).** Rewrote `README.md` as a
  landing page - hero, a "why this template" list, a feature table, a 5-minute
  quickstart, a live-demo link, and palette/dashboard screenshots. Added a new
  `QUICKSTART.md` with hands-on walkthroughs (first deploy, writing a post, editing
  pubs/news/CV, adding a language, dashboard config, common gotchas), plus Korean
  siblings `README.ko.md` + `QUICKSTART.ko.md` with a language switcher. Tagged
  v1.0.0 and made the repo public.

**2026-06-11**
- **Bulk "Save & Exit" commit** - editor saves now *stage* in the browser instead of
  committing one-by-one; a single **Commit (N)** button in the nav bar flushes the
  whole batch as one commit (local mode via a new `/api/commit`; Pages via the GitHub
  Git Data API). Reads overlay the staging area so editors/lists reflect uncommitted
  work; `beforeunload` + sign-out guard pending edits. Ends the noisy one-commit-per-
  save history. (Image pastes still commit immediately - hash-named/deduped.)
- **Dashboard auto-translation** - a keyless, free "⤳ Translate from …" button that
  pulls another language's content and machine-translates it *into the current
  editor* (MyMemory, client-side, no API key); you review and save like any edit -
  it never commits on its own. Field-aware (prose only; titles/URLs/slugs stay
  fixed), markdown-safe (protects links/code/images/emphasis), and gap-fill by
  default so hand-edits in the editor are never overwritten.

**2026-06-10**
- **`init.py`** - one-command post-clone personalization (rewrites `hugo.toml` +
  `params.yaml` surgically). First piece of the onboarding-polish goal.
- **Dashboard upgrades** - "Authorize with GitHub" deep-link, site favicon, palette
  + light/dark theme, EN/KO UI translation, and labeled Display/Content selectors.
- **Cache-busting** - `main.js` moved to `assets/js/` and fingerprinted at build.
- **Themed demo persona** - *Joomo Makguli* makgeolli-research demo content (EN/KO).

## Next up (next session)
The onboarding-polish goal is complete (landing README + QUICKSTART + bilingual docs
+ screenshots, shipped 2026-06-12). No committed item for next session yet - see
**Open threads** and **Ideas** below for candidates.

## Shelved
- **Grammar-check button** - *Gave up.* No good keyless/free path: LanguageTool's
  public API effectively needs an account/API key for reliable use, and the only
  strong free Korean checker (bareun.ai) is a manual copy-paste round-trip - not
  worth the UX cost. Revisit only if a genuinely free, CORS-friendly option appears.

## Open threads
- Live demo is deployed from this repo (`baseURL` → `2ood.github.io/hugo-academic-portfolio/`,
  themed demo persona). When packaging the template for reuse, reset `baseURL`,
  `params.yaml` identity, and `data/`+`content/` back to neutral placeholders (or
  document that `init.py` + the dashboard are the intended reset path).
- `content/blog/first-post*.md` were cleaned up this session (garbled MT prose
  removed via the dashboard). Spot-check the remaining demo posts (e.g.
  `second-post*.md`) for leftover junk before relying on them as a showcase.
  (Lesson: translating single-word emphasis fragments like "italic" through
  MyMemory yields junk - a future refinement could skip too-short runs.)

## Ideas / possible improvements
- [ ] More built-in palettes, and a small palette preview in the Settings dashboard.
- [ ] Optional live palette preview / per-visitor palette override.
- [ ] Dashboard support for editing `config/_default/hugo.toml` (title, baseURL,
      language list) without hand-editing TOML.
- [ ] RSS/sitemap polish and per-language feeds.
- [ ] A scaffolding script (or `hugo new`) for adding a language end-to-end.

## Non-goals
- No hosted/third-party CMS, no JS framework, no Node/Tailwind/PostCSS pipeline.
- No database, accounts, or comments. The build is the Hugo binary alone.
