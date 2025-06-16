const { argv, ssh, scpFromRemote, scpToRemote, run, loadConfig } = require('./utils');
const { migrate, seed } = require('./local');
const path = require('path');

function create(env = argv.env) {
  if (!env) return console.error('Missing environment name');
  const cfg = loadConfig();
  ssh(`if [ -d ~/pb_base/pb_data ]; then rm -rf ~/pb_data/${env} && cp -r ~/pb_base/pb_data ~/pb_data/${env}; else mkdir -p ~/pb_data/${env}; fi`);
  ssh('docker network inspect pb-net >/dev/null 2>&1 || docker network create pb-net');
  const image = cfg.image || 'pocketbase';
  ssh(`docker run -d --name pb-${env} --network pb-net -v ~/pb_data/${env}:/pb/pb_data ${image}`);
  ssh(`docker exec pb-${env} pocketbase migrate up`);
  ssh(`docker exec pb-${env} pocketbase seed up`);
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
  const remoteZip = `/tmp/${env}-backup.zip`;
  ssh(`zip -r ${remoteZip} ~/pb_data/${env}`);
  if (argv.local) {
    scpFromRemote(remoteZip, `./${env}-backup.zip`);
    if (!argv.remote) ssh(`rm -f ${remoteZip}`);
  } else {
    console.log(`Backup stored on server at ${remoteZip}`);
  }
}

function restore(env = argv.env, file) {
  if (!env || !file) return console.error('Usage: pb-manage restore <env> <file>');
  if (!require('fs').existsSync(file)) return console.error(`File not found: ${file}`);

  const remoteZip = `/tmp/${path.basename(file)}`;
  scpToRemote(file, remoteZip);

  ssh(`docker stop pb-${env} || true`);
  ssh(`unzip -o ${remoteZip} -d ~/pb_data/${env}`);
  const cfg = loadConfig();
  const image = cfg.image || 'pocketbase';
  ssh(`docker start pb-${env} || docker run -d --name pb-${env} --network pb-net -v ~/pb_data/${env}:/pb/pb_data ${image}`);
  ssh(`docker exec pb-${env} pocketbase migrate up`);
}

function deploy(env = argv.env) {
  if (!env) return console.error('Missing environment name');
  create(env);
  migrate();
  seed();
}

module.exports = { create, destroy, backup, restore, deploy };
