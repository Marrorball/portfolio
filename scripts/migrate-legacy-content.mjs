import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import vm from 'node:vm';

export async function extractDataUris(html, destination, publicBase) {
  await mkdir(destination, { recursive: true });
  const pattern = /data:image\/(png|jpeg|webp|svg\+xml);base64,([A-Za-z0-9+/=]+)/g;
  const matches = [...html.matchAll(pattern)];
  const files = [];
  let output = html;

  for (const [index, match] of matches.entries()) {
    const extension = match[1] === 'jpeg'
      ? 'jpg'
      : match[1] === 'svg+xml'
        ? 'svg'
        : match[1];
    const filename = `image-${String(index + 1).padStart(2, '0')}.${extension}`;
    await writeFile(join(destination, filename), Buffer.from(match[2], 'base64'));
    output = output.replace(match[0], `${publicBase}/${filename}`);
    files.push(filename);
  }

  return { html: output, files };
}

function readLegacyObjects(source) {
  const start = source.indexOf('const folders =');
  const end = source.indexOf('// ── STATE ──');
  if (start < 0 || end < 0) throw new Error('Не найдены данные старого портфолио');

  const context = {};
  vm.createContext(context);
  vm.runInContext(
    `${source.slice(start, end)};this.result={folders,projects}`,
    context
  );
  return context.result;
}

function firstExternalProjectUrl(project) {
  if (project.behance) return project.behance;
  const html = project.tabs.map(tab => tab.html).join(' ');
  return html.match(/https:\/\/www\.behance\.net\/[^"'<> ]+/)?.[0] || '';
}

async function migrateProjects({ folders, projects }, root) {
  const migrated = [];
  let imageCount = 0;

  for (const [category, folder] of Object.entries(folders)) {
    for (const [folderIndex, item] of folder.items.entries()) {
      const legacy = projects[item.id];
      if (!legacy) throw new Error(`Не найден проект ${item.id}`);

      const sections = [];
      for (const [sectionIndex, tab] of legacy.tabs.entries()) {
        const sectionId = tab.id || `section-${sectionIndex + 1}`;
        const relativeDirectory = join(
          'assets',
          'media',
          'projects',
          item.id,
          sectionId
        );
        const extracted = await extractDataUris(
          tab.html,
          join(root, relativeDirectory),
          `/portfolio/${relativeDirectory}`
        );
        imageCount += extracted.files.length;
        sections.push({
          id: sectionId,
          label: tab.label,
          content: extracted.html
        });
      }

      migrated.push({
        id: item.id,
        title: legacy.title,
        category,
        year: legacy.meta?.match(/20\d{2}/)?.[0] || '',
        status: legacy.status || '',
        icon: legacy.ico || '📄',
        background: legacy.bg || item.bg || '#ffffff',
        summary: legacy.desc || '',
        cover: '',
        gallery: [],
        tags: legacy.tags || [],
        behance: firstExternalProjectUrl(legacy),
        order: (folderIndex + 1) * 10,
        published: true,
        sections
      });
    }
  }

  return { projects: migrated, imageCount };
}

function createSite(folders) {
  return {
    owner: {
      name: 'Марат',
      role: 'UX/UI Designer',
      experience: '1.5 года',
      location: 'Москва, Россия',
      status: 'Всё сложно (хочу работать)',
      bio: 'Работал на фрилансе с разными задачами — от лендингов и постеров до интернет-магазинов; делал графику для Surf Coffee. Со временем сфокусировался на продуктовом дизайне и начал работать со стартапами, проектируя интерфейсы с нуля. Ищу команду, где смогу профессионально расти как продуктовый дизайнер.'
    },
    contacts: {
      email: 'marrorball@gmail.com',
      telegram: 'marrorball',
      behance: 'https://www.behance.net/marmaraj11'
    },
    categories: Object.entries(folders).map(([id, folder], index) => ({
      id,
      title: folder.title,
      icon: folder.icon,
      order: (index + 1) * 10,
      showOnDesktop: true,
      showInStart: true
    })),
    loadingMessages: [
      'Запуск Windows XP...',
      'Загрузка портфолио Марата...',
      'Пожалуйста, возьмите его на работу...',
      'Серьёзно, он очень старался...',
      'Добро пожаловать!'
    ]
  };
}

function createPages() {
  return [
    {
      id: 'about',
      title: 'Обо мне',
      icon: '🖥️',
      template: 'generic',
      order: 10,
      published: true,
      showOnDesktop: true,
      showInStart: true,
      content: '<p>Работал на фрилансе с разными задачами — от лендингов и постеров до интернет-магазинов; делал графику для Surf Coffee. Со временем сфокусировался на продуктовом дизайне и начал работать со стартапами, проектируя интерфейсы с нуля. Ищу команду, где смогу профессионально расти как продуктовый дизайнер.</p>'
    },
    {
      id: 'contact',
      title: 'Контакт',
      icon: '✉️',
      template: 'contact',
      order: 20,
      published: true,
      showOnDesktop: true,
      showInStart: true,
      content: ''
    }
  ];
}

function createResume() {
  return {
    experience: [
      {
        company: 'Фриланс',
        role: 'UX/UI Designer · Graphic Designer',
        period: '2024 — н.в.',
        description: 'Разные фриланс-проекты: лендинги, постеры; «Древо» — логотип, брендинг и интернет-магазин; Ocean Kids — сайт детского сада; графика для Surf Coffee; UX/UI для KORTEX; TailTrail.'
      }
    ],
    education: [
      {
        institution: 'МТУСИ',
        program: 'Высшее образование · Специальность: ИТ',
        period: '2022 — 2026',
        description: ''
      },
      {
        institution: 'Perasperadastra',
        program: 'Курс UX/UI Designer',
        period: '2025 — 2026',
        description: ''
      }
    ],
    publications: [
      {
        title: 'Исследование эффективности алгоритмов машинного обучения в области видеоаналитики',
        year: '2023',
        description: 'XIV Молодёжный научный форум «Телекоммуникации и информационные технологии», сборник трудов, том 2',
        url: ''
      },
      {
        title: 'Investigation of the Effectiveness of Methods for Recognizing Elements of Car License Plates in Conditions of Their Limited Visibility',
        year: '2024',
        description: 'XVI Молодёжный научный форум «Телекоммуникации и информационные технологии», сборник трудов',
        url: ''
      }
    ],
    skills: [
      { name: 'Исследование', level: 'Интервью · CJM · анализ сценариев · проверка гипотез' },
      { name: 'Проектирование', level: 'User flow · wireframes · прототипирование' },
      { name: 'Интерфейсы', level: 'UI-дизайн · дизайн-системы · визуальная иерархия · типографика' },
      { name: 'Графика и бренд', level: 'Айдентика · логотип · полиграфия' }
    ],
    tools: ['Figma', 'Tilda', 'Adobe Suite', 'Jitter', 'Vibe Coding'],
    links: [],
    about: 'Легко нахожу общий язык с командой и людьми из разных ролей. Не боюсь задавать вопросы, когда чего-то не знаю, и спокойно отношусь к критике — считаю её частью рабочего процесса.'
  };
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

async function ensureMigrationTargetIsEmpty(root, force) {
  if (force) return;
  try {
    await access(join(root, 'content', 'projects.json'));
    throw new Error('content/projects.json уже существует; используйте --force');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

async function main() {
  const root = resolve(new URL('..', import.meta.url).pathname);
  const force = process.argv.includes('--force');
  await ensureMigrationTargetIsEmpty(root, force);

  const source = await readFile(join(root, 'index.html'), 'utf8');
  const legacy = readLegacyObjects(source);
  const migrated = await migrateProjects(legacy, root);

  await writeJson(join(root, 'content', 'projects.json'), migrated.projects);
  await writeJson(join(root, 'content', 'pages.json'), createPages());
  await writeJson(join(root, 'content', 'resume.json'), createResume());
  await writeJson(join(root, 'content', 'site.json'), createSite(legacy.folders));

  const sections = migrated.projects.reduce(
    (total, project) => total + project.sections.length,
    0
  );
  console.log(
    `Migrated: ${migrated.projects.length} projects, ${sections} sections, ${migrated.imageCount} images`
  );
}

const isMain = process.argv[1]
  && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isMain) await main();
