#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const minimist = require('minimist');

const argv = minimist(process.argv.slice(2), {
  string: ['config', 'ssh-key', 'env'],
  alias: { c: 'config', k: 'ssh-key', e: 'env' }
});

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

function usage() {
  console.log('Usage: pb-manage [--config path] [--ssh-key key] [--env name] <command> [options]');
  console.log('Commands: init, dev, migrate, seed, create, destroy, backup, restore, deploy');
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

function init() {
  ensureDir('pb_migrations');
  ensureDir('pb_seeds');
  writeFileIfMissing('pb.config.json', JSON.stringify({
    vpsHost: 'your.vps.host',
    sshUser: 'root',
    domain: 'api.example.com'
  }, null, 2));

  writeFileIfMissing('Dockerfile', `FROM alpine:latest
ARG PB_VERSION=0.28.3
RUN apk add --no-cache unzip ca-certificates
ADD https://github.com/pocketbase/pocketbase/releases/download/v\${PB_VERSION}/pocketbase_\${PB_VERSION}_linux_amd64.zip /tmp/pb.zip
RUN unzip /tmp/pb.zip -d /pb/
WORKDIR /pb
COPY pb_migrations /pb/pb_migrations
COPY pb_seeds /pb/pb_seeds
EXPOSE 8090
CMD ["./pocketbase", "serve", "--http=0.0.0.0:8090"]
`);

  writeFileIfMissing('docker-compose.yml', `version: '3.9'
services:
  pocketbase:
    build: .
    ports:
      - "8090:8090"
    volumes:
      - ./pb_data:/pb/pb_data
      - ./pb_migrations:/pb/pb_migrations
      - ./pb_seeds:/pb/pb_seeds
    environment:
      - PB_ENV=development
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
`);

  writeFileIfMissing('nginx.conf', `server {
    listen 80;
    server_name localhost;
    location / {
        proxy_pass http://pocketbase:8090;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
`);

  ensureDir('.github/workflows');
  writeFileIfMissing('.github/workflows/pb-deploy.yml', `name: Deploy PocketBase
on: [push]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: echo "Deploy placeholder"
`);

  writeFileIfMissing('README.md', `# PocketBase Project

Run \`pb-manage dev\` to start development server.
`);
}

function ensureDockerRunning() {
  try {
    execSync('docker info', { stdio: 'ignore' });
  } catch (err) {
    console.error('Docker does not appear to be running. Please start Docker.');
    process.exit(1);
  }
}

function dev() {
  ensureDockerRunning();
  run('docker-compose up -d --build');
  migrate();
  seed();
  run('docker-compose logs -f');
}

function migrate() {
  run('docker-compose exec pocketbase pocketbase migrate up');
}

function seed() {
  run('docker-compose exec pocketbase pocketbase seed up');
}

function create(env = argv.env) {
  if (!env) return console.error('Missing environment name');
  const cfg = loadConfig();
  // Clone or restore the base data directory if it exists
  ssh(`if [ -d ~/pb_base/pb_data ]; then rm -rf ~/pb_data/${env} && cp -r ~/pb_base/pb_data ~/pb_data/${env}; else mkdir -p ~/pb_data/${env}; fi`);
  // Ensure a Docker network for nginx routing
  ssh('docker network inspect pb-net >/dev/null 2>&1 || docker network create pb-net');
  // Start the PocketBase container on the network
  ssh(`docker run -d --name pb-${env} --network pb-net -v ~/pb_data/${env}:/pb/pb_data pocketbase`);
  // Apply migrations and seeds on the new container
  ssh(`docker exec pb-${env} pocketbase migrate up`);
  ssh(`docker exec pb-${env} pocketbase seed up`);
  // Configure nginx to expose the instance
  const domain = cfg.domain;
  ssh(`cat <<'EOF' > /etc/nginx/conf.d/pb-${env}.conf
server {
    listen 80;
    server_name ${env}.${domain};
    location / {
        proxy_pass http://pb-${env}:8090;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
EOF`);
  ssh('nginx -s reload');
}

function destroy(env = argv.env) {
  if (!env) return console.error('Missing environment name');
  ssh(`docker rm -f pb-${env}`);
  ssh(`rm -rf ~/pb_data/${env}`);
  ssh(`rm -f /etc/nginx/conf.d/pb-${env}.conf`);
  ssh('nginx -s reload');
}

function backup(env = argv.env) {
  if (!env) return console.error('Missing environment name');
  ssh(`zip -r /tmp/${env}-backup.zip ~/pb_data/${env}`);
}

function restore(env = argv.env, file) {
  if (!env || !file) return console.error('Usage: pb-manage restore <env> <file>');
  ssh(`unzip -o ${file} -d ~/pb_data/${env}`);
}

function deploy(env = argv.env) {
  if (!env) return console.error('Missing environment name');
  create(env);
  migrate();
  seed();
}

const cmd = argv._[0];
if (!cmd) return usage();
if (cmd === 'init') init();
else if (cmd === 'dev') dev();
else if (cmd === 'migrate') migrate();
else if (cmd === 'seed') seed();
else if (cmd === 'create') create(argv._[1]);
else if (cmd === 'destroy') destroy(argv._[1]);
else if (cmd === 'backup') backup(argv._[1]);
else if (cmd === 'restore') restore(argv._[1], argv._[2]);
else if (cmd === 'deploy') deploy(argv._[1]);
else usage();
