# Roadmap

High-level direction for the site. Detailed architecture lives in [SPEC.md](SPEC.md);
session-by-session changes live in [CHANGELOG.md](CHANGELOG.md).

## In Progress
- _(nothing active)_

## Planned
- [ ] Optional: order the News and Interests lists by date inside the admin editor
      (display is already sorted on the site; the editor shows file order).
- [ ] Optional: toggle for full-width metadata in the split editor (currently the
      metadata block is capped while the editor panes go edge-to-edge).

## Completed
- [x] 2026-06-10 — Widened mobile/tablet side padding (`.container` now 16px below
      1024px, was 8px on mobile) and consolidated the duplicate `.container` rule.
- [x] 2026-06-10 — Security pass: stop advertising `/admin` in robots.txt + SRI-pin
      admin CDN deps; 2-day TTL on the stored admin token; locked `cms-server.py` to
      local-only (Host/loopback check + hardened path resolver).
- [x] 2026-06-10 — End-to-end image support: paste-to-upload in the Markdown editor
      (hashed filenames → `static/images/uploads/`, link inserted at the cursor),
      base-path-aware image render hook, alt-text captions, full-width content images,
      and a click-to-zoom lightbox with a fade transition.
- [x] 2026-06-10 — Brighter page background (`$porcelain` `#FEFEFA` → `#FFFEFC`) and
      an emoji 🌲 favicon.
- [x] 2026-06-10 — Local CMS backend (`cms-server.py`): commits content edits to the
      local repo for bulk push; GitHub-API fallback when deployed.
- [x] 2026-06-10 — Full-width split markdown editor (preview left, textarea right),
      shared by the blog and research-interest editors.
- [x] 2026-06-10 — Research Interests rebuilt as a list → single-editor flow.
- [x] 2026-06-10 — News rendered newest-first via template date sort.
- [x] 2026-06-10 — Relative-link render hook for base-path-aware internal links.
- [x] 2026-06-10 — Custom 404 page.
- [x] 2026-06-10 — Research-interest detail body uses full content width.
- [x] 2026-06-10 — Downloadable CV (`static/cv.pdf`) + fixed case mismatch.

## Deferred / Reconsidered
- Auto-pull approach (keep CMS committing to remote, then `git pull` locally to
  resync) was considered for keeping the local repo in sync, then rejected in
  favor of the local-commit backend — the browser/GitHub can't push into the
  local clone, and bulk/controlled publishing was the priority.

## Known Limitations
- The CMS uploads binaries only via image paste in the Markdown editor; there is no
  file picker, and non-content binaries like `static/cv.pdf` are updated manually.
- The admin UI loads `js-yaml`/`marked` from a CDN, so it needs internet even in
  local mode (the git operations themselves are fully local).
