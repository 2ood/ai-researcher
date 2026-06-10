/* Content Dashboard — static, no backend.
 * Authenticates with a GitHub fine-grained PAT (stored in localStorage) and
 * commits content directly to the repo via the GitHub Contents API.
 * Manages: blog posts (content/blog/*.md) and data files (data/*.yml).
 */

// ---- Repository config ----------------------------------------------------
const OWNER = '2ood';
const REPO = 'ai-researcher';
const BRANCH = 'main';
const API = 'https://api.github.com';
const TOKEN_KEY = 'gh_token';
const TOKEN_EXP_KEY = 'gh_token_exp';
const TOKEN_TTL_MS = 2 * 24 * 60 * 60 * 1000; // localStorage token self-expires after 2 days

// YAML: JSON schema keeps dates/ids as strings (no surprise Date objects) and ints as numbers.
const Y_SCHEMA = jsyaml.JSON_SCHEMA;
const Y_DUMP = { schema: Y_SCHEMA, lineWidth: -1, noRefs: true };

// ---- State ----------------------------------------------------------------
const state = {
  token: '',       // set from loadToken() in init()
  local: false,    // true when served by cms-server.go (commits locally, no token)
  section: 'blog',
  model: null,     // parsed YAML for the active data file
  sha: null,       // sha of the active file (data editor or blog post)
  path: null,      // path of the active file
  interestTitles: [], // interest titles, for the publications "interest" dropdown
  interests: [],   // parsed research_interests.yml list (interests editor)
  interestsSha: null, // sha of research_interests.yml
};

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
  view: document.getElementById('view'),
  toast: document.getElementById('toast'),
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

async function listDir(dir) {
  if (state.local) return localApi('GET', '/api/list?dir=' + encodeURIComponent(dir));
  return gh('GET', contentPath(dir) + '?ref=' + BRANCH);
}
async function getFile(path) {
  if (state.local) {
    const d = await localApi('GET', '/api/get?path=' + encodeURIComponent(path));
    return { text: d.text, sha: d.sha };
  }
  const data = await gh('GET', contentPath(path) + '?ref=' + BRANCH);
  return { text: fromBase64(data.content), sha: data.sha };
}
async function putFile(path, text, message, sha) {
  if (state.local) {
    const d = await localApi('POST', '/api/save', { path, text, message });
    return d.sha;
  }
  const body = { message, content: toBase64(text), branch: BRANCH };
  if (sha) body.sha = sha;
  const res = await gh('PUT', contentPath(path), body);
  return res.content.sha;
}
async function deleteFile(path, message, sha) {
  if (state.local) return localApi('POST', '/api/delete', { path, message });
  return gh('DELETE', contentPath(path), { message, sha, branch: BRANCH });
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
    el.loginError.textContent = 'Could not connect: ' + e.message + '. Check the token and its repository permissions.';
    el.loginError.classList.remove('hidden');
  } finally {
    el.connectBtn.disabled = false;
  }
}
function signout() {
  clearToken();
  state.token = '';
  el.tokenInput.value = '';
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
    file: 'data/publications.yml', label: 'Publications', root: 'list',
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
    file: 'data/news.yml', label: 'News', root: 'list',
    fields: [
      { key: 'date', type: 'text', label: 'Date (YYYY-MM-DD)' },
      { key: 'icon', type: 'emoji', label: 'Icon (emoji)' },
      { key: 'text', type: 'textarea', label: 'Text ([markdown links](url) supported)' },
    ],
  },
  cv: {
    file: 'data/cv.yml', label: 'CV', root: 'record',
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
      <h2>${esc(cfg.label)}</h2>
      <div class="view-actions"><button id="save-data" class="btn btn--primary">Save changes</button></div>
    </div>
    <div id="editor-root">${inner}</div>
    <div class="sticky-actions"><button id="save-data-2" class="btn btn--primary">Save changes</button></div>`;

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
  el.view.innerHTML = `<p class="loading">Loading…</p>`;
  const cfg = EDITORS[section];
  try {
    if (section === 'publications') {
      // Populate the "interest" dropdown from data/research_interests.yml.
      try {
        const ri = await getFile('data/research_interests.yml');
        state.interestTitles = (jsyaml.load(ri.text, { schema: Y_SCHEMA }) || [])
          .map(x => x && x.title).filter(Boolean);
      } catch (e) { state.interestTitles = []; }
    }
    const { text, sha } = await getFile(cfg.file);
    state.model = jsyaml.load(text, { schema: Y_SCHEMA }) || (cfg.root === 'list' ? [] : {});
    state.sha = sha;
    state.path = cfg.file;
    renderDataEditor(section);
  } catch (e) {
    el.view.innerHTML = `<p class="error">Failed to load ${esc(cfg.file)}: ${esc(e.message)}</p>`;
  }
}
async function saveDataFile() {
  const cfg = EDITORS[state.section];
  const yaml = jsyaml.dump(state.model, Y_DUMP);
  try {
    state.sha = await putFile(cfg.file, yaml, `content(admin): update ${cfg.file}`, state.sha);
    toast('Saved ' + cfg.file, 'ok');
  } catch (e) {
    toast('Save failed: ' + e.message, 'error');
  }
}

// ===========================================================================
//  Blog editor
// ===========================================================================
const BLOG_DIR = 'content/blog';

// Shared full-width markdown editor: rendered preview (left) + textarea (right).
// Reuses #f-body / #preview, so only one such editor is on screen at a time.
function mdSplitHtml(value) {
  return `<div class="editor-grid with-preview md-split">
    <div id="preview" class="preview"></div>
    <textarea id="f-body" class="body-area">${esc(value || '')}</textarea>
  </div>`;
}
function wireMdSplit() {
  const bodyEl = document.getElementById('f-body');
  const preview = document.getElementById('preview');
  const render = () => { preview.innerHTML = marked.parse(bodyEl.value || ''); };
  bodyEl.addEventListener('input', render);
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
    toast('Image uploaded', 'ok');
  } catch (e) {
    swapToken(ta, token, '', false);
    toast('Image upload failed: ' + e.message, 'error');
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
  el.view.innerHTML = `<p class="loading">Loading posts…</p>`;
  try {
    const items = await listDir(BLOG_DIR);
    const posts = items
      .filter(f => f.type === 'file' && f.name.endsWith('.md') && f.name !== '_index.md')
      .sort((a, b) => b.name.localeCompare(a.name));
    const rows = posts.map(p => `
      <div class="row">
        <div class="row-main">
          <div class="row-title">${esc(p.name)}</div>
          <div class="row-meta">${esc(p.path)}</div>
        </div>
        <div class="row-actions">
          <button class="btn btn--ghost btn--sm" data-edit="${esc(p.path)}" data-sha="${esc(p.sha)}">Edit</button>
          <button class="btn btn--danger btn--sm" data-del="${esc(p.path)}" data-sha="${esc(p.sha)}" data-name="${esc(p.name)}">Delete</button>
        </div>
      </div>`).join('') || `<p class="empty">No posts yet. Create your first one.</p>`;

    el.view.innerHTML = `
      <div class="view-head">
        <h2>Blog</h2>
        <div class="view-actions"><button id="new-post" class="btn btn--primary">New post</button></div>
      </div>
      <div class="row-list">${rows}</div>`;

    document.getElementById('new-post').addEventListener('click', () => openBlogEditor(null));
    el.view.querySelectorAll('[data-edit]').forEach(b =>
      b.addEventListener('click', () => openBlogEditor(b.dataset.edit)));
    el.view.querySelectorAll('[data-del]').forEach(b =>
      b.addEventListener('click', () => removePost(b.dataset.del, b.dataset.sha, b.dataset.name)));
  } catch (e) {
    el.view.innerHTML = `<p class="error">Failed to load posts: ${esc(e.message)}</p>`;
  }
}

async function openBlogEditor(path) {
  let fm = { title: '', date: new Date().toISOString().slice(0, 10), tags: [], draft: true, description: '' };
  let body = '';
  let sha = null;
  let filename = '';

  if (path) {
    el.view.innerHTML = `<p class="loading">Loading…</p>`;
    try {
      const file = await getFile(path);
      const parsed = splitFrontmatter(file.text);
      fm = Object.assign(fm, parsed.fm);
      body = parsed.body;
      sha = file.sha;
      filename = path.split('/').pop().replace(/\.md$/, '');
    } catch (e) {
      el.view.innerHTML = `<p class="error">Failed to load post: ${esc(e.message)}</p>`;
      return;
    }
  }
  const tags = Array.isArray(fm.tags) ? fm.tags.join(', ') : (fm.tags || '');

  el.view.classList.add('view--wide');
  el.view.innerHTML = `
    <div class="view-head">
      <h2>${path ? 'Edit post' : 'New post'}</h2>
      <div class="view-actions"><button id="back-blog" class="btn btn--ghost">← Back</button></div>
    </div>
    <div class="editor-meta">
      <div class="field"><label>Title</label><input id="f-title" type="text" value="${esc(fm.title)}"></div>
      <div class="field-row">
        <div class="field"><label>Filename (slug, no .md)</label>
          <input id="f-name" type="text" value="${esc(filename)}" ${path ? 'readonly' : ''} placeholder="auto from title"></div>
        <div class="field"><label>Date</label><input id="f-date" type="text" value="${esc(fm.date)}"></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Tags (comma-separated)</label><input id="f-tags" type="text" value="${esc(tags)}"></div>
        <div class="field field--inline" style="align-self:end;padding-bottom:.5rem">
          <input id="f-draft" type="checkbox" ${fm.draft ? 'checked' : ''}><label for="f-draft">Draft</label></div>
      </div>
      <div class="field"><label>Description</label><input id="f-desc" type="text" value="${esc(fm.description)}"></div>
    </div>
    <div class="field"><label>Body (Markdown)</label></div>
    ${mdSplitHtml(body)}
    <div class="sticky-actions">
      <button id="back-blog-2" class="btn btn--ghost">Cancel</button>
      <button id="save-post" class="btn btn--primary">${path ? 'Save post' : 'Create post'}</button>
    </div>`;

  wireMdSplit();
  document.getElementById('back-blog').addEventListener('click', loadBlogList);
  document.getElementById('back-blog-2').addEventListener('click', loadBlogList);
  document.getElementById('save-post').addEventListener('click', () => savePost(path, sha));
}

async function savePost(path, sha) {
  const title = document.getElementById('f-title').value.trim();
  if (!title) { toast('Title is required', 'error'); return; }

  let name = document.getElementById('f-name').value.trim();
  if (!name) name = slugify(title);
  if (!name) { toast('Could not derive a filename — set one manually', 'error'); return; }

  const tags = document.getElementById('f-tags').value.split(',').map(t => t.trim()).filter(Boolean);
  const fm = {
    title,
    date: document.getElementById('f-date').value.trim(),
    tags,
    draft: document.getElementById('f-draft').checked,
    description: document.getElementById('f-desc').value.trim(),
  };
  const body = document.getElementById('f-body').value;
  const filePath = path || `${BLOG_DIR}/${name}.md`;
  const text = buildPost(fm, body);

  try {
    await putFile(filePath, text, `content(admin): ${path ? 'update' : 'add'} blog/${name}`, sha);
    toast('Saved ' + name + '.md', 'ok');
    loadBlogList();
  } catch (e) {
    toast('Save failed: ' + e.message, 'error');
  }
}

async function removePost(path, sha, name) {
  if (!confirm(`Delete "${name}"? This commits a deletion to the repo.`)) return;
  try {
    await deleteFile(path, `content(admin): delete blog/${name}`, sha);
    toast('Deleted ' + name, 'ok');
    loadBlogList();
  } catch (e) {
    toast('Delete failed: ' + e.message, 'error');
  }
}

// ===========================================================================
//  Research Interests (list + split markdown editor, like the blog)
// ===========================================================================
const INTERESTS_FILE = 'data/research_interests.yml';

async function loadInterestsList() {
  el.view.classList.remove('view--wide');
  el.view.innerHTML = `<p class="loading">Loading…</p>`;
  try {
    const { text, sha } = await getFile(INTERESTS_FILE);
    state.interests = jsyaml.load(text, { schema: Y_SCHEMA }) || [];
    state.interestsSha = sha;
  } catch (e) {
    el.view.innerHTML = `<p class="error">Failed to load ${esc(INTERESTS_FILE)}: ${esc(e.message)}</p>`;
    return;
  }
  const rows = state.interests.map((it, i) => `
    <div class="row">
      <div class="row-main">
        <div class="row-title">${esc(it.title || '(untitled)')}</div>
        <div class="row-meta">${esc(it.summary || '')}</div>
      </div>
      <div class="row-actions">
        <button class="btn btn--ghost btn--sm" data-edit="${i}">Edit</button>
        <button class="btn btn--danger btn--sm" data-del="${i}">Delete</button>
      </div>
    </div>`).join('') || `<p class="empty">No interests yet. Create your first one.</p>`;

  el.view.innerHTML = `
    <div class="view-head">
      <h2>Research Interests</h2>
      <div class="view-actions"><button id="new-interest" class="btn btn--primary">New interest</button></div>
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
      <h2>${index == null ? 'New interest' : 'Edit interest'}</h2>
      <div class="view-actions"><button id="back-int" class="btn btn--ghost">← Back</button></div>
    </div>
    <div class="editor-meta">
      <div class="field"><label>Title</label><input id="i-title" type="text" value="${esc(it.title)}"></div>
      <div class="field"><label>Summary (shown on home)</label>
        <textarea id="i-summary" rows="3">${esc(it.summary)}</textarea></div>
    </div>
    <div class="field"><label>Details (markdown, shown on the dedicated page)</label></div>
    ${mdSplitHtml(it.details)}
    <div class="sticky-actions">
      <button id="back-int-2" class="btn btn--ghost">Cancel</button>
      <button id="save-int" class="btn btn--primary">${index == null ? 'Create interest' : 'Save interest'}</button>
    </div>`;

  wireMdSplit();
  document.getElementById('back-int').addEventListener('click', loadInterestsList);
  document.getElementById('back-int-2').addEventListener('click', loadInterestsList);
  document.getElementById('save-int').addEventListener('click', () => saveInterest(index));
}

async function saveInterest(index) {
  const title = document.getElementById('i-title').value.trim();
  if (!title) { toast('Title is required', 'error'); return; }
  const entry = {
    title,
    summary: document.getElementById('i-summary').value.trim(),
    details: document.getElementById('f-body').value,
  };
  if (index == null) state.interests.push(entry);
  else state.interests[index] = entry;
  try {
    const yaml = jsyaml.dump(state.interests, Y_DUMP);
    state.interestsSha = await putFile(INTERESTS_FILE, yaml, `content(admin): update ${INTERESTS_FILE}`, state.interestsSha);
    toast('Saved ' + INTERESTS_FILE, 'ok');
    loadInterestsList();
  } catch (e) {
    toast('Save failed: ' + e.message, 'error');
  }
}

async function removeInterest(index) {
  const it = state.interests[index] || {};
  if (!confirm(`Delete "${it.title || 'this interest'}"? This commits a change to the repo.`)) return;
  state.interests.splice(index, 1);
  try {
    const yaml = jsyaml.dump(state.interests, Y_DUMP);
    state.interestsSha = await putFile(INTERESTS_FILE, yaml, `content(admin): update ${INTERESTS_FILE}`, state.interestsSha);
    toast('Deleted', 'ok');
  } catch (e) {
    toast('Delete failed: ' + e.message, 'error');
  }
  loadInterestsList(); // resync from disk (also reverts the local splice on failure)
}

// ===========================================================================
//  Routing / init
// ===========================================================================
function selectSection(section) {
  state.section = section;
  el.nav.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.section === section));
  if (section === 'blog') loadBlogList();
  else if (section === 'research_interests') loadInterestsList();
  else loadDataEditor(section);
}
function showApp() {
  el.login.classList.add('hidden');
  el.app.classList.remove('hidden');
  selectSection('blog');
}

async function init() {
  el.repoLabel.textContent = `${OWNER}/${REPO}`;
  el.connectBtn.addEventListener('click', connect);
  el.tokenInput.addEventListener('keydown', e => { if (e.key === 'Enter') connect(); });
  el.signout.addEventListener('click', signout);
  el.nav.querySelectorAll('.tab').forEach(t =>
    t.addEventListener('click', () => selectSection(t.dataset.section)));

  // Served by the local backend? Then commit locally and skip the token login.
  try {
    const ping = await fetch('/api/ping');
    if (ping.ok) {
      state.local = true;
      el.signout.classList.add('hidden');
      showApp();
      toast('Local mode — saves commit to your local repo. Push when ready.', 'ok');
      return;
    }
  } catch (e) { /* no local backend → use the GitHub API flow below */ }

  state.token = loadToken();
  if (state.token) {
    // Verify the saved token still works before showing the app.
    validateToken().then(showApp).catch(() => {
      el.login.classList.remove('hidden');
      toast('Saved token is no longer valid — please reconnect', 'error');
    });
  } else {
    el.login.classList.remove('hidden');
  }
}
init();
