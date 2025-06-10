#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

function usage() {
  console.log('Usage: pb-manage <command>');
  console.log('Commands: init, dev, migrate, seed');
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

function dev() {
  const proc = spawn('docker-compose', ['up', '--build'], { stdio: 'inherit' });
  proc.on('exit', code => process.exit(code));
}

function migrate() {
  const proc = spawn('docker-compose', ['exec', 'pocketbase', 'pocketbase', 'migrate', 'up'], { stdio: 'inherit' });
  proc.on('exit', code => process.exit(code));
}

function seed() {
  const proc = spawn('docker-compose', ['exec', 'pocketbase', 'pocketbase', 'seed', 'up'], { stdio: 'inherit' });
  proc.on('exit', code => process.exit(code));
}

const cmd = process.argv[2];
if (!cmd) return usage();
if (cmd === 'init') init();
else if (cmd === 'dev') dev();
else if (cmd === 'migrate') migrate();
else if (cmd === 'seed') seed();
else usage();
