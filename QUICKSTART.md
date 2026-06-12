# Quickstart & Walkthroughs

**English** · [한국어](QUICKSTART.ko.md)

Hand-held, step-by-step guides for the common tasks. The
[README](README.md#quickstart-5-minutes) has the 30-second version; this is the
detailed one. New here? Start with **First deploy**.

## Contents

1. [First deploy: zero to live](#1-first-deploy-zero-to-live)
2. [How `python init.py` works](#2-how-python-initpy-works)
3. [Write a blog post](#3-write-a-blog-post)
4. [Edit publications, news & CV](#4-edit-publications-news--cv)
5. [Add a language](#5-add-a-language)
6. [Configure from the dashboard](#6-configure-from-the-dashboard)
7. [Common mistakes & gotchas](#7-common-mistakes--gotchas)

---

## 1. First deploy: zero to live

**Prerequisites:** [Hugo Extended](https://gohugo.io/installation/) ≥ 0.146
(the *Extended* build is required - it compiles the theme's Sass; plain Hugo
fails). Git, a GitHub account, and Python 3 if you want the browser dashboard.

1. **Create your repo from the template.** On GitHub, click **Use this template →
   Create a new repository**. (Or clone, then point `origin` at your own repo.)
   ```bash
   git clone https://github.com/<you>/<repo>.git && cd <repo>
   ```

2. **Personalize.** Run the setup prompt - it rewrites your name, affiliation,
   social links, palette, and Pages URL into the config files (details in
   [§2](#2-how-python-initpy-works)):
   ```bash
   python init.py
   ```

3. **Preview locally.** Hugo live-reloads as you edit:
   ```bash
   hugo server          # http://localhost:1313/
   ```

4. **Replace the demo content** (the *Joomo Makguli* persona). At minimum:
   - `content/_index.md` - your bio (and `_index.<lang>.md` per language)
   - `data/<lang>/*.yml` - publications, news, cv, research_interests
   - `static/images/profile.svg` - your photo (any image; update `profileImage`)
   - `static/cv.pdf` - your CV PDF
   Edit these by hand, or use the dashboard ([§3](#3-write-a-blog-post),
   [§4](#4-edit-publications-news--cv)).

5. **Commit and push to `main`.**
   ```bash
   git add -A && git commit -m "chore: personalize template" && git push
   ```

6. **Turn on Pages - using GitHub Actions, _not_ a branch.** In your repo:
   **Settings → Pages → Build and deployment → Source: _GitHub Actions_.**
   This template ships `.github/workflows/deploy.yml`, which builds with Hugo
   Extended and publishes on every push to `main`. Watch progress under the
   **Actions** tab; the first run takes a minute or two.

   > ⚠️ If you instead pick *Deploy from a branch*, GitHub will try to serve raw
   > repo files (or a `gh-pages` branch that doesn't exist) and you'll get a
   > broken or 404 site. The source **must** be *GitHub Actions*. See
   > [§7](#7-common-mistakes--gotchas).

Your site is now live at the `baseURL` you set - typically
`https://<you>.github.io/<repo>/`. Every later `git push` to `main` redeploys.

---

## 2. How `python init.py` works

`init.py` is a zero-dependency, re-runnable personalizer. It makes **surgical**
edits to two files - `config/_default/hugo.toml` and
`config/_default/params.yaml` - replacing only the owner-editable values and
leaving comments, structure, and the language list untouched.

Run it from the repo root:

```bash
python init.py
```

It prompts for each value, showing the current one in brackets - **press Enter to
keep it**:

| Prompt | Writes to | Notes |
|---|---|---|
| Your name (site title) | `hugo.toml` `title` | Shown as the site title |
| GitHub username | - | Optional; only used to suggest the URLs below |
| Repository name | - | Combined with the username to suggest `baseURL` |
| Site baseURL | `hugo.toml` `baseURL` | Defaults to `https://<user>.github.io/<repo>/` |
| Affiliation / description | `params.yaml` `description` | Line under your name |
| Tagline | `params.yaml` `tagline` | One-liner on the home page |
| Email | `params.yaml` `email` | |
| Google Scholar URL | `params.yaml` `googleScholar` | |
| GitHub URL | `params.yaml` `github` | Defaults to `https://github.com/<user>` |
| LinkedIn URL | `params.yaml` `linkedin` | |
| Favicon emoji | `params.yaml` `faviconEmoji` | Default 🌲 |
| Color palette | `params.yaml` `palette` | `forest` / `slate` / `crimson` / `plum` |

Because the edits are surgical and Enter-to-keep, you can run it again any time to
change one value without disturbing the rest. It does **not** touch content,
languages, or per-language overrides - those stay manual (see
[§5](#5-add-a-language)).

---

## 3. Write a blog post

Posts live in `content/blog/`. A post is `slug.md` in the default language and
`slug.<lang>.md` for each translation (e.g. `welcome.md` + `welcome.ko.md`).

### Using the dashboard (recommended)

```bash
python cms-server.py     # then open http://localhost:8787/
```

1. Pick the **Content** language (top-right) you're writing in.
2. **Blog → New post.** Fill in title, filename (slug; auto-derived from the title
   if left blank), date, tags, draft flag, and description.
3. Write in the **split Markdown editor** - source on the right, live preview on
   the left.
4. **Paste images with `Ctrl+V`.** The image is hashed, uploaded to
   `static/images/uploads/`, and a root-relative `![](/images/uploads/…)` link is
   inserted at the cursor. On your site it opens in a click-to-zoom lightbox.
   (Pasted images commit immediately; text edits stage - see below.)
5. **Save post** - this *stages* the change. When you're done editing, click the
   **Commit (N)** button in the nav bar to flush everything as **one** commit.
   In local mode that commits to your local repo; remember to `git push`.

### By hand

Create `content/blog/<slug>.md` with front matter and a Markdown body:

```markdown
---
title: Welcome to Brewhouse
date: 2025-01-01T09:00:00Z
tags:
  - meta
draft: false
description: First placeholder post - replace with your own.
---

Write in **Markdown**. Lists, code blocks, block quotes, and tables all render
with reasonable typography.
```

Set `draft: true` to hide a post from the production build (`hugo server -D`
shows drafts locally). For a translation, copy to `<slug>.<lang>.md` and translate
the prose - keep the same slug so the language switcher links the two.

---

## 4. Edit publications, news & CV

These sections are **data files** under `data/<lang>/`, edited either by hand or
through the dashboard's schema-driven editors (which write the same YAML). Each is
per-language, so switch the **Content** selector before editing.

### Publications (`data/<lang>/publications.yml`)

A list of entries. Wrap **your own name** in `**double asterisks**` to bold it in
the author line.

```yaml
- title: Learning Robust Brews from Limited Nuruk
  authors: '**Joomo Makguli**, Bo-ri Lee, Han Saemi'
  venue: BrewNIPS
  year: 2025
  type: Conference          # Conference | Workshop | Journal | Preprint
  selected: true            # show on the home page's "Selected Publications"
  award: Outstanding Pour Award
  interest: Fermentation Dynamics   # must match a research-interest title exactly
  paperUrl: https://example.com/paper
  codeUrl: https://github.com/example/repo
  dataUrl: https://example.com/dataset
  projectUrl: https://example.com/project
  abstract: Renders as the body of this publication's dedicated page.
```

- `type` drives the filter tabs on the Publications page.
- `selected: true` surfaces the paper on the home page shortlist.
- `interest` cross-links the paper onto a research-interest page - the value must
  **exactly** match that interest's `title` (see [§5](#5-add-a-language) about
  keeping titles stable across languages).

### News (`data/<lang>/news.yml`)

Newest-first is handled by the template (sorted by date). `text` supports inline
Markdown links.

```yaml
- date: 2025-09-15
  icon: 🎉                  # pick from the dashboard's emoji picker, or any emoji
  text: Our paper was accepted to [BrewNIPS 2025](https://example.com).
```

### CV (`data/<lang>/cv.yml`)

Four optional sections - `education`, `awards`, `service`, `teaching` - each
rendered only if present:

```yaml
education:
  - institution: Jumak National University
    degree: Ph.D. in Fermentation Science
    advisor: Advised by Prof. Nuruk
    period: 2023 - Present
awards:
  - title: Outstanding Pour Award, BrewNIPS
    year: 2025
service:
  - role: Reviewer
    detail: BrewNIPS, ICML, ICLR (2024 - 2025)
teaching:
  - course: Introduction to Makgeolli (MG200)
    role: Teaching Assistant
    institution: Jumak National University
    period: 2024
```

The downloadable PDF is `static/cv.pdf` (path set by `cvPdf` in `params.yaml`).

### Research interests (`data/<lang>/research_interests.yml`)

Each entry becomes a page at `/research-interests/<slugified-title>/`. `details`
is Markdown and renders as the page body; publications whose `interest` matches the
`title` are auto-listed there.

```yaml
- title: Fermentation Dynamics
  summary: One-line summary shown on the home and section pages.
  details: |
    A paragraph or two of Markdown. You can use **bold**, [links](/publications/),
    and lists.
```

The dashboard has a **Research Interests** tab with the same list + split-Markdown
editor as the blog.

---

## 5. Add a language

The template ships English (default) + a Korean demo. To add `<lang>`:

1. **Declare it** in `config/_default/hugo.toml` under `[languages]`:
   ```toml
   [languages.<lang>]
     label = "Native name"     # shown in the header dropdown
     locale = "<lang>"
     weight = 3
     [languages.<lang>.params]
       description = "…"        # optional per-language overrides
       tagline = "…"
   ```
2. **Translate the UI strings:** copy `i18n/en.toml` to `i18n/<lang>.toml` and
   translate the values.
3. **Add the data:** copy `data/en/` to `data/<lang>/` and translate the prose.
   **Keep the `title` keys identical** to the default language - slugs and the
   `interest` cross-links are matched by title, so changing them breaks the links.
4. **Add content siblings:** for each page, add `<name>.<lang>.md`
   (e.g. `_index.<lang>.md`, `content/blog/<slug>.<lang>.md`), plus a
   `_content.<lang>.gotmpl` for the publications and research-interests sections
   (copy the existing one and keep the logic, swap the `data/<lang>` path).
5. **Tell the dashboard:** add `<lang>` to the `LANGS` array in
   `static/admin/admin.js` so the Content selector offers it.

Preview with `hugo server` and use the header dropdown to switch languages.

---

## 6. Configure from the dashboard

The dashboard's **Settings** tab edits `config/_default/params.yaml` without
hand-editing YAML. It covers:

- **Identity & social:** `description`, `tagline`, `email`, `googleScholar`,
  `github`, `linkedin`.
- **Appearance:** `faviconEmoji`, `profileImage`, `palette`.
- **`cvPdf`:** path to your CV under `static/`.
- **Sections:** toggle `research`, `publications`, `blog`, `news`, `cv` on/off -
  this gates both the nav tabs and the home-page sections.

What the Settings tab **cannot** change (edit `config/_default/hugo.toml` by hand):
your **name/site title**, the **baseURL**, and the **language list**. Saving
Settings rewrites `params.yaml` and **drops its comments** - that's expected.

> The dashboard's own chrome - palette, light/dark, and UI language - is set from
> its header and is independent of the site's visitor theme.

**Local vs. Pages mode.** Run `python cms-server.py` locally and it commits to your
local git repo over loopback (no token). If you instead serve the dashboard from
GitHub Pages, it commits through the GitHub API using a **fine-grained PAT**
(Contents: read/write) you paste in - click **Authorize with GitHub** to open the
token page pre-filled. Use a short expiry; the dashboard self-expires the stored
token after 2 days.

---

## 7. Common mistakes & gotchas

- **Deploy with GitHub Actions, not a branch.** Pages **Source** must be
  *GitHub Actions* (Settings → Pages). Choosing *Deploy from a branch* serves raw
  files or a non-existent `gh-pages` branch → broken/404 site. ([§1](#1-first-deploy-zero-to-live))
- **`baseURL` must match your repo path and keep its trailing slash.** For a
  project site it's `https://<you>.github.io/<repo>/`. A wrong or slash-less
  `baseURL` breaks CSS, links, and images (everything is resolved relative to it).
- **Use Hugo _Extended_.** The theme compiles Sass natively; the plain Hugo binary
  errors out. Need ≥ 0.146 for content adapters.
- **Saving in the local dashboard is not deploying.** Local edits commit to your
  **local** repo - you still have to `git push` to trigger the build.
- **Keep `title` keys identical across languages.** Slugs and the
  publication↔interest cross-links match by title; translating a title silently
  breaks those links. Translate the prose, not the keys. ([§5](#5-add-a-language))
- **`interest` must match a research-interest `title` exactly** to link a paper to
  its interest page (case- and whitespace-sensitive).
- **Settings saves drop YAML comments.** The dashboard rewrites `params.yaml`; if
  you keep notes in comments there, expect them to vanish on save.
- **Pages CDN caches HTML ~10 minutes.** After a deploy, a hard refresh (or a few
  minutes' wait) may be needed to see changes - this is GitHub's cache, not a build
  failure.
- **Visitors need a 2023+ browser.** Theming uses CSS relative-color syntax
  (Chrome 119, Safari 16.4, Firefox 128).
- **The PAT lives only in your browser.** Don't commit it; prefer a short GitHub
  expiry as the primary safeguard.
