const collator = new Intl.Collator('ru');

export function collectMediaPaths(value) {
  const matches = JSON.stringify(value)
    .match(/\/portfolio\/assets\/media\/[^"'<>\\\s]+/g) || [];
  return [...new Set(matches)].sort();
}

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
    if (!response.ok) {
      throw new Error(`Не удалось загрузить ${url}: HTTP ${response.status}`);
    }
    return response.json();
  }));

  return normalizeBundle(
    Object.fromEntries(names.map((name, index) => [name, values[index]]))
  );
}
