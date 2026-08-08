import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { extractDataUris } from '../scripts/migrate-legacy-content.mjs';

test('extracts a data image and replaces it with a public path', async () => {
  const destination = await mkdtemp(join(tmpdir(), 'portfolio-image-'));
  const html = '<img src="data:image/png;base64,aGVsbG8=">';
  const result = await extractDataUris(
    html,
    destination,
    '/portfolio/assets/media/test'
  );

  assert.equal(
    result.html,
    '<img src="/portfolio/assets/media/test/image-01.png">'
  );
  assert.equal(
    (await readFile(join(destination, 'image-01.png'))).toString(),
    'hello'
  );
  assert.deepEqual(result.files, ['image-01.png']);
});

test('extracts a base64 SVG with an svg extension', async () => {
  const destination = await mkdtemp(join(tmpdir(), 'portfolio-svg-'));
  const html = '<img src="data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=">';
  const result = await extractDataUris(
    html,
    destination,
    '/portfolio/assets/media/test'
  );

  assert.equal(
    result.html,
    '<img src="/portfolio/assets/media/test/image-01.svg">'
  );
  assert.equal(
    (await readFile(join(destination, 'image-01.svg'))).toString(),
    '<svg></svg>'
  );
});
