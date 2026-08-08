# Visual Content Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the single-file portfolio into a content-driven Windows XP site that the owner can manage visually through Pages CMS without editing code.

**Architecture:** Keep GitHub Pages as static hosting. Pages CMS edits four structured JSON files and media files in the repository; the browser loads, validates, filters, sorts, and renders those records into the existing Windows XP interface. Split the current 644 KB `index.html` into a small shell, focused CSS/JavaScript modules, JSON content, and external images.

**Tech Stack:** Static HTML/CSS, browser ES modules, JSON, Pages CMS `.pages.yml`, Node.js 25 built-in test runner, GitHub Pages.

## Global Constraints

- Preserve the current Windows XP visual design, window behavior, start menu, desktop, and mobile behavior.
- Daily project/page/resume/settings updates must not require code editing.
- The public site must contain no GitHub token, CMS password, or private credential.
- Editing access is granted only through GitHub repository write permissions.
- Hidden records use `published: false`; this controls site visibility, not secrecy in the public repository.
- Keep all seven current projects, all 26 case-study sections, all current links, and all nine embedded images.
- Do not publish or push implementation changes until the owner gives a separate final confirmation.
- Avoid a database, custom authentication server, framework rewrite, or drag-and-drop page builder.

---

## File Map

**Create**

- `content/projects.json` — top-level array of project records.
- `content/pages.json` — top-level array of generic page records.
- `content/resume.json` — structured resume object.
- `content/site.json` — owner, contacts, categories, and loading messages.
- `assets/css/site.css` — all existing and new portfolio styles.
- `assets/js/content.js` — fetch, validation, filtering, and sorting.
- `assets/js/render.js` — pure HTML render functions.
- `assets/js/app.js` — browser bootstrap and XP window interactions.
- `assets/media/projects/**` — images extracted from data URLs.
- `.pages.yml` — Pages CMS forms and media settings.
- `package.json` — local test and validation commands with no runtime dependencies.
- `scripts/migrate-legacy-content.mjs` — reproducible one-time migration from the legacy HTML.
- `scripts/validate-content.mjs` — repository content/media integrity check.
- `tests/content.test.mjs` — content contract tests.
- `tests/render.test.mjs` — renderer tests.
- `tests/migrate-content.test.mjs` — data-URL extraction test.
- `tests/pages-config.test.mjs` — CMS configuration smoke test.

**Modify**

- `index.html` — retain only the static XP shell and mount points; load external CSS and `app.js`.
- `docs/superpowers/specs/2026-08-08-visual-content-panel-design.md` — record the JSON-list simplification found during technical planning.

## Shared Interfaces

```js
// assets/js/content.js
export function normalizeBundle(rawBundle)
// -> { site, resume, projects: ProjectRecord[], pages: PageRecord[] }

export async function loadContent({ basePath = 'content', fetchImpl = fetch } = {})
// -> Promise<ReturnType<typeof normalizeBundle>>

export function compareByOrderThenTitle(a, b)
// -> negative | 0 | positive

// assets/js/render.js
export function renderDesktopShortcuts(bundle)
export function renderStartItems(bundle)
export function renderFolderItems(projects, viewMode)
export function renderProjectSections(project)
export function renderGenericPage(page)
export function renderResume(resume)
export function renderLoadError(message)
// Every render function returns an HTML string.
```

Canonical records:

```js
const project = {
  id: 'kortex',
  title: 'KORTEX',
  category: 'uxui',
  year: '2025',
  status: 'Завершён',
  icon: '📄',
  background: '#161616',
  summary: 'Краткое описание проекта',
  cover: '',
  gallery: [],
  tags: ['UX/UI'],
  behance: 'https://www.behance.net/...',
  order: 10,
  published: true,
  sections: [
    { id: 'overview', label: '📋 Обзор', content: '<p>Содержание</p>' }
  ]
};

const page = {
  id: 'about',
  title: 'Обо мне',
  icon: '🖥️',
  order: 10,
  published: true,
  showOnDesktop: true,
  showInStart: true,
  content: '<p>Содержание страницы</p>'
};
```

---

### Task 1: Content Contract, Loader, and Validation

**Files:**

- Create: `package.json`
- Create: `assets/js/content.js`
- Create: `tests/content.test.mjs`
- Create: `scripts/validate-content.mjs`

**Interfaces:**

- Consumes: four raw JSON values shaped as `site`, `resume`, `projects`, and `pages`.
- Produces: `normalizeBundle`, `loadContent`, and `compareByOrderThenTitle` with the signatures in Shared Interfaces.

- [ ] **Step 1: Add the dependency-free test commands**

```json
{
  "name": "marrorball-portfolio",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test tests/*.test.mjs",
    "validate:content": "node scripts/validate-content.mjs"
  }
}
```

- [ ] **Step 2: Write failing content tests**

```js
// tests/content.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  compareByOrderThenTitle,
  loadContent,
  normalizeBundle
} from '../assets/js/content.js';

const validRaw = {
  site: { owner: { name: 'Марат', role: 'UX/UI Designer' }, categories: [] },
  resume: { experience: [], education: [], publications: [], skills: [], tools: [] },
  projects: [
    { id: 'b', title: 'Бета', category: 'uxui', order: 20, published: true, sections: [] },
    { id: 'draft', title: 'Черновик', category: 'uxui', order: 5, published: false, sections: [] },
    { id: 'a', title: 'Альфа', category: 'uxui', order: 10, published: true, sections: [] }
  ],
  pages: [
    { id: 'about', title: 'Обо мне', icon: '🖥️', order: 10, published: true, content: '<p>Я</p>' }
  ]
};

test('normalizes, filters hidden records, and sorts published records', () => {
  const bundle = normalizeBundle(validRaw);
  assert.deepEqual(bundle.projects.map(({ id }) => id), ['a', 'b']);
  assert.deepEqual(bundle.pages.map(({ id }) => id), ['about']);
});

test('sorts equal order values by Russian title', () => {
  const values = [
    { title: 'Я', order: 10 },
    { title: 'А', order: 10 }
  ].sort(compareByOrderThenTitle);
  assert.deepEqual(values.map(({ title }) => title), ['А', 'Я']);
});

test('rejects duplicate ids', () => {
  assert.throws(
    () => normalizeBundle({ ...validRaw, projects: [validRaw.projects[0], validRaw.projects[0]] }),
    /Повторяющийся id: b/
  );
});

test('rejects a published project without a title', () => {
  assert.throws(
    () => normalizeBundle({ ...validRaw, projects: [{ id: 'broken', published: true, sections: [] }] }),
    /project broken: отсутствует title/
  );
});

test('loads all four content files and reports an HTTP failure', async () => {
  const responses = new Map([
    ['content/site.json', validRaw.site],
    ['content/resume.json', validRaw.resume],
    ['content/projects.json', validRaw.projects],
    ['content/pages.json', validRaw.pages]
  ]);
  const fetchImpl = async url => ({
    ok: responses.has(url),
    status: responses.has(url) ? 200 : 404,
    json: async () => responses.get(url)
  });
  const bundle = await loadContent({ fetchImpl });
  assert.equal(bundle.projects.length, 2);
  await assert.rejects(
    loadContent({ basePath: 'missing', fetchImpl }),
    /Не удалось загрузить missing\/site.json: HTTP 404/
  );
});
```

- [ ] **Step 3: Run tests and confirm the module is missing**

Run: `npm test`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `assets/js/content.js`.

- [ ] **Step 4: Implement the minimal data module**

```js
// assets/js/content.js
const collator = new Intl.Collator('ru');

export function compareByOrderThenTitle(a, b) {
  return (Number(a.order) || 0) - (Number(b.order) || 0)
    || collator.compare(a.title || '', b.title || '');
}

function requireField(record, field, kind) {
  if (record[field] === undefined || record[field] === null || record[field] === '') {
    throw new Error(`${kind} ${record.id || '(без id)'}: отсутствует ${field}`);
  }
}

function assertUniqueIds(records) {
  const seen = new Set();
  for (const record of records) {
    requireField(record, 'id', 'record');
    if (seen.has(record.id)) throw new Error(`Повторяющийся id: ${record.id}`);
    seen.add(record.id);
  }
}

export function normalizeBundle({ site, resume, projects, pages }) {
  if (!site || !resume || !Array.isArray(projects) || !Array.isArray(pages)) {
    throw new Error('Неверная структура файлов content');
  }
  assertUniqueIds([...projects, ...pages]);
  const visibleProjects = projects.filter(item => item.published !== false);
  const visiblePages = pages.filter(item => item.published !== false);
  for (const item of visibleProjects) requireField(item, 'title', 'project');
  for (const item of visiblePages) requireField(item, 'title', 'page');
  return {
    site,
    resume,
    projects: visibleProjects.sort(compareByOrderThenTitle),
    pages: visiblePages.sort(compareByOrderThenTitle)
  };
}

export async function loadContent({ basePath = 'content', fetchImpl = fetch } = {}) {
  const names = ['site', 'resume', 'projects', 'pages'];
  const values = await Promise.all(names.map(async name => {
    const url = `${basePath}/${name}.json`;
    const response = await fetchImpl(url);
    if (!response.ok) throw new Error(`Не удалось загрузить ${url}: HTTP ${response.status}`);
    return response.json();
  }));
  return normalizeBundle(Object.fromEntries(names.map((name, index) => [name, values[index]])));
}
```

- [ ] **Step 5: Add the repository validator**

`scripts/validate-content.mjs` must read the four files, call `normalizeBundle`, scan every `cover`, `gallery[]`, and `<img src="...">` reference beginning with `/portfolio/assets/`, and fail when the referenced file does not exist.

```js
import { readFile, access } from 'node:fs/promises';
import { normalizeBundle } from '../assets/js/content.js';

const names = ['site', 'resume', 'projects', 'pages'];
const entries = await Promise.all(names.map(async name => [
  name,
  JSON.parse(await readFile(new URL(`../content/${name}.json`, import.meta.url), 'utf8'))
]));
const bundle = normalizeBundle(Object.fromEntries(entries));
const paths = JSON.stringify(bundle).match(/\/portfolio\/assets\/media\/[^"'<> ]+/g) || [];
for (const publicPath of new Set(paths)) {
  await access(new URL(`..${publicPath.replace('/portfolio', '')}`, import.meta.url));
}
console.log(`OK: ${bundle.projects.length} проектов, ${bundle.pages.length} страниц`);
```

- [ ] **Step 6: Run the tests**

Run: `npm test`

Expected: 5 tests PASS.

- [ ] **Step 7: Commit the data contract**

```bash
git add package.json assets/js/content.js tests/content.test.mjs scripts/validate-content.mjs
git commit -m "test: define portfolio content contract"
```

---

### Task 2: Migrate Legacy Content and Extract Images

**Files:**

- Create: `scripts/migrate-legacy-content.mjs`
- Create: `tests/migrate-content.test.mjs`
- Create: `content/projects.json`
- Create: `content/pages.json`
- Create: `content/resume.json`
- Create: `content/site.json`
- Create: `assets/media/projects/**`

**Interfaces:**

- Consumes: legacy `index.html`, especially `folders`, `projects`, about, resume, contact, and loading content.
- Produces: four canonical JSON values accepted by `normalizeBundle`; nine external image files; `extractDataUris(html, destination, publicBase)` for migration tests.

- [ ] **Step 1: Write a failing extraction test**

```js
// tests/migrate-content.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { extractDataUris } from '../scripts/migrate-legacy-content.mjs';

test('extracts a data image and replaces it with a public path', async () => {
  const destination = await mkdtemp(join(tmpdir(), 'portfolio-image-'));
  const html = '<img src="data:image/png;base64,aGVsbG8=">';
  const result = await extractDataUris(html, destination, '/portfolio/assets/media/test');
  assert.equal(result.html, '<img src="/portfolio/assets/media/test/image-01.png">');
  assert.equal((await readFile(join(destination, 'image-01.png'))).toString(), 'hello');
  assert.equal(result.files.length, 1);
});
```

- [ ] **Step 2: Run the extraction test and confirm failure**

Run: `node --test tests/migrate-content.test.mjs`

Expected: FAIL because `scripts/migrate-legacy-content.mjs` does not exist.

- [ ] **Step 3: Implement the migration helpers and CLI**

The script must:

1. read the legacy HTML;
2. evaluate only the slice from `const folders =` through the end of `const projects =` in an empty `node:vm` context;
3. map folder membership to `category` and item order;
4. convert every project tab to a section;
5. extract every data URL with `extractDataUris`;
6. write formatted JSON using `JSON.stringify(value, null, 2) + '\n'`;
7. refuse to overwrite existing `content/*.json` unless run with `--force`.

```js
export async function extractDataUris(html, destination, publicBase) {
  await mkdir(destination, { recursive: true });
  const pattern = /data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)/g;
  const matches = [...html.matchAll(pattern)];
  const files = [];
  let output = html;
  for (const [index, match] of matches.entries()) {
    const extension = match[1] === 'jpeg' ? 'jpg' : match[1];
    const filename = `image-${String(index + 1).padStart(2, '0')}.${extension}`;
    await writeFile(join(destination, filename), Buffer.from(match[2], 'base64'));
    output = output.replace(match[0], `${publicBase}/${filename}`);
    files.push(filename);
  }
  return { html: output, files };
}
```

Project mapping must use these exact field rules:

```js
{
  id,
  title: legacy.title,
  category: folderId,
  year: legacy.meta?.match(/20\d{2}/)?.[0] || '',
  status: legacy.status || '',
  icon: legacy.ico || '📄',
  background: legacy.bg || '#ffffff',
  summary: legacy.desc || '',
  cover: '',
  gallery: [],
  tags: legacy.tags || [],
  behance: legacy.behance || '',
  order: (folderIndex + 1) * 10,
  published: true,
  sections: legacy.tabs.map((tab, index) => ({
    id: tab.id || `section-${index + 1}`,
    label: tab.label,
    content: extractedHtml
  }))
}
```

- [ ] **Step 4: Run the focused migration test**

Run: `node --test tests/migrate-content.test.mjs`

Expected: 1 test PASS.

- [ ] **Step 5: Run the migration against the legacy page**

Run: `node scripts/migrate-legacy-content.mjs`

Expected summary:

```text
Migrated: 7 projects, 26 sections, 9 images
```

`content/site.json` must contain the two categories `uxui` and `graphic`, current owner/contact fields, and all five loading messages. `content/pages.json` must contain `about` and `contact`. `content/resume.json` must contain the current experience, education, publications, skills, tools, and links.

- [ ] **Step 6: Validate migration completeness**

Run: `npm run validate:content`

Expected: `OK: 7 проектов, 2 страниц`.

Run: `rg -o 'data:image/' content assets/media | wc -l`

Expected: `0`.

Run: `find assets/media/projects -type f | wc -l`

Expected: `9`.

- [ ] **Step 7: Commit migrated content and assets**

```bash
git add scripts/migrate-legacy-content.mjs tests/migrate-content.test.mjs content assets/media
git commit -m "refactor: extract portfolio content and media"
```

---

### Task 3: Configure the Private Visual Editor

**Files:**

- Create: `.pages.yml`
- Create: `tests/pages-config.test.mjs`

**Interfaces:**

- Consumes: the exact record field names defined in Shared Interfaces and Task 2.
- Produces: Pages CMS sidebar entries `projects`, `pages`, `resume`, and `site`; image uploads under `assets/media` with public URLs under `/portfolio/assets/media`.

- [ ] **Step 1: Write the failing configuration smoke test**

```js
// tests/pages-config.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('Pages CMS config exposes only the four intended content areas', async () => {
  const yaml = await readFile(new URL('../.pages.yml', import.meta.url), 'utf8');
  for (const path of [
    'content/projects.json',
    'content/pages.json',
    'content/resume.json',
    'content/site.json'
  ]) assert.match(yaml, new RegExp(`path: ${path.replaceAll('.', '\\.')}`));
  assert.match(yaml, /input: assets\/media/);
  assert.match(yaml, /output: \/portfolio\/assets\/media/);
  assert.doesNotMatch(yaml, /token|password|client_secret/i);
});
```

- [ ] **Step 2: Run the test and confirm `.pages.yml` is missing**

Run: `node --test tests/pages-config.test.mjs`

Expected: FAIL with `ENOENT`.

- [ ] **Step 3: Create the Pages CMS configuration**

The file starts with:

```yaml
media:
  input: assets/media
  output: /portfolio/assets/media
  rename: safe
  extensions: [png, jpg, jpeg, webp, gif]

content:
  - name: projects
    label: Проекты
    type: file
    path: content/projects.json
    format: json
    list: true
    fields:
      - { name: id, label: Идентификатор, type: string, required: true }
      - { name: title, label: Название, type: string, required: true }
      - name: category
        label: Категория
        type: select
        required: true
        options:
          values:
            - { value: uxui, label: UX/UI }
            - { value: graphic, label: Графический дизайн }
      - { name: year, label: Год, type: string }
      - { name: status, label: Статус, type: string }
      - { name: icon, label: Иконка, type: string, default: "📄" }
      - { name: background, label: Цвет карточки, type: string, default: "#ffffff" }
      - { name: summary, label: Краткое описание, type: text }
      - { name: cover, label: Обложка, type: image }
      - { name: gallery, label: Галерея, type: image, list: true }
      - { name: tags, label: Теги, type: string, list: true }
      - { name: behance, label: Ссылка Behance, type: string }
      - { name: order, label: Порядок, type: number, default: 100 }
      - { name: published, label: Опубликован, type: boolean, default: true }
      - name: sections
        label: Разделы кейса
        type: object
        list:
          min: 1
          collapsible:
            collapsed: true
            summary: "{label}"
        fields:
          - { name: id, label: Идентификатор вкладки, type: string, required: true }
          - { name: label, label: Название вкладки, type: string, required: true }
          - name: content
            label: Содержимое
            type: rich-text
            options:
              format: html
              path: projects
              rename: safe
              switcher: true
```

Add `pages` as a top-level JSON list with fields `id`, `title`, `icon`, `order`, `published`, `showOnDesktop`, `showInStart`, and HTML rich-text `content`.

Add `resume` as an object file with repeatable object lists:

- `experience`: `company`, `role`, `period`, `description`;
- `education`: `institution`, `program`, `period`, `description`;
- `publications`: `title`, `year`, `url`;
- `skills`: `name`, `level`;
- `tools`: repeatable strings;
- `links`: `label`, `url`.

Add `site` as an object file with:

- `owner`: `name`, `role`, `experience`, `location`, `status`, `bio`;
- `contacts`: `email`, `telegram`, `behance`;
- repeatable `categories`: `id`, `title`, `icon`, `order`, `showOnDesktop`, `showInStart`;
- repeatable string `loadingMessages`.

- [ ] **Step 4: Validate YAML and run tests**

Run: `ruby -e 'require "yaml"; YAML.load_file(".pages.yml"); puts "YAML OK"'`

Expected: `YAML OK`.

Run: `npm test`

Expected: all tests PASS.

- [ ] **Step 5: Commit the CMS configuration**

```bash
git add .pages.yml tests/pages-config.test.mjs
git commit -m "feat: configure Pages CMS editor"
```

---

### Task 4: Render Content-Driven Windows XP Interface

**Files:**

- Create: `assets/css/site.css`
- Create: `assets/js/render.js`
- Create: `tests/render.test.mjs`
- Modify: `index.html`

**Interfaces:**

- Consumes: normalized bundle returned by `normalizeBundle`.
- Produces: all pure render functions in Shared Interfaces and static mount points with IDs `desktop-icons`, `start-items`, `folder-grid`, `dynamic-windows`, `resume-content`, and `contact-links`.

- [ ] **Step 1: Write failing renderer tests**

```js
// tests/render.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  renderDesktopShortcuts,
  renderFolderItems,
  renderGenericPage,
  renderLoadError,
  renderProjectSections
} from '../assets/js/render.js';

const bundle = {
  site: { categories: [{ id: 'uxui', title: 'UX/UI', icon: '💼', order: 10, showOnDesktop: true }] },
  projects: [],
  pages: [{ id: 'about', title: 'Обо мне', icon: '🖥️', showOnDesktop: true, content: '<p>Привет</p>' }]
};

test('renders category and page desktop shortcuts with data actions', () => {
  const html = renderDesktopShortcuts(bundle);
  assert.match(html, /data-action="open-folder" data-id="uxui"/);
  assert.match(html, /data-action="open-page" data-id="about"/);
});

test('escapes project titles but preserves owner-authored rich HTML sections', () => {
  const folder = renderFolderItems([{ id: 'x', title: '<script>', icon: '📄', background: '#fff' }], 'icons');
  assert.doesNotMatch(folder, /<script>/);
  assert.match(folder, /&lt;script&gt;/);
  const sections = renderProjectSections({ id: 'x', sections: [{ id: 'a', label: 'Обзор', content: '<p>Текст</p>' }] });
  assert.match(sections, /<p>Текст<\/p>/);
});

test('renders a generic page and a useful loading error', () => {
  assert.match(renderGenericPage(bundle.pages[0]), /Привет/);
  assert.match(renderLoadError('HTTP 404'), /Не удалось загрузить портфолио/);
});
```

- [ ] **Step 2: Run renderer tests and confirm failure**

Run: `node --test tests/render.test.mjs`

Expected: FAIL because `assets/js/render.js` does not exist.

- [ ] **Step 3: Implement pure render functions**

All user-controlled text fields outside rich-text `content` must pass through:

```js
export function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[character]);
}
```

Interactive output must use `data-action` and `data-id`, never inline `onclick` built from content values. Example:

```js
export function renderDesktopShortcuts({ site, pages }) {
  const categories = (site.categories || []).filter(item => item.showOnDesktop);
  const visiblePages = pages.filter(item => item.showOnDesktop);
  return [
    ...categories.map(item => `<button class="d-icon" data-action="open-folder" data-id="${escapeHtml(item.id)}"><span class="ico">${escapeHtml(item.icon)}</span><span>${escapeHtml(item.title)}</span></button>`),
    ...visiblePages.map(item => `<button class="d-icon" data-action="open-page" data-id="${escapeHtml(item.id)}"><span class="ico">${escapeHtml(item.icon)}</span><span>${escapeHtml(item.title)}</span></button>`)
  ].join('');
}
```

- [ ] **Step 4: Extract CSS without changing computed rules**

Move the complete `<style>...</style>` block from `index.html` to `assets/css/site.css`. Replace it with:

```html
<link rel="stylesheet" href="assets/css/site.css">
```

Do not rename existing XP CSS classes in this task.

- [ ] **Step 5: Reduce `index.html` to the shell and mount points**

Remove the inline `folders` and `projects` objects, inline content for about/resume/contact, and inline application script. Keep the taskbar, reusable explorer/detail windows, loading window, message box, and overlay.

Add:

```html
<div class="desk-icons" id="desktop-icons"></div>
<div id="dynamic-windows"></div>
<div id="start-items"></div>
<script type="module" src="assets/js/app.js"></script>
```

Replace fixed resume and contact bodies with `resume-content` and `contact-links` mount points.

- [ ] **Step 6: Run renderer and content tests**

Run: `npm test`

Expected: all tests PASS.

- [ ] **Step 7: Commit the shell and renderer**

```bash
git add index.html assets/css/site.css assets/js/render.js tests/render.test.mjs
git commit -m "refactor: render portfolio from content data"
```

---

### Task 5: Wire Data, Window Interactions, and Failure State

**Files:**

- Create: `assets/js/app.js`
- Modify: `assets/css/site.css`
- Modify: `index.html`
- Modify: `tests/content.test.mjs`

**Interfaces:**

- Consumes: `loadContent()` and all `render.js` functions.
- Produces: `bootstrapPortfolio()` and working delegated actions `open-folder`, `open-project`, `open-page`, `close-window`, `switch-project-section`, `toggle-start`, and `toggle-view`.

- [ ] **Step 1: Add a failing graceful-degradation test**

Add to `tests/content.test.mjs`:

```js
test('does not return partial content when one file fails', async () => {
  const fetchImpl = async url => ({
    ok: !url.endsWith('/resume.json'),
    status: 500,
    json: async () => ({})
  });
  await assert.rejects(loadContent({ fetchImpl }), /resume\.json: HTTP 500/);
});
```

- [ ] **Step 2: Run the focused test**

Run: `node --test tests/content.test.mjs`

Expected: PASS if Task 1 correctly uses `Promise.all`; if it exposes partial content, make it fail before continuing.

- [ ] **Step 3: Implement browser bootstrap**

```js
// assets/js/app.js
import { loadContent } from './content.js';
import {
  renderDesktopShortcuts,
  renderFolderItems,
  renderGenericPage,
  renderLoadError,
  renderProjectSections,
  renderResume,
  renderStartItems
} from './render.js';

let bundle;
let currentFolder = 'uxui';
let currentProject;
let viewMode = 'icons';

export async function bootstrapPortfolio() {
  try {
    bundle = await loadContent();
    document.querySelector('#desktop-icons').innerHTML = renderDesktopShortcuts(bundle);
    document.querySelector('#start-items').innerHTML = renderStartItems(bundle);
    document.querySelector('#resume-content').innerHTML = renderResume(bundle.resume);
    createGenericPageWindows(bundle.pages);
    startLoadingSequence(bundle.site.loadingMessages || ['Добро пожаловать!']);
  } catch (error) {
    document.querySelector('#win-loading .win-body').innerHTML = renderLoadError(error.message);
  }
}

document.addEventListener('click', event => {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  handleAction(target.dataset.action, target.dataset.id, target);
});

bootstrapPortfolio();
```

Define the helpers referenced by `bootstrapPortfolio` explicitly:

```js
function createGenericPageWindows(pages) {
  document.querySelector('#dynamic-windows').innerHTML = pages.map(renderGenericPage).join('');
}

function startLoadingSequence(messages) {
  let index = 0;
  const step = () => {
    if (index >= messages.length) {
      document.querySelector('#win-loading').style.display = 'none';
      const firstPage = bundle.pages.find(page => page.id === 'about') || bundle.pages[0];
      if (firstPage) openWindow(`win-page-${firstPage.id}`);
      return;
    }
    updateLoadingWindow(messages[index], index, messages.length);
    index += 1;
    window.setTimeout(step, index === messages.length ? 600 : 1200);
  };
  step();
}

function handleAction(action, id, element) {
  const actions = {
    'open-folder': () => openFolder(id),
    'open-project': () => openProject(id),
    'open-page': () => openWindow(`win-page-${id}`),
    'close-window': () => closeWindow(id),
    'switch-project-section': () => switchProjectSection(id, element.dataset.sectionId),
    'toggle-start': toggleStartMenu,
    'toggle-view': toggleViewMode
  };
  actions[action]?.();
}
```

Move the existing drag/focus/open/close/taskbar/start-menu/mobile/clock logic into focused functions in this file. Replace inline handlers with delegated `data-action` handling. Preserve the existing mobile rule: a single tap opens an item at widths up to 640 px, and windows become full-screen.

- [ ] **Step 4: Connect folders and projects**

`openFolder(categoryId)` filters `bundle.projects` by category, sorts through the already normalized order, updates explorer labels from `bundle.site.categories`, renders items, and opens the explorer window.

`openProject(projectId)` fills the shared detail window from the selected project, writes tabs/sections from `renderProjectSections`, and hides the Behance control when the project has no link.

- [ ] **Step 5: Connect generic pages, resume, contacts, and menus**

Create one window per published page under `#dynamic-windows`, with stable IDs `win-page-${page.id}`. Build desktop shortcuts and start-menu items only from records whose visibility flags are true. Generate contact links from `site.contacts` and use `mailto:` and `https://t.me/` only after validating the corresponding values.

- [ ] **Step 6: Run automated checks**

Run: `npm test && npm run validate:content`

Expected: all tests PASS and validator reports 7 projects and 2 pages.

Run: `rg -n "const projects|const folders|data:image/|onclick=|ondblclick=" index.html assets content`

Expected: no matches for legacy data objects, embedded images, or inline event handlers.

- [ ] **Step 7: Commit the application wiring**

```bash
git add index.html assets/js/app.js assets/css/site.css tests/content.test.mjs
git commit -m "feat: load editable content into XP interface"
```

---

### Task 6: End-to-End Verification and Owner Handoff

**Files:**

- Modify: `README.md` if it exists; otherwise create `README.md`.
- Modify only if verification finds defects: `index.html`, `assets/**`, `content/**`, `.pages.yml`.

**Interfaces:**

- Consumes: complete local implementation from Tasks 1–5.
- Produces: verified local site, owner instructions, and a clean branch ready for push after explicit approval.

- [ ] **Step 1: Run the complete automated suite**

Run: `npm test`

Expected: every Node test PASS.

Run: `npm run validate:content`

Expected: `OK: 7 проектов, 2 страниц`.

Run: `ruby -e 'require "yaml"; YAML.load_file(".pages.yml"); puts "YAML OK"'`

Expected: `YAML OK`.

Run: `git diff --check`

Expected: no output.

- [ ] **Step 2: Start a local static server**

Run: `python3 -m http.server 4173`

Open: `http://127.0.0.1:4173/`

Expected: loading sequence completes and the about page opens without a console error.

- [ ] **Step 3: Verify desktop behavior in the browser**

At a desktop viewport, verify:

- all configured desktop icons and start items appear;
- UX/UI contains 3 projects and Graphic Design contains 4;
- all 7 projects open;
- all 26 sections switch correctly;
- all 9 migrated images load;
- window focus, drag, close, taskbar restore, list/icon view, and start menu work;
- Email, Telegram, and Behance targets equal the migrated URLs.

- [ ] **Step 4: Verify mobile behavior**

At a 390 × 844 viewport, verify:

- one tap opens shortcuts and projects;
- windows use the full-screen mobile layout;
- project content and tabs remain scrollable;
- taskbar and start menu remain usable;
- no horizontal page overflow occurs.

- [ ] **Step 5: Verify failure behavior**

Temporarily request a nonexistent content base path in the browser console by calling `loadContent({ basePath: 'missing' })` and confirm the rejected error names the missing file. Separately serve a temporary copy with `content/resume.json` renamed and confirm the loading window displays the XP-style error instead of a blank screen. Restore the file before continuing.

- [ ] **Step 6: Document the owner workflow**

Create `README.md` with these exact owner steps:

1. Open `https://app.pagescms.org/`.
2. Sign in with the GitHub account that owns `marrorball/portfolio`.
3. Choose the `marrorball/portfolio` repository and `main` branch.
4. Open «Проекты», «Страницы», «Резюме», or «Настройки сайта».
5. Save the form; Pages CMS commits the change to GitHub.
6. Wait for GitHub Pages to refresh the public site.
7. Use `published: false` to hide an entry without deleting it.

State clearly that no password or token is entered into the portfolio itself.

- [ ] **Step 7: Commit verification fixes and documentation**

```bash
git add README.md index.html assets content .pages.yml tests scripts package.json
git commit -m "docs: add visual editing workflow"
```

Skip this commit when `git status --short` shows no changes after verification.

- [ ] **Step 8: Stop before external publication**

Show the owner the local result and request explicit permission to push `main` to `origin`. Do not run `git push` yet.

After approval, push, wait for GitHub Pages deployment, open the public site, and have the owner authorize Pages CMS with GitHub. Confirm that a temporary hidden project can be created and deleted in the CMS without appearing publicly.

---

## Plan Self-Review Checklist

- Every agreed content area maps to a CMS form and a JSON file.
- Every current project, section, image, contact, and mobile behavior has a migration or verification step.
- Field names are consistent across the canonical record, CMS schema, loader, renderer, and tests.
- No runtime package or custom server is required.
- The public site contains no authentication secret.
- Publication remains behind a separate owner approval.
- The plan contains no deferred implementation placeholders.

## Primary References

- Pages CMS content entries: https://pagescms.org/docs/configuration/content/
- Pages CMS top-level JSON lists: https://pagescms.org/docs/configuration/content/list/
- Pages CMS HTML rich text: https://pagescms.org/docs/configuration/fields/rich-text/
- Pages CMS media paths and safe renaming: https://pagescms.org/docs/configuration/media/
- GitHub Pages publishing behavior: https://docs.github.com/en/pages/
