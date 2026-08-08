import test from 'node:test';
import assert from 'node:assert/strict';
import {
  collectMediaPaths,
  compareByOrderThenTitle,
  loadContent,
  normalizeBundle
} from '../assets/js/content.js';

const validRaw = {
  site: {
    owner: { name: 'Марат', role: 'UX/UI Designer' },
    categories: []
  },
  resume: {
    experience: [],
    education: [],
    publications: [],
    skills: [],
    tools: [],
    links: []
  },
  projects: [
    {
      id: 'b',
      title: 'Бета',
      category: 'uxui',
      order: 20,
      published: true,
      sections: []
    },
    {
      id: 'draft',
      title: 'Черновик',
      category: 'uxui',
      order: 5,
      published: false,
      sections: []
    },
    {
      id: 'a',
      title: 'Альфа',
      category: 'uxui',
      order: 10,
      published: true,
      sections: []
    }
  ],
  pages: [
    {
      id: 'about',
      title: 'Обо мне',
      icon: '🖥️',
      order: 10,
      published: true,
      content: '<p>Я</p>'
    }
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
    () => normalizeBundle({
      ...validRaw,
      projects: [validRaw.projects[0], validRaw.projects[0]]
    }),
    /Повторяющийся id: b/
  );
});

test('rejects a published project without a title', () => {
  assert.throws(
    () => normalizeBundle({
      ...validRaw,
      projects: [{ id: 'broken', published: true, sections: [] }]
    }),
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

test('collects local media paths from fields and rich HTML only', () => {
  const paths = collectMediaPaths({
    cover: '/portfolio/assets/media/cover.webp',
    gallery: ['/portfolio/assets/media/one.jpg', 'https://example.com/two.jpg'],
    sections: [{
      content: '<img src="/portfolio/assets/media/inside.png"><img src="https://example.com/outside.png">'
    }]
  });
  assert.deepEqual(paths, [
    '/portfolio/assets/media/cover.webp',
    '/portfolio/assets/media/inside.png',
    '/portfolio/assets/media/one.jpg'
  ]);
});
