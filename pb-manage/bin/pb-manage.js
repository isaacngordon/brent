#!/usr/bin/env node
const commands = require('../lib/commands');
const { argv, init, dev, migrate, seed, create, destroy, backup, restore, pull, deploy } = commands;

function usage() {
  console.log('Usage: pb-manage [--config path] [--ssh-key key] [--env name] <command> [options]');
  console.log('Commands: init, dev, migrate, seed, create, destroy, backup, restore, pull, deploy');
}

if (require.main === module) {
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
  else if (cmd === 'pull') pull(argv._[1]);
  else if (cmd === 'deploy') deploy(argv._[1]);
  else usage();
} else {
  module.exports = { ...commands, usage };
}
