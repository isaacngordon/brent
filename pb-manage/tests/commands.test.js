const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const script = path.resolve(__dirname, '..', 'lib', 'commands.js');

function withExecStub(fn) {
  const cp = require('child_process');
  const orig = cp.execSync;
  const cmds = [];
  cp.execSync = (cmd) => { cmds.push(cmd); };
  try {
    return fn(cmds);
  } finally {
    cp.execSync = orig;
  }
}

function freshModule() {
  const libs = ['commands.js', 'utils.js', 'init.js', 'local.js', 'remote.js'];
  for (const lib of libs) {
    const p = path.resolve(__dirname, '..', 'lib', lib);
    delete require.cache[require.resolve(p)];
  }
  return require(script);
}

function withTempConfig(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pbtest-'));
  const cfg = {
    vpsHost: 'host',
    sshUser: 'root',
    domain: 'example.com',
    image: 'my/image:latest'
  };
  fs.writeFileSync(path.join(dir, 'pb.config.json'), JSON.stringify(cfg));
  const cwd = process.cwd();
  process.chdir(dir);
  try {
    return fn(dir);
  } finally {
    process.chdir(cwd);
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// init
test('init creates config file', () => {
  withTempConfig((dir) => {
    fs.unlinkSync(path.join(dir, 'pb.config.json')); // remove to test creation
    const { init } = freshModule();
    init();
    assert.ok(fs.existsSync(path.join(dir, 'pb.config.json')));
  });
});

test('init copies template directory', () => {
  withTempConfig((dir) => {
    const tpl = path.join(dir, 'tpl');
    fs.mkdirSync(tpl);
    fs.writeFileSync(path.join(tpl, 'foo.txt'), 'bar');
    const { init } = freshModule();
    init(tpl);
    assert.ok(fs.existsSync(path.join(dir, 'foo.txt')));
  });
});

// migrate
test('migrate runs docker migrate', () => {
  withExecStub((cmds) => {
    const { migrate } = freshModule();
    migrate();
    assert.deepStrictEqual(cmds, ['docker-compose exec pocketbase pocketbase migrate up']);
  });
});

// seed
test('seed runs docker seed', () => {
  withExecStub((cmds) => {
    const { seed } = freshModule();
    seed();
    assert.deepStrictEqual(cmds, ['docker-compose exec pocketbase pocketbase seed up']);
  });
});

// dev
test('dev starts containers', () => {
  withExecStub((cmds) => {
    const { dev } = freshModule();
    dev();
    assert.ok(cmds.includes('docker-compose up -d --build'));
  });
});

// create
test('create issues ssh commands', () => {
  withTempConfig(() => {
    withExecStub((cmds) => {
      const { create } = freshModule();
      create('dev');
      assert.ok(cmds.some(c => c.includes('docker run -d --name pb-dev')));
      assert.ok(cmds.some(c => c.includes('my/image:latest')));
    });
  });
});

// destroy
test('destroy removes remote instance', () => {
  withTempConfig(() => {
    withExecStub((cmds) => {
      const { destroy } = freshModule();
      destroy('dev');
      assert.ok(cmds.some(c => c.includes('docker rm -f pb-dev')));
    });
  });
});

// backup
test('backup pulls backup when local flag set', () => {
  withTempConfig(() => {
    withExecStub((cmds) => {
      const mod = freshModule();
      mod.argv.local = true;
      mod.argv.remote = false;
      mod.backup('dev');
      assert.ok(cmds.some(c => c.includes("zip -r /tmp/dev-backup.zip")));
      assert.ok(cmds.some(c => c.startsWith('scp ')));
    });
  });
});

// restore
test('restore uploads and restarts', () => {
  withTempConfig((dir) => {
    withExecStub((cmds) => {
      const file = path.join(dir, 'data.zip');
      fs.writeFileSync(file, 'dummy');
      const { restore } = freshModule();
      restore('dev', file);
      assert.ok(cmds.some(c => c.startsWith('scp ')));
      assert.ok(cmds.some(c => c.includes('docker start pb-dev')));
    });
  });
});

// pull
test('pull grabs remote data', () => {
  withTempConfig(() => {
    withExecStub((cmds) => {
      const { pull } = freshModule();
      pull('dev');
      assert.ok(cmds.includes('docker info')); // ensureDockerRunning
      assert.ok(cmds.some(c => c.includes('zip -r /tmp/dev-backup.zip')));
      assert.ok(cmds.some(c => c.includes('docker-compose up -d --build')));
    });
  });
});

// deploy
test('deploy runs create and migrations', () => {
  withTempConfig(() => {
    withExecStub((cmds) => {
      const { deploy } = freshModule();
      deploy('dev');
      assert.ok(cmds.some(c => c.includes('docker run -d --name pb-dev')));
      assert.ok(cmds.some(c => c.includes('my/image:latest')));
      assert.ok(cmds.some(c => c.includes('pocketbase migrate up')));
    });
  });
});
