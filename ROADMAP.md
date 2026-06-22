# Roadmap

High-level direction for the template. Notable changes live in
[CHANGELOG.md](CHANGELOG.md).

## Recently shipped
**2026-06-22 (on branch `iss#002`, verified live, pending PR + merge)**
- **Per-session branches + autosave for multi-manager GitHub-mode use (issue #2).**
  Each dashboard tab gets its own `dashboard/<id>` branch (created lazily off
  `main` on first edit) instead of every session racing to commit straight to
  `main`. A debounced (~10s) autosave checkpoints staged edits to that branch in
  the background - recovers work if the tab crashes or closes, without touching
  `main` or clearing the staging area. The explicit Commit button now pushes to
  the session branch and opens (or updates) a pull request to `main`, surfaced as
  a **PR #N** link next to Commit - "handle merge by master manager" becomes a
  normal PR review, not a direct push. Local mode is untouched (single machine,
  no multi-session risk there). Requires regenerating any saved PAT with **Pull
  requests: Read and write** added.
- **Three bugs found and fixed during live verification of issue #2:**
  - `restoreSessionBranch()` assigned sessionStorage's bare hex id straight to
    `state.sessionBranch`, skipping the `dashboard/` prefix - any reload after a
    session branch already existed pointed reads at a nonexistent ref ("no commit
    found for the ref \<id\>").
  - `pushToBranch()`'s GET-then-PATCH had no retry, so an ordinary optimistic-
    concurrency conflict (the ref moving between read and write - e.g. autosave
    landing moments before an explicit Commit) surfaced as a hard "Commit failed"
    422 with no PR ever opened. Now retries up to 3 times with backoff.
  - `static/admin/` isn't part of Hugo's asset pipeline, so `admin.js`/`admin.css`
    didn't get fingerprinted like `main.js` - GitHub Pages' default ~10min
    Cache-Control could leave a dashboard tab running stale JS after a deploy,
    silently. The deploy workflow now appends the commit SHA as a `?v=` query
    string to both references.
- **Markdown editor UX overhaul (issue #1).** The blog-post and research-interest
  split editor now labels each pane ("Markdown source" / "Live preview") at heading
  size, has a placeholder in the source textarea, and the preview pane mirrors the
  real post page's typography (prose sizing, headings, blockquote, code, images) -
  including margin around in-content `---` dividers, which previously fell back to
  the cramped browser default. The blog Date field is now a native date picker
  (legacy full-timestamp frontmatter is truncated to `YYYY-MM-DD` on load).
- **Full-page preview overlay.** Both editors gained an **Open preview** button that
  opens a non-interactive, full-page replica of the deployed look - real nav, footer,
  and post/interest layout, live-updating as you type, themed via the dashboard's
  existing palette/dark-mode state. Hand-ported from the site's own partials/SCSS
  since the standalone admin page can't run Hugo's template/build pipeline.
- **`second-post*.md` filled in.** Resolved the open thread below: replaced the
  "Hello world!" stub with 7 paragraphs of placeholder copy and a permanent example
  image (`static/images/placeholder.jpg`, downloaded from a real Unsplash photo -
  Lorem Picsum was down) so the post is no longer placeholder junk.

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
Issue #2 is verified live on `iss#002` (see Recently shipped) and merging to
`main` now. No other committed item yet for after that - see **Open threads**
and **Ideas** below for candidates.

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
- `content/blog/first-post*.md` were cleaned up in an earlier session (garbled MT
  prose removed via the dashboard); `second-post*.md` was filled in on 2026-06-22
  (see Recently shipped). Both demo posts are showcase-ready now.
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
