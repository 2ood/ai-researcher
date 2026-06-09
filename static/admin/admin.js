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

// YAML: JSON schema keeps dates/ids as strings (no surprise Date objects) and ints as numbers.
const Y_SCHEMA = jsyaml.JSON_SCHEMA;
const Y_DUMP = { schema: Y_SCHEMA, lineWidth: -1, noRefs: true };

// ---- State ----------------------------------------------------------------
const state = {
  token: localStorage.getItem(TOKEN_KEY) || '',
  section: 'blog',
  model: null,     // parsed YAML for the active data file
  sha: null,       // sha of the active file (data editor or blog post)
  path: null,      // path of the active file
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

async function listDir(dir) {
  return gh('GET', contentPath(dir) + '?ref=' + BRANCH);
}
async function getFile(path) {
  const data = await gh('GET', contentPath(path) + '?ref=' + BRANCH);
  return { text: fromBase64(data.content), sha: data.sha };
}
async function putFile(path, text, message, sha) {
  const body = { message, content: toBase64(text), branch: BRANCH };
  if (sha) body.sha = sha;
  const res = await gh('PUT', contentPath(path), body);
  return res.content.sha;
}
async function deleteFile(path, message, sha) {
  return gh('DELETE', contentPath(path), { message, sha, branch: BRANCH });
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
    localStorage.setItem(TOKEN_KEY, token);
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
  localStorage.removeItem(TOKEN_KEY);
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
  research_interests: {
    file: 'data/research_interests.yml', label: 'Research Interests', root: 'list',
    fields: [
      { key: 'title', type: 'text', label: 'Title' },
      { key: 'summary', type: 'textarea', label: 'Summary (shown on home)' },
      { key: 'details', type: 'textarea', label: 'Details (markdown, shown on the dedicated page)' },
    ],
  },
  research_tracks: {
    file: 'data/research_tracks.yml', label: 'Research Tracks', root: 'list',
    fields: [
      { key: 'num', type: 'text', label: 'Number (e.g. 01)' },
      { key: 'title', type: 'text', label: 'Title' },
      { key: 'description', type: 'textarea', label: 'Description' },
      { key: 'papers', type: 'list', label: 'Papers', fields: [
        { key: 'title', type: 'text', label: 'Title' },
        { key: 'venue', type: 'text', label: 'Venue' },
        { key: 'url', type: 'text', label: 'URL' },
        { key: 'award', type: 'text', label: 'Award (optional)' },
      ] },
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
  if (field.type === 'textarea') {
    return `<div class="field"><label>${esc(field.label)}</label>
      <textarea rows="3" data-path="${path}">${esc(v)}</textarea></div>`;
  }
  if (field.type === 'select') {
    const opts = field.options.map(o =>
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
  el.view.innerHTML = `<p class="loading">Loading…</p>`;
  const cfg = EDITORS[section];
  try {
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

  el.view.innerHTML = `
    <div class="view-head">
      <h2>${path ? 'Edit post' : 'New post'}</h2>
      <div class="view-actions"><button id="back-blog" class="btn btn--ghost">← Back</button></div>
    </div>
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
    <div class="field"><label>Body (Markdown)</label>
      <div class="editor-grid with-preview">
        <textarea id="f-body" class="body-area">${esc(body)}</textarea>
        <div id="preview" class="preview"></div>
      </div>
    </div>
    <div class="sticky-actions">
      <button id="back-blog-2" class="btn btn--ghost">Cancel</button>
      <button id="save-post" class="btn btn--primary">${path ? 'Save post' : 'Create post'}</button>
    </div>`;

  const bodyEl = document.getElementById('f-body');
  const preview = document.getElementById('preview');
  const renderPreview = () => { preview.innerHTML = marked.parse(bodyEl.value || ''); };
  bodyEl.addEventListener('input', renderPreview);
  renderPreview();

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
//  Routing / init
// ===========================================================================
function selectSection(section) {
  state.section = section;
  el.nav.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.section === section));
  if (section === 'blog') loadBlogList();
  else loadDataEditor(section);
}
function showApp() {
  el.login.classList.add('hidden');
  el.app.classList.remove('hidden');
  selectSection('blog');
}

function init() {
  el.repoLabel.textContent = `${OWNER}/${REPO}`;
  el.connectBtn.addEventListener('click', connect);
  el.tokenInput.addEventListener('keydown', e => { if (e.key === 'Enter') connect(); });
  el.signout.addEventListener('click', signout);
  el.nav.querySelectorAll('.tab').forEach(t =>
    t.addEventListener('click', () => selectSection(t.dataset.section)));

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
