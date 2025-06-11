const minimist = require('minimist');

const argv = minimist(process.argv.slice(2), {
  string: ['config', 'ssh-key', 'env', 'template'],
  boolean: ['local', 'remote'],
  alias: { c: 'config', k: 'ssh-key', e: 'env' }
});

module.exports = argv;
