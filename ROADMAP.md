# Roadmap

High-level direction for the template. Notable changes live in
[CHANGELOG.md](CHANGELOG.md).

## Recently shipped
**2026-09-12**
- **Multilingual support dropped entirely.** The owner found the per-language
  dashboard workflow (switch the Content selector, open each file, click
  Translate) too burdensome to keep maintaining alongside real content. Removed,
  not just hidden: all `*.ko.md` content, `data/ko/` (with `data/en/` flattened
  to `data/`), `i18n/ko.toml`, Hugo's `[languages]` block and the header
  language-switcher partial, and the dashboard's content-language selector, UI
  chrome language toggle, and entire MyMemory auto-translate subsystem. Templates
  now read the flattened data via plain `hugo.Data` (dropping the deprecated
  `site.Data` / per-language `hugo.Data site.Language.Lang` indirection). One
  Korean-only post (`on-research-communications`) was kept as an English-slot
  draft for manual translation later, rather than deleted.
- **Dashboard UX overhaul.**
  - **Owner-selectable font pairing.** Replaced the site-wide `Chiron GoRound TC`
    font (read as generic "AI-landing-page" styling) with a considered default
    (Newsreader/Inter) and a **Font pairing** picker in dashboard Settings - same
    mechanism as the palette selector (`data-font` on `<html>`, resolved from
    `params.font` at Hugo build time; the public site fetches only the selected
    pairing's Google Fonts, the dashboard preloads all four since it can't
    build-time-select). Four curated options: Serif+Sans, Modern Grotesk,
    Literary Serif, Technical Mono.
  - **Background retuned** from `#FFFEFC` to `#FDFDFD` after a few rounds of
    live iteration with the owner (`#FAFAFA` read as cool/blue-tinted, `#FAF9F6`
    as too warm) - applied to both the site and the dashboard chrome.
  - **Blog post cards redesigned.** Cards now show the post's real title, date,
    description, and tags (fetched from frontmatter, mirroring the real
    `blog-entry.html` list layout) instead of the raw filename and file path.
    The whole card is now the click target to open the editor (keyboard
    reachable) instead of a separate Edit button; the per-row Delete button
    moved into the editor's sticky action bar, next to Cancel, shown only when
    editing an existing post.
  - **Hash-based view routing for Back/Forward.** Every dashboard view (a
    section's list, an editor, Settings) now has its own `#hash`
    (`#blog`, `#blog/edit/<path>`, `#research_interests/new`, …), so the
    browser's own Back/Forward buttons move between dashboard views instead of
    leaving the page entirely.
- **GitHub-mode 403s traced to a missing PAT scope.** Diagnosed with the owner:
  the `Pull requests: Read and write` permission (added as a requirement in
  v1.1.0) is easy to miss on a token, and its absence surfaces as a 403 on
  every Commit's auto-PR step. Regenerating the token with that scope resolved
  it; no code change was needed.

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
No committed item yet - see **Open threads** and **Ideas** below for candidates.
The Research Interests list still has the old per-row Edit/Delete-button pattern
(pre-dating the blog list's redesign to clickable cards); worth asking whether to
unify it the same way.

## Shelved
- **Grammar-check button** - *Gave up.* No good keyless/free path: LanguageTool's
  public API effectively needs an account/API key for reliable use, and the only
  strong free Korean checker (bareun.ai) is a manual copy-paste round-trip - not
  worth the UX cost. Revisit only if a genuinely free, CORS-friendly option appears.
- **Language-scaffolding script** (was: "a scaffolding script / `hugo new` for
  adding a language end-to-end", under Ideas). Moot - multilingual support was
  dropped entirely on 2026-09-12 (see Recently shipped).

## Open threads
- Live demo is deployed from this repo (`baseURL` → `2ood.github.io/hugo-academic-portfolio/`).
  **Resolved 2026-09-12**: the themed demo persona (*Joomo Makguli*) has been
  fully replaced with the owner's real identity and content - CV, publications,
  and blog all carry real data now. Still open: when packaging the template for
  *someone else's* reuse, reset `baseURL`, `params.yaml` identity, and
  `data/`+`content/` back to neutral placeholders (or document that `init.py` +
  the dashboard are the intended reset path).
- `content/blog/first-post*.md` were cleaned up in an earlier session (garbled MT
  prose removed via the dashboard); `second-post*.md` was filled in on 2026-06-22
  (see Recently shipped). Both demo posts are showcase-ready now.
  (Lesson, now historical: translating single-word emphasis fragments like
  "italic" through MyMemory yielded junk. Moot since 2026-09-12 - the
  auto-translate feature was removed along with multilingual support.)

## Ideas / possible improvements
- [ ] More built-in palettes, and a small palette preview in the Settings dashboard.
- [ ] Optional live palette preview / per-visitor palette override.
- [ ] Dashboard support for editing `config/_default/hugo.toml` (title, baseURL)
      without hand-editing TOML.
- [ ] RSS/sitemap polish.
- [ ] Unify the Research Interests list onto the same clickable-card pattern
      (title/summary, no per-row buttons, Delete moved into the editor) that the
      blog list got on 2026-09-12.

## Non-goals
- No multilingual support (dropped 2026-09-12 - see Recently shipped).
- No hosted/third-party CMS, no JS framework, no Node/Tailwind/PostCSS pipeline.
- No database, accounts, or comments. The build is the Hugo binary alone.
