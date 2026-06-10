# Portfolio Website — Project Specification

## Vision

A personal academic portfolio website for an AI/ML researcher at GIST (Gwangju Institute of Science and Technology). The site introduces the researcher, showcases research interests and publications, and hosts a blog for research thoughts. It should feel controlled, minimal, and scholarly — inspired by [junhomyung.github.io](https://junhomyung.github.io/) but built with Hugo instead of Next.js, and styled with the owner's distinct color palette and typography.

---

## Site Purpose

This site serves two equally important roles:

1. **Professional showcase.** A public-facing academic portfolio for collaborators, advisors, and the research community. Publications, CV, and research interests should be immediately legible and up-to-date. The site is the first thing someone sees after finding a paper — it should answer "who is this person and what do they work on" within five seconds.

2. **Thinking-out-loud space.** The blog is a personal research notebook published in the open. Posts may be half-formed ideas, reading notes, experiment logs, or reflections on the intersection of ML, linguistics, and the philosophy of science. The tone is conversational-academic — rigorous but not stiff. Some posts may be in Korean, some in English, some mixed. The site should welcome both without friction.

The site is NOT a startup landing page, a design portfolio, or a social media presence. It is closer in spirit to a researcher's personal page from the early 2000s — content-dense, author-voiced, quietly confident — but with modern typography and responsiveness.

---

## Design Philosophy

These principles should guide every layout, component, and styling decision. When in doubt, refer back to these.

### 1. Content readability above all else

The site exists to be read. Every design choice — font size, line height, contrast, spacing — serves legibility first. A reader should be able to spend 20 minutes reading a blog post without eye strain. Long-form prose targets ~65 characters per line. Headings create clear visual hierarchy without shouting. Code blocks are comfortable to scan. Nothing competes with the text for attention.

### 2. Scholarly, not corporate

The site should feel like a well-typeset academic document — think a monograph's interior pages, not a SaaS product page. No hero banners, no gradient CTAs, no "Let's connect!" language. Section headings are informative, not marketing copy. The overall mood is quiet authority: the content speaks, the design listens. Inspirations: the calm of a Minumsa (민음사) book cover, the precision of a well-formatted LaTeX document, the restraint of a gallery wall with generous whitespace between works.

### 3. Bilingual by default

The owner writes and thinks in both Korean and English. The primary font (Chiron GoRound TC) was chosen specifically because it renders Hangul and Latin with equal care — rounded, warm, legible at body sizes. The site must never feel like a "Korean translation was bolted on." Both scripts should appear native. This means: line heights that accommodate Hangul's taller character forms, no assumptions about text direction, and consistent visual rhythm whether a paragraph is in English, Korean, or mixed.

### 4. Visual restraint — every element earns its place

No decorative elements. No icons for the sake of icons. No color unless it encodes meaning (awards are tangerine, links are forest green, everything else is grayscale). Borders are used sparingly — a thin left-border accent on publication entries, a 1px divider between sections, nothing more. If removing an element doesn't reduce comprehension, the element shouldn't be there. The reference site (junhomyung.github.io) exemplifies this: its "controlled" feeling comes from what it *doesn't* have, not from what it adds.

### 5. Paper-like warmth

The porcelain background (#FFFEFC) is deliberately off-white — warmer than a screen's default #FFFFFF, evoking the feel of quality uncoated paper. The carbon text (#1B1B1B) is softer than true black. The walnut accent (#704214) grounds the palette in natural warmth. Together these should make the site feel like a physical object — a printed page, a well-bound thesis — rather than a glowing screen. Avoid anything that breaks this illusion: harsh color contrasts, neon highlights, pure black on pure white.

---

## Coding Preferences

### General approach: well-structured, separated concerns

The owner prefers clear organization over minimal file count. Having a dedicated SCSS partial per page (`_home.scss`, `_publications.scss`) is better than one monolithic stylesheet, even if some partials are small. Hugo partials should be used for any HTML block that appears in more than one template. Data files should be separate from templates — content in `data/`, rendering logic in `layouts/`, styling in `assets/scss/`.

### Specific conventions

- **File organization over cleverness.** A 20-line partial that's easy to find and understand is better than a 5-line template that uses three levels of nested `partial` calls. Name files descriptively: `publication-entry.html` not `pub.html`
- **SCSS structure.** One `_variables.scss` as the single source of truth for all design tokens. Component partials import nothing — they rely on variables being available via the main entry point's import order. BEM-lite naming: `.publication-entry`, `.publication-entry__title`, `.filter-tab--active`
- **Go templates.** The owner finds Go template syntax unpleasant (the `{{ }}` verbosity was explicitly called out). Mitigate this by: keeping templates short and well-commented, extracting repeated logic into partials, using `with` blocks to reduce dot-context confusion, and adding a brief comment at the top of each template file explaining what it renders and what data it expects
- **JavaScript.** Absolute minimum. Vanilla only, no build step, no modules. If a behavior can be achieved with CSS (`:target`, `<details>`, `:hover`), use CSS. JS is reserved strictly for: (1) publication filter tabs, (2) mobile nav toggle, (3) image lightbox. Total JS should fit in a single file, kept minimal (~55 lines)
- **Content authoring.** Blog posts are written in a local Markdown editor (Obsidian or Typora), committed to git, and pushed. The workflow is: write → preview locally with `hugo server` → push to main → GitHub Actions deploys automatically. No CMS, no admin panel, no build-time API calls
- **Git discipline.** Conventional commits: `feat:` for new features/pages, `content:` for new blog posts or data updates, `style:` for CSS changes, `fix:` for bugs, `chore:` for config/tooling. One logical change per commit

---

## Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| **Static site generator** | Hugo (Extended edition) | Required for built-in Sass compilation |
| **Template engine** | Go templates | Hugo's native template system |
| **Styling** | Sass (SCSS) + minimal utility classes | Hugo Extended compiles Sass natively — no Node.js, no Tailwind, no PostCSS. Write well-structured SCSS with custom utility classes only where repetition justifies them |
| **Content format** | Markdown with YAML frontmatter | All content lives in `content/` as `.md` files |
| **Data files** | YAML (for structured data: publications, news, CV) | Stored in `data/` directory, rendered via Go templates |
| **Deployment** | GitHub Pages via GitHub Actions | Static output from `hugo --minify`, deployed on push to `main` |
| **Local writing** | Any Markdown editor (Obsidian, Typora recommended) | WYSIWYG preview; files committed and pushed manually via git |
| **JavaScript** | Vanilla JS only, minimal | Only for: publication filter tabs, mobile nav toggle, image lightbox. No frameworks, no build step |

### Explicit non-goals
- No hosted/third-party CMS (Decap, Forestry, etc.) — content is managed via git,
  edited directly or through the local `cms-server.py` dashboard
- No JavaScript framework (React, Svelte, etc.)
- No Tailwind CSS or PostCSS pipeline
- No Node.js dependency whatsoever — the build is Hugo binary only
- No user accounts, authentication, or comments system
- No database

---

## Design Reference

**Primary reference site:** [junhomyung.github.io](https://junhomyung.github.io/)

Borrow the following design patterns from this reference:

### Layout patterns to replicate
1. **Home page structure:** Profile photo (left) + name, affiliation, one-liner, and short bio paragraph (right). Below: selected publications grouped by numbered research themes (01, 02, 03), then a compact news section, then a condensed CV section
2. **Sticky top navigation bar:** Logo/name on left, 4–5 nav links on right. Thin bottom border. Active link is visually distinct (darker text, font-weight medium)
3. **Publications page:** Filter pill tabs at top (All / Conference / Workshop / Journal / Preprint). Publications grouped by year (descending). Each entry has: title, authors (owner's name bolded), venue, type badge, optional award badge, and external link buttons (Paper, Code, Data, Project Website)
4. **News page:** Simple chronological list with date, emoji/icon, and description with inline links
5. **CV page:** Structured sections — Education, Awards, Academic Service, Teaching. Clean typographic hierarchy. Option to link a downloadable PDF
6. **Blog (addition):** Blog index page with posts listed by date (descending). Individual blog post pages with title, date, tags, and prose content. This does NOT exist on the reference site — it is a new addition

### Visual characteristics to replicate
- **Typography-first design:** Content density is controlled by generous whitespace, not by visual decoration
- **Sparse color usage:** Near-monochrome with one accent color for awards/highlights
- **Thin borders:** 1px borders for separators, card-like left-border accents on publication entries
- **Pill-shaped filter buttons:** Rounded-full, small text, toggling between filled (active) and outlined (inactive)
- **External link buttons:** Tiny pill buttons with inline SVG icons (paper, GitHub, HuggingFace, globe)
- **No cards, no shadows, no gradients:** Flat design throughout
- **Constrained content width:** ~1024px max-width container, generous horizontal padding

---

## Custom Specifications (Override Reference)

### Typography

| Role | Font | Fallback | Weight |
|---|---|---|---|
| **Primary (body, headings, nav, UI)** | Chiron GoRound TC | Roboto, sans-serif | 400 (regular), 500 (medium), 700 (bold) |
| **Monospace (code blocks)** | System monospace stack | — | 400 |

Load Chiron GoRound TC and Roboto from Google Fonts:
```html
<link href="https://fonts.googleapis.com/css2?family=Chiron+GoRound+TC:wght@400;500;700&family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
```

Note: Chiron GoRound TC supports both Korean (Hangul) and Latin scripts — the site may contain bilingual content.

### Color Palette

| Token | Name | Hex | Usage |
|---|---|---|---|
| `$forest` | Forest Green | `#228B22` | Primary brand color. Headings, nav links, text links, active states |
| `$carbon` | Carbon Black | `#1B1B1B` | Primary body text color |
| `$porcelain` | Porcelain | `#FFFEFC` | Page background |
| `$walnut` | Walnut | `#704214` | Warm accent. Used for scholarly/subtle highlights — tags, section labels, borders |
| `$tangerine` | Vivid Tangerine | `#FF8000` | Hot accent. Used sparingly for awards, call-to-action hover states, important badges |

**Color rules:**
- Background is always `$porcelain`, never pure white
- Body text is always `$carbon`, never pure black
- Links are `$forest` with `$forest` darker shade on hover
- Award badges use `$tangerine` text
- Publication type badges use `$walnut` toned background with `$walnut` darker text
- Tag pills on blog posts use `$forest` light background with `$forest` text
- Borders and dividers are `$carbon` at ~10% opacity
- No colored backgrounds on large surfaces — the site should feel paper-like

### Responsive Behavior

- **Desktop (≥1024px):** Constrained `max-width: 1024px` centered container, ~40px horizontal padding. Home page profile section is two-column (photo left, bio right)
- **Tablet (640–1023px):** Same layout, slightly tighter padding (~24px). Profile section stacks to single column
- **Mobile (<640px):** Single column. Hamburger menu for navigation (slide-in or dropdown). Profile photo centered above bio. Full-width content. All font sizes remain the same (no shrinking) — whitespace adjusts instead

---

## Content Architecture

### URL Scheme

```
/                    → Home (about + selected publications + news + CV summary)
/publications/       → Full publications list with filters
/blog/               → Blog index (all posts, reverse chronological)
/blog/{filename}/    → Individual blog post (slug derived from filename)
/news/               → Full news timeline
/cv/                 → Full CV page
```

All URLs use trailing slashes (Hugo default). No custom slug overrides needed — filenames determine paths.

### Hugo Directory Structure

```
my-portfolio/
├── hugo.toml                      # Site configuration
├── archetypes/
│   ├── default.md                 # Fallback archetype
│   └── blog.md                    # Blog post archetype with frontmatter template
├── content/
│   ├── _index.md                  # Home page content (bio text, one-liner)
│   ├── publications.md            # Publications page (renders data/publications.yml)
│   ├── news.md                    # News page (renders data/news.yml)
│   ├── cv.md                      # CV page (renders data/cv.yml)
│   └── blog/
│       ├── _index.md              # Blog section index
│       └── 2024-modular-gnn.md    # Example blog post
├── data/
│   ├── publications.yml           # Structured publication records
│   ├── news.yml                   # News/announcement entries
│   ├── cv.yml                     # CV structured data (education, awards, service, teaching)
│   └── research_tracks.yml        # Numbered research theme clusters for the home page
├── layouts/
│   ├── _default/
│   │   ├── baseof.html            # Root HTML shell (head, nav, footer)
│   │   ├── single.html            # Default single page template
│   │   └── list.html              # Default list template
│   ├── index.html                 # Home page template
│   ├── blog/
│   │   ├── single.html            # Blog post template
│   │   └── list.html              # Blog index template
│   ├── partials/
│   │   ├── head.html              # <head> meta, fonts, styles
│   │   ├── nav.html               # Sticky top navigation bar
│   │   ├── footer.html            # Footer
│   │   ├── publication-entry.html # Single publication entry (reused in home + publications page)
│   │   ├── news-entry.html        # Single news item
│   │   └── cv-section.html        # CV subsection renderer
│   └── shortcodes/
│       └── accordion.html         # Expandable <details> component for occasional use in blog posts
├── assets/
│   └── scss/
│       ├── main.scss              # Entry point — imports partials
│       ├── _variables.scss        # Color tokens, font stacks, spacing scale
│       ├── _base.scss             # Reset, body, typography defaults
│       ├── _layout.scss           # Container, grid, responsive breakpoints
│       ├── _nav.scss              # Navigation bar styles
│       ├── _home.scss             # Home page specific styles
│       ├── _publications.scss     # Publications page + filter tabs
│       ├── _blog.scss             # Blog index + blog post styles
│       ├── _cv.scss               # CV page styles
│       └── _components.scss       # Shared components: pills, badges, buttons, accordion
├── static/
│   ├── images/
│   │   └── profile.jpg            # Profile photo (placeholder)
│   ├── cv.pdf                     # Downloadable CV PDF (placeholder)
│   └── .nojekyll                  # Prevents GitHub Pages from using Jekyll
└── .github/
    └── workflows/
        └── deploy.yml             # GitHub Actions: hugo build → deploy to GitHub Pages
```

### Data Models

**data/publications.yml:**
```yaml
- title: "Paper Title Here"
  authors: "Author A*, 2ood*, Author B"  # Owner's name should be matchable for bolding
  venue: "NeurIPS"
  year: 2024
  type: "Conference"  # One of: Conference, Workshop, Journal, Preprint
  award: "Best Paper"  # Optional — omit if none
  paperUrl: "https://..."
  codeUrl: ""  # Empty string if not available
  dataUrl: ""
  projectUrl: ""
```

**data/news.yml:**
```yaml
- date: 2024-12-09
  icon: "🇨🇦"  # Emoji or short icon string
  text: "Attending NeurIPS 2024 to present [BLEnD](https://...)."
  # text field supports inline Markdown links — render with markdownify
```

**data/research_tracks.yml:**
```yaml
# Placeholder — replace with actual research themes
# The owner's actual work spans ML algorithm design (GNN training, crystallization dynamics)
# and NLP/linguistics (word embeddings, semantic representation).
# Blog posts may touch on philosophy of science (Heisenberg, Bohr, Einstein).
- num: "01"
  title: "Research Theme Title"
  description: "One-sentence description of this research direction."
  papers:
    - title: "Paper Title"
      venue: "NeurIPS 2024"
      url: "https://..."
      award: "Best Paper · Workshop 2024"  # Optional
```

**data/cv.yml:**
```yaml
education:
  - institution: "GIST (Gwangju Institute of Science and Technology)"
    degree: "M.S., Department of AI"
    advisor: "Prof. Someone"
    period: "Mar 2023 – Present"

awards:
  - title: "Award Name"
    year: 2024

service:
  - role: "Reviewer"
    detail: "ARR (2025), Workshop (2024)"

teaching:
  - course: "Course Name (CS101)"
    role: "Teaching Assistant"
    institution: "GIST"
    period: "2024"
```

**content/blog/ frontmatter (archetype: archetypes/blog.md):**
```yaml
---
title: "{{ replace .File.ContentBaseName `-` ` ` | title }}"
date: {{ .Date }}
tags: []
draft: true
description: ""
---
```

### Taxonomies

Configure in `hugo.toml`:
```toml
[taxonomies]
  tag = "tags"
```

Tags are used only on blog posts. Each tag auto-generates a listing page at `/tags/{tag}/`.

---

## Page-by-Page Specification

### Home Page (`/`)

Renders `layouts/index.html`. Content from `content/_index.md` (bio) + `data/research_tracks.yml` + `data/news.yml` + `data/cv.yml`.

**Sections in order:**

1. **Hero/Profile section**
   - Two-column on desktop: circular profile photo (left, ~150px), name + affiliation + one-liner + bio paragraph + contact/social icon links (right)
   - Social links as small icon buttons: email, Google Scholar, GitHub, LinkedIn, CV PDF download
   - Stacks vertically on mobile (photo centered above text)

2. **Selected Publications** (heading: "Selected Publications")
   - Rendered from `data/research_tracks.yml`
   - Each track: large muted number (01, 02, 03), bold track title, description paragraph, then list of papers belonging to that track
   - Each paper: linked title, venue + year, optional award badge in `$tangerine`
   - "See all publications →" link at bottom

3. **News** (heading: "News")
   - Latest 5 entries from `data/news.yml`
   - Each: date (left, muted), icon + text with inline links (right)
   - "See all news →" link at bottom

4. **CV Summary** (heading: "CV")
   - Condensed version: Education entries + Awards list only
   - Each education entry: institution, degree, advisor, period
   - Link to full `/cv/` page

### Publications Page (`/publications/`)

Renders via `content/publications.md` with a custom layout override or a dedicated `layouts/publications/single.html`.

**Features:**
- **Filter tabs at top:** Pill-shaped buttons: All, Conference, Workshop, Journal, Preprint
  - Active tab: `$carbon` background, white text
  - Inactive tab: light gray background, muted text, hover to darker
  - Filtering is client-side vanilla JS: each publication entry has a `data-type` attribute; JS toggles visibility via a CSS class
- **Publications grouped by year:** Year heading (large, muted, uppercase tracking), then entries below
- **Each publication entry:**
  - Left border accent (2px, light gray)
  - Title (body text size, dark)
  - Authors line (small, muted italic, owner's name bolded and non-italic)
  - Venue + type badge (inline pill: small, `$walnut`-toned)
  - Award line if present (small, `$tangerine`, with 🏆 prefix)
  - External link buttons row: Paper, Code, Data, Project Website — each a tiny pill with inline SVG icon. Only render buttons for non-empty URLs

### Blog Index (`/blog/`)

Renders `layouts/blog/list.html`.

**Features:**
- Page title: "Blog"
- Reverse-chronological list of posts
- Each entry: date (muted), title (linked, `$forest`), description/summary line, tag pills
- Simple, no cards — each entry separated by whitespace or a thin divider

### Blog Post (`/blog/{slug}/`)

Renders `layouts/blog/single.html`.

**Features:**
- Title (large heading)
- Date + reading time + tag pills below title
- Prose content with good typographic defaults (line-height 1.7, ~65ch max-width for readability)
- Markdown rendering: headings, paragraphs, lists, code blocks (with syntax highlighting via Hugo's built-in Chroma), blockquotes, images, links, tables
- Shortcode available: `{{< accordion title="..." >}}...{{< /accordion >}}`
- No sidebar, no table of contents (keep it minimal). ToC can be added later if needed

### News Page (`/news/`)

Full list of all news items from `data/news.yml`, rendered chronologically (newest first). Same layout as the home page news section but with all entries, not just 5.

### CV Page (`/cv/`)

Full academic CV rendered from `data/cv.yml`. Sections: Education, Awards, Academic Service, Teaching. Optional "Open PDF" link at top (linking to `/cv.pdf` in static/).

---

## Hugo Configuration

**hugo.toml:**
```toml
baseURL = "https://USERNAME.github.io/"
languageCode = "en"
title = "Your Name"
theme = ""  # No external theme — custom layouts

[taxonomies]
  tag = "tags"

[markup]
  [markup.highlight]
    style = "github"
    lineNos = false
    noClasses = false
  [markup.goldmark]
    [markup.goldmark.renderer]
      unsafe = true  # Allow raw HTML in markdown if needed

[params]
  description = "AI Researcher at GIST"
  profileImage = "/images/profile.jpg"
  email = "your@email.com"
  googleScholar = "https://scholar.google.com/..."
  github = "https://github.com/..."
  linkedin = "https://linkedin.com/in/..."
  cvPdf = "/cv.pdf"
```

---

## GitHub Actions Deployment

**.github/workflows/deploy.yml:**
```yaml
name: Deploy Hugo to GitHub Pages
on:
  push:
    branches: [main]
  workflow_dispatch: {}

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/configure-pages@v5
      - uses: peaceiris/actions-hugo@v2
        with:
          hugo-version: 'latest'
          extended: true
      - run: hugo --minify
      - uses: actions/upload-pages-artifact@v3
        with:
          path: ./public

  deploy:
    runs-on: ubuntu-latest
    needs: build
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/deploy-pages@v4
```

---

## Implementation Milestones

### Milestone 1: Foundation
- [ ] Initialize Hugo project structure (all directories, hugo.toml)
- [ ] Create SCSS architecture (_variables, _base, _layout) with color tokens and font imports
- [ ] Build `baseof.html` with head partial (meta, fonts, compiled SCSS) and footer
- [ ] Build sticky nav bar (responsive, hamburger on mobile)
- [ ] Verify the site builds and serves locally with `hugo server`

### Milestone 2: Home Page
- [ ] Create `layouts/index.html` with profile hero section
- [ ] Create `data/research_tracks.yml` with placeholder data
- [ ] Build research tracks section (numbered clusters with paper entries)
- [ ] Create `data/news.yml` with placeholder data and render latest 5
- [ ] Create `data/cv.yml` and render condensed CV section
- [ ] Add social icon links in the profile section

### Milestone 3: Publications Page
- [ ] Create `data/publications.yml` with placeholder entries covering all types
- [ ] Build publications page layout with year grouping
- [ ] Build filter tab UI (pills) and vanilla JS filtering logic
- [ ] Build publication entry partial with author bolding, venue badge, award badge, link buttons
- [ ] Verify filter state persists correctly (All / Conference / Workshop / Journal / Preprint)

### Milestone 4: Blog
- [ ] Create blog archetype (`archetypes/blog.md`)
- [ ] Build blog list layout (reverse chronological, with tags)
- [ ] Build blog single layout (prose typography, syntax highlighting, reading time)
- [ ] Build accordion shortcode
- [ ] Create 1–2 placeholder blog posts to test rendering
- [ ] Configure tag taxonomy and verify `/tags/{tag}/` pages generate

### Milestone 5: Supporting Pages + Deploy
- [ ] Build full news page
- [ ] Build full CV page with all sections
- [ ] Add GitHub Actions deploy workflow
- [ ] Add `.nojekyll` file to static/
- [ ] Add `robots.txt` and basic SEO meta tags (og:title, og:description, og:image)
- [ ] Test full build and deployment to GitHub Pages
- [ ] Responsive QA across mobile, tablet, desktop viewports

### Milestone 6: Polish (deferred)
- [ ] Dark mode support (optional, not required for v1)
- [ ] RSS feed for blog
- [ ] Sitemap generation
- [ ] 404 page
- [ ] Performance audit (image optimization, font subsetting)
- [ ] Integrate a git-backed CMS like Decap (optional, only if writing workflow demands it)

---

## Coding Conventions (Quick Reference)

See **Coding Preferences** section above for the philosophy behind these rules.

- **SCSS:** BEM-lite naming. Max 2 levels of nesting. All colors via `$variables`, never hardcoded hex in component files. One partial per page/component
- **Go templates:** Use `partial` for reusable HTML. Use `range` + `where` for data filtering. Use `markdownify` for inline Markdown from data files. Add a comment header to every template explaining its purpose and expected data
- **JavaScript:** Vanilla only. Single file `static/js/main.js`. No bundler. Kept minimal (~55 lines). Three behaviors: publication filter tabs + mobile nav toggle + image lightbox
- **Content files:** Blog posts in `kebab-case` with optional date prefix: `2024-11-modular-gnn.md`. Data files in YAML (not JSON, not TOML)
- **Git commits:** `feat:`, `fix:`, `chore:`, `content:`, `style:`
- **Zero external dependencies** beyond Hugo Extended binary and Google Fonts CDN
