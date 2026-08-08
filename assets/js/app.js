import { loadContent } from './content.js';
import {
  escapeHtml,
  renderDesktopShortcuts,
  renderFolderItems,
  renderGenericPage,
  renderLoadError,
  renderProjectSections,
  renderResume,
  renderStartItems
} from './render.js';

let bundle;
let currentFolder = '';
let currentProject = null;
let selectedProjectId = '';
let viewMode = 'icons';
let topZIndex = 100;
let startMenuOpen = false;
let dragState = null;

function getCategory(categoryId) {
  return bundle.site.categories.find(category => category.id === categoryId);
}

function getProject(projectId) {
  return bundle.projects.find(project => project.id === projectId);
}

function isMobile() {
  return window.matchMedia('(max-width:640px)').matches;
}

function taskbarLabel(windowElement) {
  return windowElement.dataset.windowName
    || windowElement.querySelector('.t-label')?.textContent
    || windowElement.id;
}

function addTaskbarButton(windowElement) {
  const id = `tb-${windowElement.id}`;
  if (document.getElementById(id)) return;
  const label = taskbarLabel(windowElement);
  const button = document.createElement('button');
  button.className = 'tb-w';
  button.id = id;
  button.dataset.action = 'focus-window';
  button.dataset.id = windowElement.id;
  button.innerHTML = `<span class="tw-ico">${escapeHtml(label.split(' ')[0])}</span>${escapeHtml(label.split(' ').slice(1).join(' '))}`;
  document.querySelector('#tb-wins').append(button);
}

function focusWindow(windowId) {
  const windowElement = document.getElementById(windowId);
  if (!windowElement) return;
  if (windowElement.style.display === 'none' || !windowElement.style.display) {
    windowElement.style.display = 'block';
  }
  topZIndex += 1;
  windowElement.style.zIndex = topZIndex;
  document.querySelectorAll('.win').forEach(item => {
    item.querySelector('.win-title')?.classList.toggle('inactive', item !== windowElement);
  });
  document.querySelectorAll('.tb-w').forEach(button => {
    button.classList.toggle('act', button.dataset.id === windowId);
  });
  addTaskbarButton(windowElement);
}

function openWindow(windowId) {
  const windowElement = document.getElementById(windowId);
  if (!windowElement) return;
  windowElement.style.display = 'block';
  focusWindow(windowId);
}

function closeWindow(windowId) {
  const windowElement = document.getElementById(windowId);
  if (!windowElement) return;
  windowElement.style.display = 'none';
  document.getElementById(`tb-${windowId}`)?.remove();
}

function maximizeWindow(windowId) {
  const windowElement = document.getElementById(windowId);
  if (!windowElement) return;
  windowElement.classList.toggle('maximized');
  focusWindow(windowId);
}

function renderCategoryLinks() {
  const links = bundle.site.categories.map(category => `<button class="ex-link" data-action="open-folder" data-id="${escapeHtml(category.id)}"><span class="lico">${escapeHtml(category.icon)}</span>${escapeHtml(category.title)}</button>`).join('');
  document.querySelector('#category-links').innerHTML = `<div class="ex-section-title">📂 Другие папки</div>${links}`;
}

function selectProject(projectId) {
  const project = getProject(projectId);
  if (!project) return;
  selectedProjectId = projectId;
  document.querySelectorAll('#folder-grid [data-id]').forEach(item => {
    item.classList.toggle('selected', item.dataset.id === projectId);
  });
  document.querySelector('#ex-detail-preview').innerHTML = `<b>${escapeHtml(project.title)}</b><br>${escapeHtml(project.year || project.status || '')}<br><span>${escapeHtml(project.summary || '')}</span>`;
}

function openFolder(categoryId) {
  const category = getCategory(categoryId);
  if (!category) return;
  currentFolder = categoryId;
  selectedProjectId = '';
  const categoryProjects = bundle.projects.filter(project => project.category === categoryId);
  document.querySelector('#ex-icon').textContent = category.icon || '📁';
  document.querySelector('#ex-title').textContent = category.title;
  document.querySelector('#addr-bar').value = `Рабочий стол\\${category.title}`;
  const grid = document.querySelector('#folder-grid');
  grid.className = `folder-grid ${viewMode}`;
  grid.innerHTML = renderFolderItems(categoryProjects, viewMode);
  document.querySelector('#ex-status').textContent = `${categoryProjects.length} объектов`;
  document.querySelector('#ex-count').textContent = category.title;
  document.querySelector('#ex-detail-preview').textContent = 'Выберите проект для просмотра';
  openWindow('win-explorer');
}

function safeExternalUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.href : '';
  } catch {
    return '';
  }
}

function openProject(projectId) {
  const project = getProject(projectId);
  if (!project) return;
  currentProject = project;
  document.querySelector('#dt-icon').textContent = project.icon || '📄';
  document.querySelector('#dt-title').textContent = `${project.title} — Кейс`;
  document.querySelector('#dt-name').textContent = project.title;
  document.querySelector('#dt-meta').textContent = [
    getCategory(project.category)?.title,
    project.year,
    project.status
  ].filter(Boolean).join(' · ');
  document.querySelector('#dt-desc').textContent = project.summary || '';
  document.querySelector('#dt-status').textContent = project.status || 'Готово';
  document.querySelector('#dt-tab-label').textContent = project.sections?.[0]?.label || '—';
  document.querySelector('#dt-tags').innerHTML = (project.tags || [])
    .map(tag => `<span class="dtag">${escapeHtml(tag)}</span>`)
    .join('');
  const thumbnail = document.querySelector('#dt-thumb');
  thumbnail.textContent = project.icon || '📄';
  thumbnail.style.background = project.background || '#ffffff';
  document.querySelector('#dt-sections').innerHTML = renderProjectSections(project);

  const projectLink = safeExternalUrl(project.behance || '');
  const link = document.querySelector('#dt-behance-link');
  link.hidden = !projectLink;
  if (projectLink) link.href = projectLink;
  else link.removeAttribute('href');

  openWindow('win-detail');
}

function switchProjectSection(sectionId, button) {
  if (!currentProject) return;
  document.querySelectorAll('#dt-sections .cs-tab').forEach(item => {
    item.classList.toggle('active', item === button);
  });
  document.querySelectorAll('#dt-sections [data-section-panel]').forEach(panel => {
    panel.hidden = panel.dataset.sectionPanel !== sectionId;
  });
  document.querySelector('#dt-tab-label').textContent = button.textContent.trim();
}

function toggleViewMode() {
  viewMode = viewMode === 'icons' ? 'list' : 'icons';
  if (currentFolder) openFolder(currentFolder);
}

function toggleStartMenu(force) {
  startMenuOpen = typeof force === 'boolean' ? force : !startMenuOpen;
  document.querySelector('#start-menu').style.display = startMenuOpen ? 'block' : 'none';
}

function showMessage(icon, title, message) {
  document.querySelector('#mb-icon').textContent = icon;
  document.querySelector('#mb-bigico').textContent = icon;
  document.querySelector('#mb-title').textContent = title;
  document.querySelector('#mb-text').innerHTML = message;
  document.querySelector('#overlay').style.display = 'block';
  document.querySelector('#msgbox').style.display = 'block';
  focusWindow('msgbox');
}

function closeMessage() {
  document.querySelector('#overlay').style.display = 'none';
  closeWindow('msgbox');
}

function handleAction(action, id, element) {
  const actions = {
    'open-folder': () => openFolder(id),
    'open-project': () => openProject(id),
    'open-selected-project': () => selectedProjectId
      ? openProject(selectedProjectId)
      : showMessage('ℹ️', 'Проводник', 'Сначала выберите проект.'),
    'open-page': () => openWindow(`win-page-${id}`),
    'open-resume': () => openWindow('win-skills'),
    'close-window': () => closeWindow(id),
    'focus-window': () => focusWindow(id),
    'maximize-window': () => maximizeWindow(id),
    'switch-project-section': () => switchProjectSection(element.dataset.sectionId, element),
    'toggle-start': () => toggleStartMenu(),
    'toggle-view': toggleViewMode,
    'close-message': closeMessage,
    'show-trash': () => showMessage('🗑️', 'Корзина', 'Корзина пуста.'),
    'show-share-message': () => showMessage('✉️', 'Поделиться', 'Скопируйте ссылку на портфолио из адресной строки.'),
    'show-print-message': () => window.print(),
    'show-shutdown': () => showMessage('🔴', 'Завершение работы', 'Выключение...<br><br>Марат всё ещё в поиске команды.')
  };
  actions[action]?.();
  if (action !== 'toggle-start') toggleStartMenu(false);
}

function onClick(event) {
  const actionElement = event.target.closest('[data-action]');
  if (!actionElement) {
    if (!event.target.closest('#start-menu')) toggleStartMenu(false);
    return;
  }

  if (actionElement.classList.contains('f-icon')) {
    selectProject(actionElement.dataset.id);
  }

  const needsDoubleClick = actionElement.matches('.d-icon,.f-icon');
  if (needsDoubleClick && !isMobile()) return;
  handleAction(
    actionElement.dataset.action,
    actionElement.dataset.id,
    actionElement
  );
}

function onDoubleClick(event) {
  if (isMobile()) return;
  const actionElement = event.target.closest('.d-icon[data-action],.f-icon[data-action]');
  if (!actionElement) return;
  handleAction(
    actionElement.dataset.action,
    actionElement.dataset.id,
    actionElement
  );
}

function onMouseDown(event) {
  if (isMobile()) return;
  const titleBar = event.target.closest('[data-drag-window]');
  if (!titleBar || event.target.closest('button,a')) return;
  const windowElement = document.getElementById(titleBar.dataset.dragWindow);
  if (!windowElement || windowElement.classList.contains('maximized')) return;
  focusWindow(windowElement.id);
  const rect = windowElement.getBoundingClientRect();
  dragState = {
    windowElement,
    offsetX: event.clientX - rect.left,
    offsetY: event.clientY - rect.top
  };
  event.preventDefault();
}

function onMouseMove(event) {
  if (!dragState) return;
  dragState.windowElement.style.left = `${event.clientX - dragState.offsetX}px`;
  dragState.windowElement.style.top = `${Math.max(0, event.clientY - dragState.offsetY)}px`;
}

function updateClock() {
  const now = new Date();
  document.querySelector('#clock').textContent = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function updateLoadingWindow(message, index, total) {
  const progress = Math.round(index / Math.max(1, total - 1) * 100);
  document.querySelector('#load-lbl').textContent = message;
  document.querySelector('#load-fill').style.width = `${progress}%`;
  document.querySelector('#load-pct').textContent = `${progress}%`;
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
    window.setTimeout(step, index === messages.length ? 500 : 900);
  };
  step();
}

function createGenericPageWindows(pages) {
  document.querySelector('#dynamic-windows').innerHTML = pages
    .map(page => renderGenericPage(page, bundle.site))
    .join('');
  document.querySelectorAll('.dynamic-page').forEach((windowElement, index) => {
    windowElement.style.top = `${50 + index * 24}px`;
    windowElement.style.left = `${90 + index * 34}px`;
  });
}

export async function bootstrapPortfolio() {
  try {
    bundle = await loadContent();
    document.querySelector('#desktop-icons').innerHTML = renderDesktopShortcuts(bundle);
    document.querySelector('#start-items').innerHTML = renderStartItems(bundle);
    document.querySelector('#start-owner-name').textContent = bundle.site.owner?.name || 'Портфолио';
    document.querySelector('#resume-content').innerHTML = renderResume(bundle.resume);
    createGenericPageWindows(bundle.pages);
    renderCategoryLinks();
    startLoadingSequence(bundle.site.loadingMessages || ['Добро пожаловать!']);
  } catch (error) {
    document.querySelector('#win-loading .load-body').innerHTML = renderLoadError(error.message);
  }
}

document.addEventListener('click', onClick);
document.addEventListener('dblclick', onDoubleClick);
document.addEventListener('mousedown', onMouseDown);
document.addEventListener('mousemove', onMouseMove);
document.addEventListener('mouseup', () => { dragState = null; });
document.querySelector('#overlay').addEventListener('click', closeMessage);

updateClock();
window.setInterval(updateClock, 10000);
bootstrapPortfolio();
