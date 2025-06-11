const fs = require('fs');
const path = require('path');
const { ensureDir, writeFileIfMissing, run } = require('./utils');

function init(template) {
  if (template) {
    if (/^https?:/.test(template) || template.endsWith('.git')) {
      run(`git clone ${template} .`);
    } else {
      const src = path.resolve(template);
      fs.cpSync(src, process.cwd(), { recursive: true });
    }
    return;
  }

  ensureDir('pb_migrations');
  ensureDir('pb_seeds');
  writeFileIfMissing(
    'pb.config.json',
    JSON.stringify(
      {
        vpsHost: 'your.vps.host',
        sshUser: 'root',
        domain: 'api.example.com'
      },
      null,
      2
    )
  );

  writeFileIfMissing(
    'Dockerfile',
    `FROM alpine:latest
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

  writeFileIfMissing(
    'docker-compose.yml',
    `version: '3.9'
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

  writeFileIfMissing(
    'nginx.conf',
    `server {
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
  writeFileIfMissing(
    '.github/workflows/pb-deploy.yml',
    `name: Deploy PocketBase

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    env:
      REGISTRY: ghcr.io
      IMAGE: \${{ env.REGISTRY }}/\${{ github.repository }}:latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: \${{ env.REGISTRY }}
          username: \${{ secrets.REGISTRY_USERNAME }}
          password: \${{ secrets.REGISTRY_PASSWORD }}
      - uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: \${{ env.IMAGE }}
      - name: Deploy via pb-manage
        env:
          SSH_KEY: \${{ secrets.SSH_KEY }}
        run: |
          echo "$SSH_KEY" > key.pem
          chmod 600 key.pem
          node pb-manage/bin/pb-manage.js deploy production --ssh-key key.pem
          rm key.pem
`);

  writeFileIfMissing(
    'README.md',
    `# PocketBase Project

Run \`pb-manage dev\` to start development server.
`);
}

module.exports = { init };
