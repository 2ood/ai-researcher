# Roadmap

High-level direction for the site. Detailed architecture lives in [SPEC.md](SPEC.md);
session-by-session changes live in [CHANGELOG.md](CHANGELOG.md).

## In Progress
- _(nothing active)_

## Planned
- [ ] Image render hook for root-relative image paths — links are base-path aware,
      but `![alt](/images/...)` in content still bypasses the rewrite.
- [ ] Optional: order the News and Interests lists by date inside the admin editor
      (display is already sorted on the site; the editor shows file order).
- [ ] Optional: toggle for full-width metadata in the split editor (currently the
      metadata block is capped while the editor panes go edge-to-edge).

## Completed
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
- The CMS does not handle binary uploads; `static/cv.pdf` is updated manually in
  the repo.
- The admin UI loads `js-yaml`/`marked` from a CDN, so it needs internet even in
  local mode (the git operations themselves are fully local).
