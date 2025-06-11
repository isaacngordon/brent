const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const argv = require('./argv');

function loadConfig() {
  const cfgPath = argv.config
    ? path.resolve(argv.config)
    : path.join(process.cwd(), 'pb.config.json');
  if (!fs.existsSync(cfgPath)) {
    console.error('Missing pb.config.json, run `pb-manage init`');
    process.exit(1);
  }
  const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
  if (argv['ssh-key']) cfg.sshKey = argv['ssh-key'];
  return cfg;
}

function run(cmd) {
  execSync(cmd, { stdio: 'inherit', shell: true });
}

function ssh(cmd) {
  const cfg = loadConfig();
  const keyPath = argv['ssh-key'] || cfg.sshKey;
  const key = keyPath ? `-i ${keyPath}` : '';
  run(`ssh ${key} ${cfg.sshUser}@${cfg.vpsHost} '${cmd}'`);
}

function scpFromRemote(remotePath, localPath) {
  const cfg = loadConfig();
  const keyPath = argv['ssh-key'] || cfg.sshKey;
  const key = keyPath ? `-i ${keyPath}` : '';
  run(`scp ${key} ${cfg.sshUser}@${cfg.vpsHost}:${remotePath} ${localPath}`);
}

function scpToRemote(localPath, remotePath) {
  const cfg = loadConfig();
  const keyPath = argv['ssh-key'] || cfg.sshKey;
  const key = keyPath ? `-i ${keyPath}` : '';
  run(`scp ${key} ${localPath} ${cfg.sshUser}@${cfg.vpsHost}:${remotePath}`);
}

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function writeFileIfMissing(file, content) {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, content);
    console.log('created', file);
  }
}

function ensureDockerRunning() {
  try {
    execSync('docker info', { stdio: 'ignore' });
  } catch (err) {
    console.error('Docker does not appear to be running. Please start Docker.');
    process.exit(1);
  }
}

module.exports = {
  argv,
  loadConfig,
  run,
  ssh,
  scpFromRemote,
  scpToRemote,
  ensureDir,
  writeFileIfMissing,
  ensureDockerRunning,
};
