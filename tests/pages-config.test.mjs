import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

test('Pages CMS config parses and exposes the intended content files', () => {
  const ruby = String.raw`
    require 'yaml'
    config = YAML.safe_load(File.read('.pages.yml'), aliases: true)
    abort 'media input' unless config.dig('media', 'input') == 'assets/media'
    abort 'media output' unless config.dig('media', 'output') == '/portfolio/assets/media'
    entries = config.fetch('content')
    paths = entries.map { |entry| entry.fetch('path') }
    expected = %w[
      content/projects.json
      content/pages.json
      content/resume.json
      content/site.json
    ]
    abort 'content paths' unless paths == expected
    abort 'projects list' unless entries[0]['list'] == true
    abort 'pages list' unless entries[1]['list'] == true
    text = File.read('.pages.yml')
    abort 'secret in config' if text.match?(/token|password|client_secret/i)
    puts 'Pages CMS OK'
  `;
  const result = spawnSync('ruby', ['-e', ruby], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(result.stdout.trim(), 'Pages CMS OK');
});
