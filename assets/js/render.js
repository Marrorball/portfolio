export function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  })[character]);
}

function renderShortcut(item, action) {
  return `<button class="d-icon" data-action="${action}" data-id="${escapeHtml(item.id)}">
    <span class="ico">${escapeHtml(item.icon || '📄')}</span>
    <span>${escapeHtml(item.title)}</span>
  </button>`;
}

export function renderDesktopShortcuts({ site, pages }) {
  const about = pages.filter(page => page.id === 'about' && page.showOnDesktop);
  const otherPages = pages.filter(page => page.id !== 'about' && page.showOnDesktop);
  const categories = (site.categories || []).filter(category => category.showOnDesktop);
  return [
    ...about.map(page => renderShortcut(page, 'open-page')),
    ...categories.map(category => renderShortcut(category, 'open-folder')),
    renderShortcut({ id: 'resume', title: 'Резюме', icon: '📄' }, 'open-resume'),
    ...otherPages.map(page => renderShortcut(page, 'open-page')),
    '<button class="d-icon" data-action="show-trash"><span class="ico">🗑️</span><span>Корзина</span></button>'
  ].join('');
}

function renderStartItem(item, action) {
  return `<button class="sm-item" data-action="${action}" data-id="${escapeHtml(item.id)}">
    <span class="sm-ico">${escapeHtml(item.icon || '📄')}</span>
    <span class="sm-label">${escapeHtml(item.title)}</span>
  </button>`;
}

export function renderStartItems({ site, pages }) {
  const categories = (site.categories || []).filter(category => category.showInStart);
  const visiblePages = pages.filter(page => page.showInStart);
  return [
    ...visiblePages.map(page => renderStartItem(page, 'open-page')),
    ...categories.map(category => renderStartItem(category, 'open-folder')),
    renderStartItem({ id: 'resume', title: 'Резюме', icon: '📄' }, 'open-resume')
  ].join('');
}

export function renderFolderItems(projects, viewMode = 'icons') {
  if (viewMode === 'list') {
    const rows = projects.map(project => `<button class="f-list-row" data-action="open-project" data-id="${escapeHtml(project.id)}">
      <span class="fco" style="background:${escapeHtml(project.background || '#ffffff')}"></span>
      <span class="fn">${escapeHtml(project.title)}</span>
      <span class="ft">${escapeHtml(project.year || project.category || '')}</span>
      <span class="fdate">${escapeHtml(project.status || '')}</span>
    </button>`).join('');
    return `<div class="f-list-row f-list-head"><span></span><span>Имя</span><span>Год</span><span>Статус</span></div>${rows}`;
  }

  return projects.map(project => `<button class="f-icon" data-action="open-project" data-id="${escapeHtml(project.id)}">
    <span class="fco" style="background:${escapeHtml(project.background || '#ffffff')}">${escapeHtml(project.icon || '')}</span>
    <span class="fn">${escapeHtml(project.title)}</span>
    <span class="ft">${escapeHtml(project.year || '')}</span>
  </button>`).join('');
}

export function renderProjectSections(project) {
  const sections = project.sections || [];
  const tabs = sections.map((section, index) => `<button class="cs-tab${index === 0 ? ' active' : ''}" data-action="switch-project-section" data-id="${escapeHtml(project.id)}" data-section-id="${escapeHtml(section.id)}">${escapeHtml(section.label)}</button>`).join('');
  const panels = sections.map((section, index) => `<div class="project-section-panel" data-section-panel="${escapeHtml(section.id)}"${index === 0 ? '' : ' hidden'}>${section.content || ''}</div>`).join('');
  return `<div class="project-tabs">${tabs}</div><div class="project-panels">${panels}</div>`;
}

function renderAboutProfile(site) {
  if (!site?.owner) return '';
  const owner = site.owner;
  const rows = [
    ['Имя', owner.name],
    ['Роль', owner.role],
    ['Опыт', owner.experience],
    ['Локация', owner.location],
    ['Статус', owner.status]
  ].filter(([, value]) => value);
  return `<table class="about-table"><tbody>${rows.map(([label, value]) => `<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(value)}</td></tr>`).join('')}</tbody></table>`;
}

export function renderGenericPage(page, site) {
  const windowId = `win-page-${page.id}`;
  const body = page.template === 'contact'
    ? renderContact(site || {})
    : `<div class="generic-page-content">${page.content || ''}${page.id === 'about' ? renderAboutProfile(site) : ''}</div>`;
  return `<section class="win dynamic-page" id="${escapeHtml(windowId)}" data-window-name="${escapeHtml(`${page.icon || '📄'} ${page.title}`)}">
    <div class="win-title" data-drag-window="${escapeHtml(windowId)}">
      <span class="t-icon">${escapeHtml(page.icon || '📄')}</span>
      <span class="t-label">${escapeHtml(page.title)}</span>
      <div class="t-btns">
        <button class="t-btn min" data-action="close-window" data-id="${escapeHtml(windowId)}" aria-label="Свернуть">─</button>
        <button class="t-btn max" data-action="maximize-window" data-id="${escapeHtml(windowId)}" aria-label="Развернуть">□</button>
        <button class="t-btn cls" data-action="close-window" data-id="${escapeHtml(windowId)}" aria-label="Закрыть">✕</button>
      </div>
    </div>
    <div class="win-menu"><span class="m-item">Файл</span><span class="m-item">Вид</span><span class="m-item">Справка</span></div>
    <div class="win-body generic-window-body">${body}</div>
    <div class="win-status"><div class="s-panel">Готово</div><div class="s-panel">Система: OK</div></div>
  </section>`;
}

function renderResumeGroup(title, items, itemRenderer) {
  if (!items?.length) return '';
  return `<section class="resume-section"><h3>${escapeHtml(title)}</h3>${items.map(itemRenderer).join('')}</section>`;
}

export function renderResume(resume) {
  const experience = renderResumeGroup('💼 Опыт работы', resume.experience, item => `<article class="resume-item"><div class="resume-heading"><strong>${escapeHtml(item.company)}</strong><span>${escapeHtml(item.period)}</span></div><div class="resume-role">${escapeHtml(item.role)}</div><p>${escapeHtml(item.description)}</p></article>`);
  const education = renderResumeGroup('🎓 Образование', resume.education, item => `<article class="resume-item"><div class="resume-heading"><strong>${escapeHtml(item.institution)}</strong><span>${escapeHtml(item.period)}</span></div><div>${escapeHtml(item.program)}</div>${item.description ? `<p>${escapeHtml(item.description)}</p>` : ''}</article>`);
  const publications = renderResumeGroup('📝 Научные публикации', resume.publications, item => `<article class="resume-item"><div class="resume-heading"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.year)}</span></div><p>${escapeHtml(item.description)}</p></article>`);
  const skills = renderResumeGroup('✦ Что умею', resume.skills, item => `<div class="resume-skill"><strong>${escapeHtml(item.name)}:</strong> ${escapeHtml(item.level)}</div>`);
  const tools = resume.tools?.length ? `<section class="resume-section"><h3>🛠 Инструменты</h3><div class="resume-tags">${resume.tools.map(tool => `<span class="dtag">${escapeHtml(tool)}</span>`).join('')}</div></section>` : '';
  const about = resume.about ? `<section class="resume-section"><h3>✨ О себе</h3><p>${escapeHtml(resume.about)}</p></section>` : '';
  return `${experience}${education}${publications}${tools}${skills}${about}`;
}

function safeHttpsUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.href : '';
  } catch {
    return '';
  }
}

export function renderContact(site) {
  const contacts = site.contacts || {};
  const owner = site.owner || {};
  const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contacts.email || '')
    ? contacts.email
    : '';
  const telegram = String(contacts.telegram || '').replace(/^@/, '');
  const telegramUrl = /^[A-Za-z0-9_]{5,32}$/.test(telegram)
    ? `https://t.me/${telegram}`
    : '';
  const behance = safeHttpsUrl(contacts.behance || '');
  const links = [
    email && `<a class="c-btn" href="mailto:${escapeHtml(email)}"><span>📧</span><span><small>Email</small>${escapeHtml(email)}</span></a>`,
    telegramUrl && `<a class="c-btn" href="${escapeHtml(telegramUrl)}" target="_blank" rel="noreferrer"><span>✈️</span><span><small>Telegram</small>@${escapeHtml(telegram)}</span></a>`,
    behance && `<a class="c-btn" href="${escapeHtml(behance)}" target="_blank" rel="noreferrer"><span>🎨</span><span><small>Behance</small>${escapeHtml(behance.replace(/^https?:\/\//, ''))}</span></a>`
  ].filter(Boolean).join('');
  return `<div class="contact-card"><h3>${escapeHtml(owner.name || '')}${owner.role ? ` — ${escapeHtml(owner.role)}` : ''}</h3>${links}</div>`;
}

export function renderLoadError(message) {
  return `<div class="load-error"><div class="load-error-icon">⚠️</div><div><strong>Не удалось загрузить портфолио</strong><p>${escapeHtml(message)}</p><p>Обновите страницу или попробуйте немного позже.</p></div></div>`;
}
