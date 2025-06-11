const { argv, run, scpFromRemote, ensureDockerRunning } = require('./utils');

function migrate() {
  run('docker-compose exec pocketbase pocketbase migrate up');
}

function seed() {
  run('docker-compose exec pocketbase pocketbase seed up');
}

function dev() {
  ensureDockerRunning();
  run('docker-compose up -d --build');
  migrate();
  seed();
  run('docker-compose logs -f');
}

function pull(env = argv.env) {
  if (!env) return console.error('Missing environment name');
  ensureDockerRunning();

  const remoteZip = `/tmp/${env}-backup.zip`;
  const localZip = `./${env}-backup.zip`;

  // Create backup on the remote host and download it
  const { ssh } = require('./utils');
  ssh(`zip -r ${remoteZip} ~/pb_data/${env}`);
  scpFromRemote(remoteZip, localZip);
  ssh(`rm -f ${remoteZip}`);

  // Stop local container if running
  try {
    run('docker-compose down');
  } catch (err) {}

  // Restore the backup into ./pb_data
  run('rm -rf pb_data');
  run(`unzip -o ${localZip}`);
  run(`[ -d root/pb_data/${env} ] && mv root/pb_data/${env} pb_data && rm -rf root`);
  run(`[ -d pb_data/${env} ] && mv pb_data/${env} pb_data`);

  // Restart the local environment
  run('docker-compose up -d --build');
}

module.exports = { migrate, seed, dev, pull };
