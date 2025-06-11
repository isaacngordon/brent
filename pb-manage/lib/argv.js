const minimist = require('minimist');

const argv = minimist(process.argv.slice(2), {
  string: ['config', 'ssh-key', 'env'],
  boolean: ['local', 'remote'],
  alias: { c: 'config', k: 'ssh-key', e: 'env' }
});

module.exports = argv;
