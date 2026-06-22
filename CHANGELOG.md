# Changelog

All notable changes to this template are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com).

## [Unreleased]

## [1.1.0] - Multi-session GitHub-mode dashboard + reliability fixes

### Added
- **Per-session branches + autosave (GitHub mode, issue #2).** Each open dashboard
  tab now works on its own `dashboard/<id>` branch instead of committing straight to
  `main`, so concurrent managers no longer race on the same ref. ~10s after any
  staged edit, a silent autosave checkpoint is pushed to that branch (recovery if
  the tab crashes or closes); the explicit **Commit** button pushes the latest
  edits there too, then opens a pull request to `main` (or lets an existing one
  pick up the new commits) - a **PR #N** link appears next to Commit once one
  exists. Local mode (`cms-server.py`) is unchanged - no session branches, no
  autosave, commits go straight to your local repo as before.
- **Dashboard: full-page preview overlay.** An **Open preview** button on the
  blog-post and research-interest editors opens a full-page, non-interactive replica
  of the deployed page (real nav, footer, post/interest layout and typography),
  live-updating as you type and themed via the dashboard's own palette/dark-mode
  state. Hand-ported from the site's partials/SCSS since the standalone admin page
  doesn't run Hugo's build.
- **Permanent placeholder image.** `static/images/placeholder.jpg`, a real photo
  downloaded from Unsplash, for reuse anywhere a stable demo image is needed.

### Changed
- **Markdown split editor.** Each pane (source / preview) is now labeled at heading
  size, the source textarea has a placeholder, and the preview pane's typography
  mirrors the real published post (prose sizing, headings, blockquote, code, images,
  and proper margin around in-content `---` dividers).
- **Blog post Date field.** Now a native date picker instead of free text; legacy
  full-timestamp frontmatter (e.g. `2025-01-01T09:00:00Z`) is truncated to
  `YYYY-MM-DD` on load.
- **`second-post*.md` demo content.** Replaced the "Hello world!" stub with 7
  paragraphs of placeholder copy and the new example image, so it's showcase-ready.
- **GitHub-mode reads now follow the active session branch.** Once a tab has a
  session branch, file lists and content reads come from it (not always `main`),
  so the editor reflects your own in-progress work instead of looking stale right
  after you commit.
- **Required PAT permission (GitHub mode).** The login help text and the
  "Authorize with GitHub" deep-link now also call for **Pull requests: Read and
  write**, needed to open the PR your edits land in. Tokens saved before this
  change will need to be regenerated with that permission added.

### Fixed
- **Session branch lost its prefix on reload (GitHub mode).** Reopening or
  reloading a dashboard tab after its session branch already existed pointed
  reads at a ref named after the bare session id instead of `dashboard/<id>`,
  failing with "no commit found for the ref \<id\>".
- **Commit could fail with "not a fast forward" and open no PR.** Pushing to the
  session branch read its current tip and moved it in two separate steps with no
  retry; if the branch moved in between (e.g. an autosave landing moments
  earlier), the push failed outright. Now retries up to 3 times against the
  branch's latest tip before giving up.
- **Dashboard could keep running stale JS after a deploy.** `admin.js`/`admin.css`
  aren't part of Hugo's asset pipeline, so they weren't fingerprinted like
  `main.js` - GitHub Pages' default ~10min cache on them could leave an open tab
  on outdated code with no visible sign anything was wrong. The deploy workflow
  now tags both with the commit SHA as a `?v=` query string.

## [1.0.0] - First public distribution, Ready for alpha test

### Added
- **Dashboard bulk commit ("Save & Exit").** Editor saves now **stage** changes in
  the browser instead of committing one-by-one; a single **Commit (N)** button in
  the nav bar flushes the whole batch as **one** commit (shown only when there are
  pending changes). Reads overlay the staging area, so editors and lists always
  reflect staged-but-uncommitted work (a staged new post appears, a staged delete
  disappears); a `beforeunload` and sign-out guard warn before discarding pending
  edits. Local mode commits via a new `/api/commit` endpoint (one pathspec commit);
  the deployed Pages dashboard builds the same single commit with the GitHub Git
  Data API. Image pastes still commit immediately (hash-named, deduped). This ends
  the noisy one-commit-per-save / per-auto-translated-file history.
- **Dashboard auto-translation (free, keyless).** A "⤳ Translate from …" button in
  the Publications/News/CV, blog-post, and research-interest editors pulls content
  from another language and loads a machine translation **into the editor you're
  in** - it never commits on its own, so you review the draft and save like any
  other edit. The source is the default language (or the first other language when
  you're editing the default). Uses MyMemory entirely client-side (no API key, no
  backend, CORS) so it works locally and on the deployed Pages dashboard. It is
  **field-aware** (only prose is translated - titles, authors, venues, URLs, dates,
  and slugs stay identical across languages), **markdown-safe** (links/code/images/
  bare URLs kept verbatim; `**bold**`/`*italic*`/`~~strike~~` markers preserved,
  inner text translated; long text chunked under MyMemory's 500-byte limit), and
  **gap-fill by default** so existing hand-edits in the editor are never overwritten
  (it asks before a full re-translate). Conventional MT yields a reviewable draft,
  not final prose.
- **`init.py` - post-clone setup.** A zero-dependency, cross-platform Python
  prompt that personalizes `config/_default/hugo.toml` (title, baseURL) and
  `params.yaml` (affiliation, social links, palette, favicon). Surgical line
  edits - comments, structure, and the language list are preserved; re-runnable.
- **Dashboard: "Authorize with GitHub".** A login button that deep-links to
  GitHub's fine-grained token page pre-filled (name/description), then the user
  pastes the scoped token back. Stays backendless (a static site can't run the
  OAuth secret exchange).
- **Dashboard palette, light/dark, and i18n.** The admin chrome now mirrors the
  site's `data-palette` (read from `params.yaml`) and `data-theme` (shares the
  site's `theme` choice via a header toggle, pre-paint so there's no flash), and
  its own UI strings are translatable (EN/KO) via a dashboard-language switch.
- **Labeled language selectors.** The two header dropdowns are now captioned
  **Display** (dashboard chrome) vs **Content** (which language you're editing),
  so they're no longer ambiguous; captions follow the display language.
- **Dashboard favicon.** The admin page uses the same emoji favicon as the site
  (`params.faviconEmoji`, default 🌲).

### Changed
- **Cache-busting JS.** `main.js` moved to `assets/js/` and is fingerprinted in
  `baseof.html` (content-hashed URL, like the CSS), so a deploy invalidates the
  browser cache for it immediately. (GitHub Pages still imposes its own ~10-min
  CDN cache on the HTML itself, which the repo can't override.)
- **Themed demo content.** The placeholder persona is now a coherent, playful
  demo - *Joomo Makguli*, a makgeolli-fermentation researcher at Jumak National
  University - across the bio, research interests, publications, news, CV, and
  blog (EN + KO). Shows off the template with real cross-links intact rather than
  generic lorem-ipsum.

### Documentation
- **Landing README + bilingual docs.** Rewrote `README.md` as a landing page -
  hero, a "why this template" list, a feature table, a 5-minute quickstart, a
  live-demo link, and palette/dashboard screenshots (titled "a No-Code Hugo
  template"). Added `QUICKSTART.md` with hands-on walkthroughs: first deploy
  (including *deploy via GitHub Actions, not a branch*), writing a post, editing
  publications/news/CV, adding a language, configuring from the dashboard, and
  common gotchas. Added Korean siblings `README.ko.md` and `QUICKSTART.ko.md` with
  a language switcher.

## [0.0.0] - Initial template release

The portfolio, generalized into a reusable Hugo template.

### Added
- **Multilingual support** - Hugo `[languages]` (English default + Korean demo),
  UI strings in `i18n/*.toml`, per-language content (`.<lang>.md`) and data
  (`data/<lang>/`), and a header language dropdown.
- **Owner configuration** in `config/_default/params.yaml` - identity, social links,
  color palette, and per-section enable toggles (gating nav tabs and home sections).
- **Color palettes + light/dark mode** - named palettes (forest/slate/crimson/plum)
  and a visitor light/dark toggle, both via CSS custom properties; the owner palette
  is set from config, the theme choice persists per browser with no flash on load.
- **Site Settings dashboard** - the `/admin/` content editor gained a Settings panel
  (edits `params.yaml`) and a content-language selector for per-language editing.
- **MIT license** and template documentation.

### Notes
- Theming uses CSS relative-color syntax (2023+ browsers).
- Ships with neutral placeholder content (a demo persona) so it builds complete.
