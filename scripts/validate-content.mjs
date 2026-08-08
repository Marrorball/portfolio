import { access, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import {
  collectMediaPaths,
  normalizeBundle
} from '../assets/js/content.js';

const names = ['site', 'resume', 'projects', 'pages'];
const entries = await Promise.all(names.map(async name => [
  name,
  JSON.parse(await readFile(new URL(`../content/${name}.json`, import.meta.url), 'utf8'))
]));
const bundle = normalizeBundle(Object.fromEntries(entries));

for (const publicPath of collectMediaPaths(bundle)) {
  const relativePath = publicPath.replace('/portfolio/', '../');
  await access(fileURLToPath(new URL(relativePath, import.meta.url)));
}

console.log(`OK: ${bundle.projects.length} проектов, ${bundle.pages.length} страниц`);
