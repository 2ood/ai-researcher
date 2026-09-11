/* Content Dashboard — static, no backend.
 * Authenticates with a GitHub fine-grained PAT (stored in localStorage) and
 * commits content directly to the repo via the GitHub Contents API.
 * Manages: blog posts (content/blog/*.md) and data files (data/*.yml).
 */

// ---- Repository config ----------------------------------------------------
// When served from GitHub Pages (https://<owner>.github.io/<repo>/admin/), detect
// the owner/repo from the URL so the deployed dashboard works without editing this
// file. Falls back to the constants below for custom domains or other hosts.
const _gh = (function () {
  var m = location.hostname.match(/^([^.]+)\.github\.io$/);
  if (!m) return null;
  var seg = location.pathname.split('/').filter(Boolean); // e.g. ['repo','admin']
  var i = seg.indexOf('admin');
  return { owner: m[1], repo: i > 0 ? seg[i - 1] : m[1] + '.github.io' };
})();
const OWNER = _gh ? _gh.owner : 'username';   // fallback for custom domains / local
const REPO = _gh ? _gh.repo : 'your-repo';
const BRANCH = 'main';
const API = 'https://api.github.com';
const TOKEN_KEY = 'gh_token';
const TOKEN_EXP_KEY = 'gh_token_exp';
const TOKEN_TTL_MS = 2 * 24 * 60 * 60 * 1000; // localStorage token self-expires after 2 days

// ---- Per-session branch (GitHub mode only) ---------------------------------
// Multiple managers can have the dashboard open at once; committing straight to
// BRANCH would race on one shared ref. Instead each browser tab gets its own
// "dashboard/<id>" branch (id in sessionStorage, so a reload resumes the same
// branch but a closed tab starts fresh) - edits land there, not on BRANCH, until
// a PR is merged. See ensureSessionBranch/pushToBranch/ensurePr below.
const SESSION_BRANCH_KEY = 'dashboard_session_branch';
const AUTOSAVE_DEBOUNCE_MS = 10000;

// ---- Site config ----------------------------------------------------------
// PALETTES must match the named palettes in assets/scss/_theme.scss.
const PALETTES = ['forest', 'slate', 'crimson', 'plum'];
const PARAMS_FILE = 'config/_default/params.yaml';
const HUGO_FILE = 'config/_default/hugo.toml';
const SECTION_KEYS = ['research', 'publications', 'blog', 'news', 'cv'];

// Strings from i18n/en.toml, duplicated here since the full-page preview
// overlay replicates the deployed page chrome and can't run Hugo's i18n.
const SITE_STRINGS = { nav_home: 'Home', nav_research: 'Research', nav_publications: 'Publications', nav_blog: 'Blog', nav_news: 'News', nav_cv: 'CV', min_read: 'min read' };
function siteT(key) { return SITE_STRINGS[key] || key; }

// ---- Dashboard chrome strings ----------------------------------------------
const STRINGS = {
  brand: 'Content Dashboard',
  login_help: 'Paste a GitHub fine-grained personal access token with Contents: Read and write AND Pull requests: Read and write permission on this repository (the second is needed to open the PR your edits land in). It is stored only in this browser (localStorage) and never leaves it except to call the GitHub API.',
  authorize: 'Authorize with GitHub',
  authorize_hint: 'Opens GitHub to create a repo-scoped token, then paste it below.',
  connect: 'Connect', repository: 'Repository', signout: 'Sign out', view_site: 'View site ↗',
  tab_blog: 'Blog', tab_research_interests: 'Interests', tab_publications: 'Publications',
  tab_news: 'News', tab_cv: 'CV', tab_settings: 'Settings',
  h_blog: 'Blog', h_research_interests: 'Research Interests', h_publications: 'Publications',
  h_news: 'News', h_cv: 'CV', h_settings: 'Site Settings',
  loading: 'Loading…', save_changes: 'Save changes', save_settings: 'Save settings',
  new_post: 'New post', new_interest: 'New interest', edit: 'Edit', delete: 'Delete',
  back: '← Back', cancel: 'Cancel',
  new_post_title: 'New post', edit_post_title: 'Edit post', create_post: 'Create post', save_post: 'Save post',
  new_interest_title: 'New interest', edit_interest_title: 'Edit interest',
  create_interest: 'Create interest', save_interest: 'Save interest',
  no_posts: 'No posts yet. Create your first one.',
  no_interests: 'No interests yet. Create your first one.',
  f_title: 'Title', f_filename: 'Filename (slug, no .md)', f_filename_ph: 'auto from title',
  f_date: 'Date', f_tags: 'Tags (comma-separated)', f_draft: 'Draft', f_description: 'Description',
  f_body: 'Body (Markdown)', i_summary: 'Summary (shown on home)',
  i_details: 'Details (markdown, shown on the dedicated page)',
  md_source_label: 'Markdown source', md_preview_label: 'Live preview',
  md_body_ph: 'Write Markdown here…',
  preview_open: 'Open preview', preview_close: 'Close preview',
  settings_note_a: 'Edits', settings_note_b: '. Your name (site title) and baseURL live in',
  settings_note_c: 'and are edited by hand. Saving rewrites the file and drops its comments.',
  s_sections_head: 'Sections (navigation & home)', color_palette: 'Color palette',
  s_description: 'Affiliation / description (shown under your name)', s_tagline: 'Tagline (one-liner)',
  s_favicon: 'Favicon emoji', s_profile: 'Profile image path', s_email: 'Email',
  s_scholar: 'Google Scholar URL', s_github: 'GitHub URL', s_linkedin: 'LinkedIn URL', s_cvpdf: 'CV PDF path',
  saved: 'Saved', save_failed: 'Save failed', deleted: 'Deleted', delete_failed: 'Delete failed',
  title_required: 'Title is required', no_filename: 'Could not derive a filename — set one manually',
  image_uploaded: 'Image uploaded', image_failed: 'Image upload failed',
  local_mode: 'Local mode — saves commit to your local repo. Push when ready.',
  token_invalid: 'Saved token is no longer valid — please reconnect',
  connect_failed: 'Could not connect',
  confirm_delete: 'Delete', confirm_delete_tail: '? This commits a change to the repo.',
  staged: 'Staged — {n} pending', commit_pending: 'Commit ({n})',
  committing: 'Committing…', committed: 'Committed {n} change(s)', commit_failed: 'Commit failed',
  committed_pr: 'Committed {n} change(s) - opened a pull request',
  committed_no_pr: 'Committed {n} change(s) to your branch, but could not open a pull request',
  pr_link: 'PR #{n}', pr_link_manual: 'Open PR manually',
  confirm_signout_pending: 'You have {n} uncommitted change(s). Sign out and discard them?',
};
function t(key) { return STRINGS[key] != null ? STRINGS[key] : key; }

// YAML: JSON schema keeps dates/ids as strings (no surprise Date objects) and ints as numbers.
const Y_SCHEMA = jsyaml.JSON_SCHEMA;
const Y_DUMP = { schema: Y_SCHEMA, lineWidth: -1, noRefs: true };

// ---- State ----------------------------------------------------------------
const state = {
  token: '',       // set from loadToken() in init()
  local: false,    // true when served by cms-server.py (commits locally, no token)
  section: 'blog',
  model: null,     // parsed YAML for the active data file
  sha: null,       // sha of the active file (data editor or blog post)
  path: null,      // path of the active file
  interestTitles: [], // interest titles, for the publications "interest" dropdown
  interests: [],   // parsed research_interests.yml list (interests editor)
  interestsSha: null, // sha of research_interests.yml
  settings: null,  // parsed config/_default/params.yaml (settings editor)
  settingsSha: null,
  pending: new Map(), // staged edits: path -> {op:'put'|'delete', text, message}. Flushed as ONE commit.
  siteTitle: null, // hugo.toml title, for the preview overlay's nav brand + footer (lazy-loaded)
  previewKind: null, // 'blog' | 'interest' | null - which article the open preview overlay shows
  sessionBranch: null, // GitHub mode only: this tab's "dashboard/<id>" branch, once created
  prUrl: null,     // confirmed open PR for sessionBranch, once one exists
  prNumber: null,
  savingInFlight: false, // guards autosave and the explicit Commit button from racing each other
};

function dataPath(name) { return `data/${name}`; }

// ---- Elements -------------------------------------------------------------
const el = {
  login: document.getElementById('login'),
  app: document.getElementById('app'),
  tokenInput: document.getElementById('token-input'),
  connectBtn: document.getElementById('connect-btn'),
  loginError: document.getElementById('login-error'),
  repoLabel: document.getElementById('repo-label'),
  signout: document.getElementById('signout-btn'),
  nav: document.getElementById('section-nav'),
  commitBtn: document.getElementById('commit-btn'),
  view: document.getElementById('view'),
  toast: document.getElementById('toast'),
  authorizeBtn: document.getElementById('authorize-btn'),
  themeToggle: document.getElementById('theme-toggle'),
  favicon: document.getElementById('favicon'),
  previewOverlay: document.getElementById('preview-overlay'),
  previewContent: document.getElementById('preview-overlay-content'),
  previewClose: document.getElementById('preview-close'),
  prLink: document.getElementById('pr-link'),
};

// ---- Utilities ------------------------------------------------------------
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
function slugify(s) {
  return String(s).toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}
function toBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  bytes.forEach(b => { bin += String.fromCharCode(b); });
  return btoa(bin);
}
function fromBase64(b64) {
  const bin = atob((b64 || '').replace(/\s/g, ''));
  const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
let toastTimer;
function toast(msg, kind) {
  el.toast.textContent = msg;
  el.toast.className = 'toast ' + (kind ? 'toast--' + kind : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.toast.classList.add('hidden'), 3200);
}

// ---- Dashboard chrome: i18n, theme, palette, favicon ----------------------
// Fill every [data-i18n] element with its string.
function applyI18n() {
  document.querySelectorAll('[data-i18n]').forEach(node => {
    node.textContent = t(node.dataset.i18n);
  });
  refreshDirty(); // the Commit button's label is dynamic (count), not [data-i18n]
}

// Light/dark theme — shares the site's 'theme' localStorage key for consistency.
function syncThemeIcon() {
  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  const icon = el.themeToggle && el.themeToggle.querySelector('.theme-toggle__icon');
  if (icon) icon.textContent = dark ? '☀' : '☾'; // shows the mode you'd switch TO
}
function toggleTheme() {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  try { localStorage.setItem('theme', next); } catch (e) {}
  syncThemeIcon();
}

function setFavicon(emoji) {
  if (el.favicon && emoji) {
    el.favicon.href = 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 ' +
      'viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>' + emoji + '</text></svg>';
  }
}

// After auth, read params.yaml to mirror the site's favicon + palette in the admin.
async function loadSiteChrome() {
  try {
    const { text } = await getFile(PARAMS_FILE);
    const p = jsyaml.load(text, { schema: Y_SCHEMA }) || {};
    if (p.faviconEmoji) setFavicon(p.faviconEmoji);
    if (PALETTES.includes(p.palette)) document.documentElement.setAttribute('data-palette', p.palette);
  } catch (e) { /* non-fatal: keep the defaults already in the page */ }
  try {
    const { text } = await getFile(HUGO_FILE);
    const m = text.match(/(?:^|\n)title\s*=\s*"(.*?)"/);
    state.siteTitle = m ? m[1] : '';
  } catch (e) { state.siteTitle = ''; } // non-fatal: nav brand / footer just render blank
}

// "Authorize with GitHub": deep-link to GitHub's fine-grained token page,
// pre-filled with a name/description. (A static site can't run the OAuth secret
// exchange, so the user generates a scoped token and pastes it back.)
function openAuthorize() {
  const desc = `Content Dashboard for ${OWNER}/${REPO} — Contents: Read and write, Pull requests: Read and write`;
  const url = 'https://github.com/settings/personal-access-tokens/new?name=' +
    encodeURIComponent(`${REPO}-dashboard`) + '&description=' + encodeURIComponent(desc);
  window.open(url, '_blank', 'noopener');
  el.tokenInput.focus();
}

// ---- GitHub API -----------------------------------------------------------
async function gh(method, path, body) {
  const res = await fetch(API + path, {
    method,
    headers: {
      'Authorization': 'Bearer ' + state.token,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let detail = res.statusText;
    try { detail = (await res.json()).message || detail; } catch (e) {}
    throw new Error(detail + ' (HTTP ' + res.status + ')');
  }
  return res.status === 204 ? null : res.json();
}
const contentPath = p => `/repos/${OWNER}/${REPO}/contents/${p}`;

// Reads come from this tab's session branch once one exists (so the editor
// reflects edits already pushed there), otherwise from BRANCH as normal.
function activeBranch() { return state.sessionBranch || BRANCH; }

// ---- Local backend (cms-server.go) ----------------------------------------
// When the page is served by the local Go backend, saves commit to the local
// git repo instead of pushing to GitHub. state.local is set in init() after a
// /api/ping probe; when false, every function below falls back to the GitHub API.
async function localApi(method, path, body) {
  const res = await fetch(path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let detail = res.statusText;
    try { detail = (await res.json()).error || detail; } catch (e) {}
    throw new Error(detail + ' (HTTP ' + res.status + ')');
  }
  return res.status === 204 ? null : res.json();
}

// Reads overlay the staging area so the editor always reflects uncommitted work:
// a staged edit shows its pending text, a staged delete reads as "not found", and
// a staged new file appears in (or a staged delete disappears from) its directory.
async function listDir(dir) {
  const items = state.local
    ? await localApi('GET', '/api/list?dir=' + encodeURIComponent(dir))
    : await gh('GET', contentPath(dir) + '?ref=' + activeBranch());
  const prefix = dir.replace(/\/$/, '') + '/';
  const byName = new Map(items.map(it => [it.name, it]));
  for (const [path, p] of state.pending) {
    if (!path.startsWith(prefix)) continue;
    const name = path.slice(prefix.length);
    if (name.includes('/')) continue; // direct children only
    if (p.op === 'delete') byName.delete(name);
    else if (!byName.has(name)) byName.set(name, { type: 'file', name, path, sha: 'staged' });
  }
  return Array.from(byName.values());
}
async function getFile(path) {
  const p = state.pending.get(path);
  if (p) {
    if (p.op === 'delete') throw new Error('not found (staged for deletion)');
    return { text: p.text, sha: 'staged' };
  }
  if (state.local) {
    const d = await localApi('GET', '/api/get?path=' + encodeURIComponent(path));
    return { text: d.text, sha: d.sha };
  }
  const data = await gh('GET', contentPath(path) + '?ref=' + activeBranch());
  return { text: fromBase64(data.content), sha: data.sha };
}

// ---- Staging + bulk commit ------------------------------------------------
// Editors stage their edits here instead of committing one-per-save; the global
// nav Commit button flushes the whole set as a SINGLE commit (see flushPending).
// GitHub mode also schedules a debounced autosave to this tab's session branch,
// so a crash/reload never loses more than AUTOSAVE_DEBOUNCE_MS of work.
function stagePut(path, text, message) {
  state.pending.set(path, { op: 'put', text, message });
  refreshDirty();
  scheduleAutosave();
}
function stageDelete(path, message) {
  state.pending.set(path, { op: 'delete', message });
  refreshDirty();
  scheduleAutosave();
}
function refreshDirty() {
  if (!el.commitBtn) return;
  const n = state.pending.size;
  el.commitBtn.classList.toggle('hidden', n === 0);
  el.commitBtn.disabled = n === 0;
  el.commitBtn.textContent = t('commit_pending').replace('{n}', n);
}
// Toast shown after an editor stages an edit (instead of the old "Saved").
function stagedMsg() { return t('staged').replace('{n}', state.pending.size); }

function buildCommitMessage(entries) {
  const n = entries.length;
  const subject = `content(admin): dashboard edits (${n} file${n === 1 ? '' : 's'})`;
  const lines = entries.map(([path, p]) => `- ${p.op === 'delete' ? 'delete' : 'update'} ${path}`);
  return subject + '\n\n' + lines.join('\n');
}

// Local backend: one /api/commit writes/removes every file and makes one commit.
async function commitLocal(entries, message) {
  const files = entries.map(([path, p]) =>
    p.op === 'delete' ? { path, op: 'delete' } : { path, op: 'put', text: p.text });
  await localApi('POST', '/api/commit', { message, files });
}

// GitHub: the Contents API is one-commit-per-file, so build a single commit by
// hand with the Git Data API — new tree off the base, then move the branch ref.
// Shared by autosave and the explicit Commit button; only the target branch and
// whether state.pending gets cleared differ between the two.
//
// The GET-then-PATCH window here has no server-side locking - the ref can move
// between reading its tip and moving it (e.g. an autosave landing moments before
// the explicit Commit reads it), which the Git Data API surfaces as a 422 "not a
// fast forward" on the final PATCH. That's an ordinary optimistic-concurrency
// conflict, not data loss - retry by re-reading the now-current tip and rebuilding
// on top of it, rather than surfacing a transient race as a hard failure.
const PUSH_RETRY_ATTEMPTS = 3;
async function pushToBranch(branch, entries, message) {
  const g = `/repos/${OWNER}/${REPO}/git`;
  for (let attempt = 1; ; attempt++) {
    const ref = await gh('GET', `${g}/ref/heads/${branch}`);
    const baseSha = ref.object.sha;
    const baseCommit = await gh('GET', `${g}/commits/${baseSha}`);
    const tree = entries.map(([path, p]) =>
      p.op === 'delete'
        ? { path, mode: '100644', type: 'blob', sha: null } // null sha removes the path
        : { path, mode: '100644', type: 'blob', content: p.text });
    const newTree = await gh('POST', `${g}/trees`, { base_tree: baseCommit.tree.sha, tree });
    const commit = await gh('POST', `${g}/commits`, { message, tree: newTree.sha, parents: [baseSha] });
    try {
      await gh('PATCH', `${g}/refs/heads/${branch}`, { sha: commit.sha });
      return;
    } catch (e) {
      if (!/not a fast forward/i.test(e.message) || attempt >= PUSH_RETRY_ATTEMPTS) throw e;
      // The ref moved since our GET above - back off briefly, then loop around
      // and rebuild on its new tip.
      await new Promise(resolve => setTimeout(resolve, 400 * attempt));
    }
  }
}

// Restores this tab's session branch name from sessionStorage (no network) - call
// at startup so reads resume from a prior reload's branch immediately. Does NOT
// create the branch; that only happens lazily, on first edit, in ensureSessionBranch.
function restoreSessionBranch() {
  if (state.local) return;
  const id = sessionStorage.getItem(SESSION_BRANCH_KEY);
  state.sessionBranch = id ? `dashboard/${id}` : null;
}
// Lazily creates this tab's "dashboard/<id>" branch off BRANCH's current tip, the
// first time it's needed. Idempotent - safe to call every time a save happens.
async function ensureSessionBranch() {
  if (state.local) return null;
  if (state.sessionBranch) return state.sessionBranch;
  let id = sessionStorage.getItem(SESSION_BRANCH_KEY);
  if (!id) {
    id = Math.random().toString(16).slice(2, 10);
    sessionStorage.setItem(SESSION_BRANCH_KEY, id);
  }
  const branch = `dashboard/${id}`;
  try {
    const ref = await gh('GET', `/repos/${OWNER}/${REPO}/git/ref/heads/${BRANCH}`);
    await gh('POST', `/repos/${OWNER}/${REPO}/git/refs`, { ref: `refs/heads/${branch}`, sha: ref.object.sha });
  } catch (e) {
    if (!/already exists/i.test(e.message)) throw e;
  }
  state.sessionBranch = branch;
  return branch;
}

// GET-only: populate state.prUrl/prNumber if an open PR already exists for
// `branch`, without creating one. Safe to call just to refresh the topbar link.
async function lookupPr(branch) {
  const found = await gh('GET',
    `/repos/${OWNER}/${REPO}/pulls?head=${encodeURIComponent(OWNER + ':' + branch)}&state=open`);
  if (found.length) { state.prUrl = found[0].html_url; state.prNumber = found[0].number; }
  return state.prUrl;
}
// Returns an open PR's URL for `branch`, creating one (branch -> BRANCH) if none
// exists yet. Only called from the explicit Commit flow, never from autosave -
// opening a PR is the "hand it to the master manager for review" signal.
async function ensurePr(branch) {
  if (state.prUrl) return state.prUrl;
  if (await lookupPr(branch)) return state.prUrl;
  const pr = await gh('POST', `/repos/${OWNER}/${REPO}/pulls`, {
    title: `Dashboard edits (${branch})`,
    head: branch,
    base: BRANCH,
    body: 'Opened automatically by the Content Dashboard - review and merge to publish.',
  });
  state.prUrl = pr.html_url;
  state.prNumber = pr.number;
  return state.prUrl;
}
function updatePrLink() {
  if (!el.prLink) return;
  if (state.prUrl) {
    el.prLink.href = state.prUrl;
    el.prLink.textContent = t('pr_link').replace('{n}', state.prNumber);
    el.prLink.classList.remove('hidden');
  } else {
    el.prLink.classList.add('hidden');
  }
}

// Debounced background save to the session branch: a recovery checkpoint, not a
// publish action - never touches BRANCH, never opens a PR, never clears pending.
// Failures retry quietly on the next edit; state.pending in this tab is still the
// primary copy, this is only the outer safety net against losing the tab itself.
let autosaveTimer = null;
function scheduleAutosave() {
  if (state.local) return;
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(autosaveTick, AUTOSAVE_DEBOUNCE_MS);
}
async function autosaveTick() {
  if (state.savingInFlight || state.pending.size === 0) return;
  state.savingInFlight = true;
  try {
    const branch = await ensureSessionBranch();
    const entries = Array.from(state.pending.entries());
    await pushToBranch(branch, entries, `autosave(admin): ${entries.length} pending change(s)`);
  } catch (e) {
    console.warn('autosave failed, will retry on next edit:', e.message);
  } finally {
    state.savingInFlight = false;
  }
}

async function flushPending() {
  const n = state.pending.size;
  if (!n || state.savingInFlight) return;
  const entries = Array.from(state.pending.entries());
  const message = buildCommitMessage(entries);
  state.savingInFlight = true;
  clearTimeout(autosaveTimer); // the push below already covers anything autosave would have
  el.commitBtn.disabled = true;
  toast(t('committing'));
  try {
    if (state.local) {
      await commitLocal(entries, message);
      state.pending.clear();
      refreshDirty();
      toast(t('committed').replace('{n}', n), 'ok');
    } else {
      const branch = await ensureSessionBranch();
      await pushToBranch(branch, entries, message);
      state.pending.clear();
      refreshDirty();
      try {
        await ensurePr(branch);
        updatePrLink();
        toast(t('committed_pr').replace('{n}', n), 'ok');
      } catch (e) {
        // Branch push already succeeded - the content is safe. Only the PR
        // failed (e.g. token missing the Pull requests permission), so offer a
        // manual fallback instead of hiding the failure inside a generic error.
        el.prLink.href = `https://github.com/${OWNER}/${REPO}/compare/${BRANCH}...${branch}?expand=1`;
        el.prLink.textContent = t('pr_link_manual');
        el.prLink.classList.remove('hidden');
        toast(t('committed_no_pr').replace('{n}', n) + ': ' + e.message, 'error');
      }
    }
    if (state.section) selectSection(state.section); // reload the view from committed state
  } catch (e) {
    refreshDirty(); // restore the button so the user can retry
    toast(t('commit_failed') + ': ' + e.message, 'error');
  } finally {
    state.savingInFlight = false;
  }
}

// ---- Token storage (localStorage with a short TTL) ------------------------
// The PAT is kept in localStorage so it survives reloads, but self-expires after
// TOKEN_TTL_MS, so a leaked browser profile only exposes it briefly. The PAT should
// also carry a short GitHub-side expiration as the primary safeguard.
function loadToken() {
  const exp = Number(localStorage.getItem(TOKEN_EXP_KEY) || 0);
  if (!exp || Date.now() > exp) { clearToken(); return ''; }
  return localStorage.getItem(TOKEN_KEY) || '';
}
function saveToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(TOKEN_EXP_KEY, String(Date.now() + TOKEN_TTL_MS));
}
function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXP_KEY);
}

// ---- Auth -----------------------------------------------------------------
async function validateToken() {
  // Throws if the token can't read the repo.
  await gh('GET', `/repos/${OWNER}/${REPO}`);
}
async function connect() {
  const token = el.tokenInput.value.trim();
  if (!token) return;
  state.token = token;
  el.connectBtn.disabled = true;
  el.loginError.classList.add('hidden');
  try {
    await validateToken();
    saveToken(token);
    showApp();
  } catch (e) {
    state.token = '';
    el.loginError.textContent = t('connect_failed') + ': ' + e.message;
    el.loginError.classList.remove('hidden');
  } finally {
    el.connectBtn.disabled = false;
  }
}
function signout() {
  if (state.pending.size > 0 &&
      !confirm(t('confirm_signout_pending').replace('{n}', state.pending.size))) return;
  state.pending.clear();
  refreshDirty();
  clearToken();
  state.token = '';
  el.tokenInput.value = '';
  // Don't let a different person signing in on this tab inherit this session's
  // branch/PR - their commits would land somewhere they don't own.
  sessionStorage.removeItem(SESSION_BRANCH_KEY);
  state.sessionBranch = null;
  state.prUrl = null;
  state.prNumber = null;
  updatePrLink();
  el.app.classList.add('hidden');
  el.login.classList.remove('hidden');
}

// ---- Path helpers (for data editors) --------------------------------------
function parsePath(str) {
  if (str === '') return [];
  return str.split('/').map(k => (/^\d+$/.test(k) ? Number(k) : k));
}
function getByPath(obj, path) {
  let c = obj;
  for (const k of path) { if (c == null) return undefined; c = c[k]; }
  return c;
}
function setByPath(obj, path, val) {
  let c = obj;
  for (let i = 0; i < path.length - 1; i++) c = c[path[i]];
  c[path[path.length - 1]] = val;
}

// ===========================================================================
//  Data-file editors (schema-driven)
// ===========================================================================
const PUB_TYPES = ['Conference', 'Workshop', 'Journal', 'Preprint'];

// Curated palette for the News icon picker (academic / announcement themed).
const EMOJIS = [
  '🎓', '🏆', '🥇', '📝', '📄', '📚', '💡', '🔬',
  '🧪', '🧠', '🤖', '📊', '📈', '🎉', '🎊', '✨',
  '🚀', '✈️', '🌍', '🌏', '📢', '📌', '🗓️', '⭐',
  '🔥', '💬', '🤝', '👥', '🏛️', '☕', '📰', '🎙️',
  '🇰🇷', '🇨🇦', '🇺🇸', '🇬🇧', '🇯🇵', '🇨🇳', '🇪🇺', '🇩🇪',
];

const EDITORS = {
  publications: {
    data: 'publications.yml', label: 'Publications', root: 'list',
    fields: [
      { key: 'title', type: 'text', label: 'Title' },
      { key: 'authors', type: 'text', label: 'Authors (wrap your name in **double asterisks** to bold)' },
      { key: 'venue', type: 'text', label: 'Venue' },
      { key: 'year', type: 'number', label: 'Year' },
      { key: 'type', type: 'select', label: 'Type', options: PUB_TYPES },
      { key: 'selected', type: 'checkbox', label: 'Show on home (Selected Publications)' },
      { key: 'interest', type: 'select', dynamicOptions: 'interests', label: 'Research interest (links this paper on the interest page)' },
      { key: 'award', type: 'text', label: 'Award (optional)' },
      { key: 'paperUrl', type: 'text', label: 'Paper URL' },
      { key: 'codeUrl', type: 'text', label: 'Code URL' },
      { key: 'dataUrl', type: 'text', label: 'Data URL' },
      { key: 'projectUrl', type: 'text', label: 'Project URL' },
      { key: 'abstract', type: 'textarea', label: 'Abstract / notes (optional, shown on the publication page)' },
    ],
  },
  news: {
    data: 'news.yml', label: 'News', root: 'list',
    fields: [
      { key: 'date', type: 'text', label: 'Date (YYYY-MM-DD)' },
      { key: 'icon', type: 'emoji', label: 'Icon (emoji)' },
      { key: 'text', type: 'textarea', label: 'Text ([markdown links](url) supported)' },
    ],
  },
  cv: {
    data: 'cv.yml', label: 'CV', root: 'record',
    fields: [
      { key: 'education', type: 'list', label: 'Education', fields: [
        { key: 'institution', type: 'text', label: 'Institution' },
        { key: 'degree', type: 'text', label: 'Degree / Lab' },
        { key: 'advisor', type: 'text', label: 'Advisor' },
        { key: 'period', type: 'text', label: 'Period' },
      ] },
      { key: 'awards', type: 'list', label: 'Awards', fields: [
        { key: 'title', type: 'text', label: 'Title' },
        { key: 'year', type: 'number', label: 'Year' },
        { key: 'description', type: 'textarea', label: 'Description (optional)' },
      ] },
      { key: 'service', type: 'list', label: 'Academic Service', fields: [
        { key: 'role', type: 'text', label: 'Role' },
        { key: 'detail', type: 'text', label: 'Detail' },
      ] },
      { key: 'teaching', type: 'list', label: 'Teaching', fields: [
        { key: 'course', type: 'text', label: 'Course' },
        { key: 'role', type: 'text', label: 'Role' },
        { key: 'institution', type: 'text', label: 'Institution' },
        { key: 'period', type: 'text', label: 'Period' },
      ] },
    ],
  },
};

function fieldHtml(field, value, path) {
  const v = value == null ? '' : value;
  if (field.type === 'emoji') {
    const palette = EMOJIS.map(em => `<button type="button" class="emoji-pick">${em}</button>`).join('');
    return `<div class="field"><label>${esc(field.label)}</label>
      <div class="emoji-field">
        <input type="text" data-path="${path}" value="${esc(v)}">
        <button type="button" class="btn btn--ghost btn--sm emoji-toggle" aria-label="Pick emoji">😀 Pick</button>
        <div class="emoji-pop hidden">${palette}</div>
      </div></div>`;
  }
  if (field.type === 'checkbox') {
    return `<div class="field field--inline">
      <input type="checkbox" data-path="${path}" data-type="checkbox"${v ? ' checked' : ''}>
      <label>${esc(field.label)}</label></div>`;
  }
  if (field.type === 'textarea') {
    return `<div class="field"><label>${esc(field.label)}</label>
      <textarea rows="3" data-path="${path}">${esc(v)}</textarea></div>`;
  }
  if (field.type === 'select') {
    const list = field.dynamicOptions === 'interests' ? (state.interestTitles || []) : field.options;
    let opts = field.dynamicOptions ? '<option value="">— none —</option>' : '';
    opts += list.map(o =>
      `<option value="${esc(o)}"${o === v ? ' selected' : ''}>${esc(o)}</option>`).join('');
    return `<div class="field"><label>${esc(field.label)}</label>
      <select data-path="${path}">${opts}</select></div>`;
  }
  const type = field.type === 'number' ? 'number' : 'text';
  const dt = field.type === 'number' ? ' data-type="number"' : '';
  return `<div class="field"><label>${esc(field.label)}</label>
    <input type="${type}"${dt} data-path="${path}" value="${esc(v)}"></div>`;
}

function fieldsHtml(fields, obj, prefix) {
  obj = obj || {};
  return fields.map(f => {
    const p = prefix ? `${prefix}/${f.key}` : f.key;
    if (f.type === 'list') return listHtml(f, obj[f.key], p, true);
    return fieldHtml(f, obj[f.key], p);
  }).join('');
}

function listHtml(field, arr, basePath, nested) {
  arr = Array.isArray(arr) ? arr : [];
  const cards = arr.map((item, i) => {
    const itemPath = basePath ? `${basePath}/${i}` : `${i}`;
    return `<div class="card">
      <button class="btn btn--danger btn--sm card-remove" data-arr="${basePath}" data-idx="${i}">Remove</button>
      ${fieldsHtml(field.fields, item, itemPath)}
    </div>`;
  }).join('') || `<p class="empty">No entries yet.</p>`;
  return `<div class="list-block ${nested ? 'sub-list' : ''}">
    <div class="list-head"><h3>${esc(field.label)}</h3>
      <button class="btn btn--ghost btn--sm" data-arr="${basePath}">+ Add ${esc(field.label.replace(/s$/, ''))}</button></div>
    ${cards}
  </div>`;
}

function renderDataEditor(section) {
  const cfg = EDITORS[section];
  const inner = cfg.root === 'list'
    ? listHtml({ label: cfg.label, fields: cfg.fields }, state.model, '', false)
    : fieldsHtml(cfg.fields, state.model, '');

  el.view.innerHTML = `
    <div class="view-head">
      <h2>${esc(t('h_' + section))}</h2>
      <div class="view-actions"><button id="save-data" class="btn btn--primary">${t('save_changes')}</button></div>
    </div>
    <div id="editor-root">${inner}</div>
    <div class="sticky-actions"><button id="save-data-2" class="btn btn--primary">${t('save_changes')}</button></div>`;

  const root = document.getElementById('editor-root');
  root.addEventListener('input', onFieldInput);
  root.addEventListener('change', onFieldInput);
  root.addEventListener('click', onEditorClick);
  document.getElementById('save-data').addEventListener('click', saveDataFile);
  document.getElementById('save-data-2').addEventListener('click', saveDataFile);
}

function onFieldInput(e) {
  const t = e.target;
  if (!t.dataset || t.dataset.path == null) return;
  let v = t.value;
  if (t.dataset.type === 'number') v = v.trim() === '' ? '' : Number(v);
  if (t.dataset.type === 'checkbox') v = t.checked;
  setByPath(state.model, parsePath(t.dataset.path), v);
}
function onEditorClick(e) {
  // Emoji picker toggle / selection
  const toggle = e.target.closest('.emoji-toggle');
  if (toggle) {
    toggle.parentElement.querySelector('.emoji-pop').classList.toggle('hidden');
    return;
  }
  const pick = e.target.closest('.emoji-pick');
  if (pick) {
    const wrap = pick.closest('.emoji-field');
    const input = wrap.querySelector('input[data-path]');
    input.value = pick.textContent;
    setByPath(state.model, parsePath(input.dataset.path), pick.textContent);
    wrap.querySelector('.emoji-pop').classList.add('hidden');
    return;
  }

  const btn = e.target.closest('button[data-arr]');
  if (!btn) return;
  let arr = btn.dataset.arr === '' ? state.model : getByPath(state.model, parsePath(btn.dataset.arr));
  if (btn.dataset.idx != null) {
    arr.splice(Number(btn.dataset.idx), 1);            // remove
  } else {                                             // add (create the array if it doesn't exist yet)
    if (!Array.isArray(arr)) setByPath(state.model, parsePath(btn.dataset.arr), arr = []);
    arr.push({});
  }
  renderDataEditor(state.section);
}

async function loadDataEditor(section) {
  el.view.classList.remove('view--wide');
  el.view.innerHTML = `<p class="loading">${t('loading')}</p>`;
  const cfg = EDITORS[section];
  try {
    if (section === 'publications') {
      // Populate the "interest" dropdown from this language's research_interests.yml.
      try {
        const ri = await getFile(dataPath('research_interests.yml'));
        state.interestTitles = (jsyaml.load(ri.text, { schema: Y_SCHEMA }) || [])
          .map(x => x && x.title).filter(Boolean);
      } catch (e) { state.interestTitles = []; }
    }
    const path = dataPath(cfg.data);
    const { text, sha } = await getFile(path);
    state.model = jsyaml.load(text, { schema: Y_SCHEMA }) || (cfg.root === 'list' ? [] : {});
    state.sha = sha;
    state.path = path;
    renderDataEditor(section);
  } catch (e) {
    el.view.innerHTML = `<p class="error">Failed to load ${esc(dataPath(cfg.data))}: ${esc(e.message)}</p>`;
  }
}
function saveDataFile() {
  const cfg = EDITORS[state.section];
  const path = dataPath(cfg.data);
  stagePut(path, jsyaml.dump(state.model, Y_DUMP), `content(admin): update ${path}`);
  toast(stagedMsg(), 'ok');
}

// ===========================================================================
//  Blog editor
// ===========================================================================
const BLOG_DIR = 'content/blog';

function isPost(name) {
  return name.endsWith('.md') && !name.startsWith('_index');
}
function blogFileName(slug) {
  return `${slug}.md`;
}

// Shared full-width markdown editor: rendered preview (left) + textarea (right).
// Reuses #f-body / #preview, so only one such editor is on screen at a time.
function mdSplitHtml(value) {
  return `<div class="editor-grid with-preview md-split">
    <div class="md-split-pane">
      <div class="md-split-label">${t('md_preview_label')}</div>
      <div id="preview" class="preview"></div>
    </div>
    <div class="md-split-pane">
      <div class="md-split-label">${t('md_source_label')}</div>
      <textarea id="f-body" class="body-area" placeholder="${esc(t('md_body_ph'))}">${esc(value || '')}</textarea>
    </div>
  </div>`;
}
function wireMdSplit() {
  const bodyEl = document.getElementById('f-body');
  const preview = document.getElementById('preview');
  const render = () => { preview.innerHTML = marked.parse(bodyEl.value || ''); };
  bodyEl.addEventListener('input', render);
  bodyEl.addEventListener('input', refreshPreviewIfOpen);
  bodyEl.addEventListener('paste', e => {
    const items = (e.clipboardData && e.clipboardData.items) || [];
    for (const it of items) {
      if (it.kind === 'file' && it.type.startsWith('image/')) {
        const file = it.getAsFile();
        if (file) { e.preventDefault(); pasteImage(bodyEl, file); return; }
      }
    }
  });
  render();
}

// ---- Full-page preview overlay --------------------------------------------
// Renders the current draft inside a hand-ported replica of the deployed page
// chrome (see the ".preview-overlay" rules in admin.css), so an editor can
// check a real-page appearance before committing. The chrome is decorative
// only - see ".preview-overlay .site-header, .footer { pointer-events: none }".

// Matches the real page's `.Date.Format "January 2, 2006"` (always English,
// regardless of content language - Go's layout-string formatting isn't
// locale-aware here, and neither is the real template).
function formatPostDate(iso) {
  const d = new Date(`${iso || ''}T00:00:00`);
  if (isNaN(d)) return iso || '';
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}
// Rough approximation of Hugo's .ReadingTime (word count / wpm, rounded up).
// Exact parity isn't the point - this is a visual draft check, not a metric.
function estimateReadingTime(text) {
  const words = (text || '').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

function previewNavHtml(activeSection) {
  const items = [
    ['', 'nav_home'], ['research-interests', 'nav_research'], ['publications', 'nav_publications'],
    ['blog', 'nav_blog'], ['news', 'nav_news'], ['cv', 'nav_cv'],
  ];
  const links = items.map(([key, labelKey]) =>
    `<a${key === activeSection ? ' class="active"' : ''}>${esc(siteT(labelKey))}</a>`).join('');
  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  return `
    <header class="site-header">
      <div class="container nav-container">
        <span class="nav-brand">${esc(state.siteTitle || '')}</span>
        <nav class="nav-links">
          ${links}
          <button class="theme-toggle" type="button"><span class="theme-toggle__icon">${dark ? '☀' : '☾'}</span></button>
        </nav>
      </div>
    </header>`;
}
function previewFooterHtml() {
  return `
    <footer class="footer">
      <div class="container footer-container">
        <p>© ${new Date().getFullYear()} ${esc(state.siteTitle || '')}. Built with Hugo.</p>
      </div>
    </footer>`;
}
function blogPreviewArticleHtml() {
  const title = document.getElementById('f-title').value.trim();
  const dateStr = document.getElementById('f-date').value;
  const tags = document.getElementById('f-tags').value.split(',').map(s => s.trim()).filter(Boolean);
  const body = document.getElementById('f-body').value;
  const tagsHtml = tags.length
    ? `<div class="post-tags">${tags.map(tag => `<a class="tag-pill">${esc(tag)}</a>`).join('')}</div>` : '';
  return `
    <article class="blog-post">
      <header class="post-header">
        <h1 class="post-title">${esc(title)}</h1>
        <div class="post-meta">
          <time>${esc(formatPostDate(dateStr))}</time> · ${estimateReadingTime(body)} ${esc(siteT('min_read'))}
        </div>
        ${tagsHtml}
      </header>
      <div class="post-content">${marked.parse(body || '')}</div>
    </article>`;
}
function interestPreviewArticleHtml() {
  const title = document.getElementById('i-title').value.trim();
  const summary = document.getElementById('i-summary').value.trim();
  const body = document.getElementById('f-body').value;
  return `
    <article class="interest-single">
      <header class="page-header"><h1>${esc(title)}</h1></header>
      ${summary ? `<p class="interest-lead">${esc(summary)}</p>` : ''}
      <div class="interest-body post-content">${marked.parse(body || '')}</div>
    </article>`;
}
function renderPreviewOverlay() {
  if (!state.previewKind) return;
  const isBlog = state.previewKind === 'blog';
  const article = isBlog ? blogPreviewArticleHtml() : interestPreviewArticleHtml();
  el.previewContent.innerHTML = `
    <div class="preview-page">
      ${previewNavHtml(isBlog ? 'blog' : 'research-interests')}
      <main class="container">${article}</main>
      ${previewFooterHtml()}
    </div>`;
}
async function openPreviewOverlay(kind) {
  state.previewKind = kind;
  if (state.siteTitle == null) await loadSiteChrome();
  renderPreviewOverlay();
  el.previewOverlay.classList.remove('hidden');
}
function closePreviewOverlay() {
  state.previewKind = null;
  el.previewOverlay.classList.add('hidden');
  el.previewContent.innerHTML = '';
}
function refreshPreviewIfOpen() {
  if (state.previewKind && !el.previewOverlay.classList.contains('hidden')) renderPreviewOverlay();
}

// ---- Pasted-image upload ---------------------------------------------------
// On Ctrl+V of an image into the markdown textarea: hash the bytes, upload to
// static/images/uploads/<hash>.<ext>, and insert a root-relative ![](…) link at
// the cursor (matching the base-path-aware link convention used site-wide).
const UPLOAD_DIR = 'static/images/uploads';
const EXT_BY_MIME = {
  'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif',
  'image/webp': 'webp', 'image/svg+xml': 'svg', 'image/bmp': 'bmp',
};
let uploadSeq = 0;

async function sha256Hex(buf) {
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}
function bytesToBase64(bytes) {
  let bin = '';
  const chunk = 0x8000; // chunk to avoid String.fromCharCode arg-count limits
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}
async function uploadImage(path, bytes) {
  const content_b64 = bytesToBase64(bytes);
  if (state.local) {
    await localApi('POST', '/api/upload', { path, content_b64, message: `content(admin): add ${path}` });
    return;
  }
  // GitHub mode: hash-named, so if it already exists the content is identical — skip.
  try { await gh('GET', contentPath(path) + '?ref=' + BRANCH); return; } catch (e) { /* not there → upload */ }
  await gh('PUT', contentPath(path), { message: `content(admin): add ${path}`, content: content_b64, branch: BRANCH });
}

async function pasteImage(ta, file) {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  const hash = (await sha256Hex(buf)).slice(0, 16);
  const ext = EXT_BY_MIME[file.type] || 'png';
  const name = `${hash}.${ext}`;
  const mdLink = `![](/images/uploads/${name})`;

  // Insert a unique placeholder at the cursor so the async upload can swap it in
  // place even if the caret moves while the upload is in flight.
  const token = `![uploading…#${++uploadSeq}]()`;
  const at = ta.selectionStart;
  ta.value = ta.value.slice(0, at) + token + ta.value.slice(ta.selectionEnd);
  ta.selectionStart = ta.selectionEnd = at + token.length;
  ta.dispatchEvent(new Event('input'));

  try {
    await uploadImage(`${UPLOAD_DIR}/${name}`, bytes);
    swapToken(ta, token, mdLink, true);
    toast(t('image_uploaded'), 'ok');
  } catch (e) {
    swapToken(ta, token, '', false);
    toast(t('image_failed') + ': ' + e.message, 'error');
  }
}
function swapToken(ta, token, replacement, focusAfter) {
  const i = ta.value.indexOf(token);
  if (i < 0) return;
  ta.value = ta.value.slice(0, i) + replacement + ta.value.slice(i + token.length);
  if (focusAfter) {
    ta.focus();
    ta.selectionStart = ta.selectionEnd = i + replacement.length;
  }
  ta.dispatchEvent(new Event('input'));
}

function splitFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { fm: {}, body: text };
  return { fm: jsyaml.load(m[1], { schema: Y_SCHEMA }) || {}, body: m[2] };
}
function buildPost(fm, body) {
  const y = jsyaml.dump(fm, Y_DUMP).trim();
  return `---\n${y}\n---\n\n${body.replace(/^\n+/, '')}\n`;
}

async function loadBlogList() {
  el.view.classList.remove('view--wide');
  el.view.innerHTML = `<p class="loading">${t('loading')}</p>`;
  try {
    const items = await listDir(BLOG_DIR);
    const posts = items
      .filter(f => f.type === 'file' && isPost(f.name))
      .sort((a, b) => b.name.localeCompare(a.name));
    const rows = posts.map(p => `
      <div class="row">
        <div class="row-main">
          <div class="row-title">${esc(p.name)}</div>
          <div class="row-meta">${esc(p.path)}</div>
        </div>
        <div class="row-actions">
          <button class="btn btn--ghost btn--sm" data-edit="${esc(p.path)}" data-sha="${esc(p.sha)}">${t('edit')}</button>
          <button class="btn btn--danger btn--sm" data-del="${esc(p.path)}" data-name="${esc(p.name)}">${t('delete')}</button>
        </div>
      </div>`).join('') || `<p class="empty">${t('no_posts')}</p>`;

    el.view.innerHTML = `
      <div class="view-head">
        <h2>${t('h_blog')}</h2>
        <div class="view-actions"><button id="new-post" class="btn btn--primary">${t('new_post')}</button></div>
      </div>
      <div class="row-list">${rows}</div>`;

    document.getElementById('new-post').addEventListener('click', () => openBlogEditor(null));
    el.view.querySelectorAll('[data-edit]').forEach(b =>
      b.addEventListener('click', () => openBlogEditor(b.dataset.edit)));
    el.view.querySelectorAll('[data-del]').forEach(b =>
      b.addEventListener('click', () => removePost(b.dataset.del, b.dataset.name)));
  } catch (e) {
    el.view.innerHTML = `<p class="error">Failed to load posts: ${esc(e.message)}</p>`;
  }
}

async function openBlogEditor(path) {
  let fm = { title: '', date: new Date().toISOString().slice(0, 10), tags: [], draft: true, description: '' };
  let body = '';
  let filename = '';

  if (path) {
    el.view.innerHTML = `<p class="loading">${t('loading')}</p>`;
    try {
      const file = await getFile(path);
      const parsed = splitFrontmatter(file.text);
      fm = Object.assign(fm, parsed.fm);
      // Date input only accepts YYYY-MM-DD - truncate legacy full-timestamp dates (e.g. "2025-01-01T09:00:00Z").
      fm.date = String(fm.date || '').slice(0, 10);
      body = parsed.body;
      filename = path.split('/').pop().replace(/(\.[a-z]{2})?\.md$/, '');
    } catch (e) {
      el.view.innerHTML = `<p class="error">Failed to load post: ${esc(e.message)}</p>`;
      return;
    }
  }
  const tags = Array.isArray(fm.tags) ? fm.tags.join(', ') : (fm.tags || '');

  el.view.classList.add('view--wide');
  el.view.innerHTML = `
    <div class="view-head">
      <h2>${path ? t('edit_post_title') : t('new_post_title')}</h2>
      <div class="view-actions"><button id="back-blog" class="btn btn--ghost">${t('back')}</button></div>
    </div>
    <div class="editor-meta">
      <div class="field"><label>${t('f_title')}</label><input id="f-title" type="text" value="${esc(fm.title)}"></div>
      <div class="field-row">
        <div class="field"><label>${t('f_filename')}</label>
          <input id="f-name" type="text" value="${esc(filename)}" ${path ? 'readonly' : ''} placeholder="${t('f_filename_ph')}"></div>
        <div class="field"><label>${t('f_date')}</label><input id="f-date" type="date" value="${esc(fm.date)}"></div>
      </div>
      <div class="field-row">
        <div class="field"><label>${t('f_tags')}</label><input id="f-tags" type="text" value="${esc(tags)}"></div>
        <div class="field field--inline" style="align-self:end;padding-bottom:.5rem">
          <input id="f-draft" type="checkbox" ${fm.draft ? 'checked' : ''}><label for="f-draft">${t('f_draft')}</label></div>
      </div>
      <div class="field"><label>${t('f_description')}</label><input id="f-desc" type="text" value="${esc(fm.description)}"></div>
    </div>
    <div class="field"><label>${t('f_body')}</label></div>
    ${mdSplitHtml(body)}
    <div class="sticky-actions">
      <button id="back-blog-2" class="btn btn--ghost">${t('cancel')}</button>
      <button id="open-preview" class="btn btn--soft">${t('preview_open')}</button>
      <button id="save-post" class="btn btn--primary">${path ? t('save_post') : t('create_post')}</button>
    </div>`;

  wireMdSplit();
  document.getElementById('back-blog').addEventListener('click', loadBlogList);
  document.getElementById('back-blog-2').addEventListener('click', loadBlogList);
  document.getElementById('open-preview').addEventListener('click', () => openPreviewOverlay('blog'));
  ['f-title', 'f-date', 'f-tags'].forEach(id =>
    document.getElementById(id).addEventListener('input', refreshPreviewIfOpen));
  document.getElementById('save-post').addEventListener('click', () => savePost(path));
}

async function savePost(path) {
  const title = document.getElementById('f-title').value.trim();
  if (!title) { toast(t('title_required'), 'error'); return; }

  let name = document.getElementById('f-name').value.trim();
  if (!name) name = slugify(title);
  if (!name) { toast(t('no_filename'), 'error'); return; }

  const tags = document.getElementById('f-tags').value.split(',').map(t => t.trim()).filter(Boolean);
  const fm = {
    title,
    date: document.getElementById('f-date').value.trim(),
    tags,
    draft: document.getElementById('f-draft').checked,
    description: document.getElementById('f-desc').value.trim(),
  };
  const body = document.getElementById('f-body').value;
  const filePath = path || `${BLOG_DIR}/${blogFileName(name)}`;
  stagePut(filePath, buildPost(fm, body), `content(admin): ${path ? 'update' : 'add'} blog/${name}`);
  toast(stagedMsg(), 'ok');
  loadBlogList();
}

function removePost(path, name) {
  if (!confirm(t('confirm_delete') + ' "' + name + '"' + t('confirm_delete_tail'))) return;
  stageDelete(path, `content(admin): delete blog/${name}`);
  toast(stagedMsg(), 'ok');
  loadBlogList();
}

// ===========================================================================
//  Research Interests (list + split markdown editor, like the blog)
// ===========================================================================
const INTERESTS_NAME = 'research_interests.yml';

async function loadInterestsList() {
  el.view.classList.remove('view--wide');
  el.view.innerHTML = `<p class="loading">${t('loading')}</p>`;
  try {
    const { text, sha } = await getFile(dataPath(INTERESTS_NAME));
    state.interests = jsyaml.load(text, { schema: Y_SCHEMA }) || [];
    state.interestsSha = sha;
  } catch (e) {
    el.view.innerHTML = `<p class="error">Failed to load ${esc(dataPath(INTERESTS_NAME))}: ${esc(e.message)}</p>`;
    return;
  }
  const rows = state.interests.map((it, i) => `
    <div class="row">
      <div class="row-main">
        <div class="row-title">${esc(it.title || '(untitled)')}</div>
        <div class="row-meta">${esc(it.summary || '')}</div>
      </div>
      <div class="row-actions">
        <button class="btn btn--ghost btn--sm" data-edit="${i}">${t('edit')}</button>
        <button class="btn btn--danger btn--sm" data-del="${i}">${t('delete')}</button>
      </div>
    </div>`).join('') || `<p class="empty">${t('no_interests')}</p>`;

  el.view.innerHTML = `
    <div class="view-head">
      <h2>Research Interests</h2>
      <div class="view-actions"><button id="new-interest" class="btn btn--primary">${t('new_interest')}</button></div>
    </div>
    <div class="row-list">${rows}</div>`;

  document.getElementById('new-interest').addEventListener('click', () => openInterestEditor(null));
  el.view.querySelectorAll('[data-edit]').forEach(b =>
    b.addEventListener('click', () => openInterestEditor(Number(b.dataset.edit))));
  el.view.querySelectorAll('[data-del]').forEach(b =>
    b.addEventListener('click', () => removeInterest(Number(b.dataset.del))));
}

function openInterestEditor(index) {
  const it = index == null ? { title: '', summary: '', details: '' } : (state.interests[index] || {});
  el.view.classList.add('view--wide');
  el.view.innerHTML = `
    <div class="view-head">
      <h2>${index == null ? t('new_interest_title') : t('edit_interest_title')}</h2>
      <div class="view-actions"><button id="back-int" class="btn btn--ghost">${t('back')}</button></div>
    </div>
    <div class="editor-meta">
      <div class="field"><label>${t('f_title')}</label><input id="i-title" type="text" value="${esc(it.title)}"></div>
      <div class="field"><label>${t('i_summary')}</label>
        <textarea id="i-summary" rows="3">${esc(it.summary)}</textarea></div>
    </div>
    <div class="field"><label>${t('i_details')}</label></div>
    ${mdSplitHtml(it.details)}
    <div class="sticky-actions">
      <button id="back-int-2" class="btn btn--ghost">${t('cancel')}</button>
      <button id="open-preview" class="btn btn--soft">${t('preview_open')}</button>
      <button id="save-int" class="btn btn--primary">${index == null ? t('create_interest') : t('save_interest')}</button>
    </div>`;

  wireMdSplit();
  document.getElementById('back-int').addEventListener('click', loadInterestsList);
  document.getElementById('back-int-2').addEventListener('click', loadInterestsList);
  document.getElementById('open-preview').addEventListener('click', () => openPreviewOverlay('interest'));
  ['i-title', 'i-summary'].forEach(id =>
    document.getElementById(id).addEventListener('input', refreshPreviewIfOpen));
  document.getElementById('save-int').addEventListener('click', () => saveInterest(index));
}

async function saveInterest(index) {
  const title = document.getElementById('i-title').value.trim();
  if (!title) { toast(t('title_required'), 'error'); return; }
  const entry = {
    title,
    summary: document.getElementById('i-summary').value.trim(),
    details: document.getElementById('f-body').value,
  };
  if (index == null) state.interests.push(entry);
  else state.interests[index] = entry;
  const path = dataPath(INTERESTS_NAME);
  stagePut(path, jsyaml.dump(state.interests, Y_DUMP), `content(admin): update ${path}`);
  toast(stagedMsg(), 'ok');
  loadInterestsList();
}

function removeInterest(index) {
  const it = state.interests[index] || {};
  if (!confirm(t('confirm_delete') + ' "' + (it.title || 'this interest') + '"' + t('confirm_delete_tail'))) return;
  state.interests.splice(index, 1);
  const path = dataPath(INTERESTS_NAME);
  stagePut(path, jsyaml.dump(state.interests, Y_DUMP), `content(admin): update ${path}`);
  toast(stagedMsg(), 'ok');
  loadInterestsList(); // re-render from the staged list
}

// ===========================================================================
//  Site Settings (config/_default/params.yaml)
// ===========================================================================
// [param key, i18n key] — labels resolve through t() so the panel follows the UI language.
const SETTINGS_TEXT = [
  ['description', 's_description'],
  ['tagline', 's_tagline'],
  ['faviconEmoji', 's_favicon'],
  ['profileImage', 's_profile'],
  ['email', 's_email'],
  ['googleScholar', 's_scholar'],
  ['github', 's_github'],
  ['linkedin', 's_linkedin'],
  ['cvPdf', 's_cvpdf'],
];

async function loadSettings() {
  el.view.classList.remove('view--wide');
  el.view.innerHTML = `<p class="loading">${t('loading')}</p>`;
  try {
    const { text, sha } = await getFile(PARAMS_FILE);
    state.settings = jsyaml.load(text, { schema: Y_SCHEMA }) || {};
    state.settingsSha = sha;
    renderSettings();
  } catch (e) {
    el.view.innerHTML = `<p class="error">Failed to load ${esc(PARAMS_FILE)}: ${esc(e.message)}</p>`;
  }
}

function renderSettings() {
  const m = state.settings || {};
  const text = SETTINGS_TEXT.map(([k, label]) =>
    `<div class="field"><label>${esc(t(label))}</label>
      <input type="text" data-skey="${k}" value="${esc(m[k] == null ? '' : m[k])}"></div>`).join('');
  const palette = `<div class="field"><label>${t('color_palette')}</label>
    <select data-skey="palette">${PALETTES.map(p =>
      `<option value="${p}"${p === (m.palette || 'forest') ? ' selected' : ''}>${esc(p)}</option>`).join('')}</select></div>`;
  const sec = m.sections || {};
  const sections = SECTION_KEYS.map(k =>
    `<div class="field field--inline">
      <input type="checkbox" data-ssection="${k}"${sec[k] !== false ? ' checked' : ''}>
      <label>${esc(k)}</label></div>`).join('');

  el.view.innerHTML = `
    <div class="view-head">
      <h2>${t('h_settings')}</h2>
      <div class="view-actions"><button id="save-settings" class="btn btn--primary">${t('save_settings')}</button></div>
    </div>
    <p class="settings-note">${esc(t('settings_note_a'))} <code>${esc(PARAMS_FILE)}</code>${esc(t('settings_note_b'))}
      <code>config/_default/hugo.toml</code> ${esc(t('settings_note_c'))}</p>
    <div class="settings-grid">${text}${palette}</div>
    <h3 class="settings-subhead">${esc(t('s_sections_head'))}</h3>
    <div class="settings-sections">${sections}</div>
    <div class="sticky-actions"><button id="save-settings-2" class="btn btn--primary">${t('save_settings')}</button></div>`;

  document.getElementById('save-settings').addEventListener('click', saveSettings);
  document.getElementById('save-settings-2').addEventListener('click', saveSettings);
}

async function saveSettings() {
  const m = state.settings || {};
  el.view.querySelectorAll('[data-skey]').forEach(inp => { m[inp.dataset.skey] = inp.value; });
  m.sections = m.sections || {};
  el.view.querySelectorAll('[data-ssection]').forEach(cb => { m.sections[cb.dataset.ssection] = cb.checked; });
  state.settings = m;
  stagePut(PARAMS_FILE, jsyaml.dump(m, Y_DUMP), 'chore(admin): update site settings');
  toast(stagedMsg(), 'ok');
}

// ===========================================================================
//  Routing / init
// ===========================================================================
function selectSection(section) {
  closePreviewOverlay(); // don't leave a stale preview open across a section/list switch
  state.section = section;
  el.nav.querySelectorAll('.tab').forEach(tab => tab.classList.toggle('active', tab.dataset.section === section));
  if (section === 'blog') loadBlogList();
  else if (section === 'research_interests') loadInterestsList();
  else if (section === 'settings') loadSettings();
  else loadDataEditor(section);
}
function showApp() {
  el.login.classList.add('hidden');
  el.app.classList.remove('hidden');
  loadSiteChrome();   // mirror the site's favicon + palette (async, non-blocking)
  restoreSessionBranch();
  if (state.sessionBranch) lookupPr(state.sessionBranch).then(updatePrLink).catch(() => {});
  selectSection('blog');
}

async function init() {
  applyI18n();

  // Theme toggle (light/dark) — initial data-theme is set pre-paint in index.html.
  el.themeToggle.addEventListener('click', toggleTheme);
  syncThemeIcon();

  el.repoLabel.textContent = `${OWNER}/${REPO}`;
  el.authorizeBtn.addEventListener('click', openAuthorize);
  el.connectBtn.addEventListener('click', connect);
  el.tokenInput.addEventListener('keydown', e => { if (e.key === 'Enter') connect(); });
  el.signout.addEventListener('click', signout);
  el.commitBtn.addEventListener('click', flushPending);
  // Warn before leaving with staged-but-uncommitted edits.
  window.addEventListener('beforeunload', e => {
    if (state.pending.size > 0) { e.preventDefault(); e.returnValue = ''; }
  });
  el.previewClose.addEventListener('click', closePreviewOverlay);
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && state.previewKind) closePreviewOverlay();
  });
  el.nav.querySelectorAll('.tab').forEach(tab =>
    tab.addEventListener('click', () => selectSection(tab.dataset.section)));

  // Served by the local backend? Then commit locally and skip the token login.
  try {
    const ping = await fetch('/api/ping');
    if (ping.ok) {
      state.local = true;
      el.signout.classList.add('hidden');
      showApp();
      toast(t('local_mode'), 'ok');
      return;
    }
  } catch (e) { /* no local backend → use the GitHub API flow below */ }

  state.token = loadToken();
  if (state.token) {
    // Verify the saved token still works before showing the app.
    validateToken().then(showApp).catch(() => {
      el.login.classList.remove('hidden');
      toast(t('token_invalid'), 'error');
    });
  } else {
    el.login.classList.remove('hidden');
  }
}
init();
