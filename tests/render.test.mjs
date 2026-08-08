import test from 'node:test';
import assert from 'node:assert/strict';
import {
  renderContact,
  renderDesktopShortcuts,
  renderFolderItems,
  renderGenericPage,
  renderLoadError,
  renderProjectSections,
  renderResume,
  renderStartItems
} from '../assets/js/render.js';

const bundle = {
  site: {
    owner: { name: 'Марат', role: 'UX/UI Designer' },
    contacts: {
      email: 'marrorball@gmail.com',
      telegram: 'marrorball',
      behance: 'https://www.behance.net/marmaraj11'
    },
    categories: [
      { id: 'uxui', title: 'UX/UI', icon: '💼', order: 10, showOnDesktop: true, showInStart: true }
    ]
  },
  projects: [],
  pages: [
    {
      id: 'about',
      title: 'Обо мне',
      icon: '🖥️',
      showOnDesktop: true,
      showInStart: true,
      content: '<p>Привет</p>'
    }
  ]
};

test('renders category and page desktop shortcuts with data actions', () => {
  const html = renderDesktopShortcuts(bundle);
  assert.match(html, /data-action="open-folder" data-id="uxui"/);
  assert.match(html, /data-action="open-page" data-id="about"/);
  assert.match(html, /data-action="open-resume"/);
});

test('renders visible start-menu entries', () => {
  const html = renderStartItems(bundle);
  assert.match(html, /UX\/UI/);
  assert.match(html, /Обо мне/);
  assert.match(html, /Резюме/);
});

test('escapes project titles but preserves owner-authored rich HTML sections', () => {
  const folder = renderFolderItems([
    { id: 'x', title: '<script>', icon: '📄', background: '#fff' }
  ], 'icons');
  assert.doesNotMatch(folder, /<script>/);
  assert.match(folder, /&lt;script&gt;/);

  const sections = renderProjectSections({
    id: 'x',
    sections: [{ id: 'a', label: 'Обзор', content: '<p>Текст</p>' }]
  });
  assert.match(sections, /<p>Текст<\/p>/);
  assert.match(sections, /data-section-panel="a"/);
});

test('renders a generic page and a useful loading error', () => {
  assert.match(renderGenericPage(bundle.pages[0]), /Привет/);
  assert.match(renderLoadError('HTTP 404'), /Не удалось загрузить портфолио/);
  assert.match(renderLoadError('HTTP 404'), /HTTP 404/);
});

test('renders resume and safe contact links from structured data', () => {
  const resume = renderResume({
    experience: [{ company: 'Студия', role: 'Дизайнер', period: '2025', description: 'Работа' }],
    education: [],
    publications: [],
    skills: [],
    tools: ['Figma'],
    links: [],
    about: 'О себе'
  });
  assert.match(resume, /Студия/);
  assert.match(resume, /Figma/);

  const contact = renderContact(bundle.site);
  assert.match(contact, /mailto:marrorball@gmail\.com/);
  assert.match(contact, /https:\/\/t\.me\/marrorball/);
  assert.match(contact, /https:\/\/www\.behance\.net\/marmaraj11/);
});
