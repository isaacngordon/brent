const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const bin = path.resolve(__dirname, '..', 'bin', 'pb-manage.js');

test('shows usage with no command', () => {
  const res = spawnSync('node', [bin], { encoding: 'utf8' });
  assert.match(res.stdout, /Usage: pb-manage/);
  assert.strictEqual(res.status, 0);
});

test('init creates project files', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pbtest-'));
  const res = spawnSync('node', [bin, 'init'], { cwd: dir, encoding: 'utf8' });
  assert.strictEqual(res.status, 0);
  const files = ['pb.config.json', 'Dockerfile', 'docker-compose.yml', 'nginx.conf'];
  for (const f of files) {
    assert.ok(fs.existsSync(path.join(dir, f)), `${f} should exist`);
  }
  const dirs = ['pb_migrations', 'pb_seeds'];
  for (const d of dirs) {
    assert.ok(fs.existsSync(path.join(dir, d)), `${d} should exist`);
  }
});

test('init copies template files', () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'pbtest-'));
  const template = path.join(base, 'tpl');
  fs.mkdirSync(template);
  fs.writeFileSync(path.join(template, 'example.txt'), 'hi');
  const proj = path.join(base, 'proj');
  fs.mkdirSync(proj);
  const res = spawnSync('node', [bin, '--template', template, 'init'], {
    cwd: proj,
    encoding: 'utf8'
  });
  assert.strictEqual(res.status, 0);
  assert.ok(fs.existsSync(path.join(proj, 'example.txt')));
});

test('create without env prints error', () => {
  const res = spawnSync('node', [bin, 'create'], { encoding: 'utf8' });
  assert.match(res.stderr, /Missing environment name/);
  assert.strictEqual(res.status, 0);
});
