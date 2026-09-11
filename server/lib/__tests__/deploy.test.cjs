const { readFileSync, writeFileSync, mkdtempSync, rmSync, existsSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { resolve, join } = require('node:path');
const { spawnSync } = require('node:child_process');

describe('SSH deployment failure handling', () => {
  const workflow = readFileSync(resolve(process.cwd(), '.github/workflows/ssh_deploy.yaml'), 'utf8');
  const script = workflow.split('          script: |\n')[1]
    .replace(/^ {12}/gm, '')
    .replace(/\$\{\{\s*secrets\.DOCKERHUB_TOKEN\s*\}\}/g, 'test-token')
    .replace(/\$\{\{\s*secrets\.DOCKERHUB_USERNAME\s*\}\}/g, 'test-user')
    .replace(/\$\{\{\s*secrets\.DOCKERHUB_REPO\s*\}\}/g, 'example/superhero')
    .replace(/\$\{\{\s*inputs\.VERSION\s*\}\}/g, 'main')
    .replace(/\$\{\{\s*inputs\.CONTAINER_NAME\s*\}\}/g, 'test-superhero')
    .replace(/\$\{\{\s*secrets\.HOST_PORT\s*\}\}/g, '3003');

  function simulate(failAt) {
    const directory = mkdtempSync(join(tmpdir(), 'superhero-deploy-'));
    const log = join(directory, 'calls');
    const revision = join(directory, 'data', 'REVISION');
    try {
      writeFileSync(join(directory, 'docker'), '#!/bin/sh\necho "$1" >> "$DEPLOY_TEST_LOG"\n[ "$1" != "$DEPLOY_TEST_FAILURE" ]\n', { mode: 0o700 });
      const result = spawnSync('/bin/sh', ['-c', script], {
        env: {
          ...process.env,
          PATH: `${directory}:${process.env.PATH}`,
          HOST_DATA_DIR: join(directory, 'data'),
          SHA: 'new-revision',
          DEPLOY_TEST_LOG: log,
          DEPLOY_TEST_FAILURE: failAt,
        },
        encoding: 'utf8',
      });
      return {
        status: result.status,
        calls: readFileSync(log, 'utf8').trim().split('\n'),
        revision: existsSync(revision) ? readFileSync(revision, 'utf8').trim() : null,
      };
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  }

  it.each(['login', 'pull'])('preserves the old container when docker %s fails', (stage) => {
    const result = simulate(stage);
    expect(result.status).not.toBe(0);
    expect(result.calls).not.toContain('stop');
    expect(result.calls).not.toContain('rm');
    expect(result.calls).not.toContain('run');
    expect(result.revision).toBeNull();
  });

  it('records the revision only after the new container starts', () => {
    expect(simulate('')).toEqual({
      status: 0, calls: ['login', 'pull', 'stop', 'rm', 'run'], revision: 'new-revision',
    });
    const failed = simulate('run');
    expect(failed.status).not.toBe(0);
    expect(failed.revision).toBeNull();
  });
});
