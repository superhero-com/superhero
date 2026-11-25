const { spawnSync } = require('node:child_process');
const { createRequire } = require('node:module');
const { isAbsolute, join, resolve } = require('node:path');

const webRoot = resolve(__dirname, '../..');
const apiRoot = process.env.SHORTS_TEST_API_ROOT;
if (!apiRoot || !isAbsolute(apiRoot)) throw new Error('Set SHORTS_TEST_API_ROOT to the absolute superhero-api checkout path.');
const requireApi = createRequire(join(apiRoot, 'package.json'));
if (requireApi('./package.json').name !== 'wordcraft-api') throw new Error('SHORTS_TEST_API_ROOT must point to superhero-api.');
const required = ['PG_URL', 'REDIS_URL', 'S3_ENDPOINT', 'KUBO_API', 'STREAMING_REPO', 'INGEST_ROOT', 'EDGE_IMAGE'];
const missing = required.map(name => 'SHORTS_TEST_' + name).filter(name => !process.env[name]);
if (missing.length) throw new Error('Configure the disposable Shorts fixtures: ' + missing.join(', '));

const result = spawnSync(process.execPath, [
  '-r', requireApi.resolve('ts-node/register'), '-r', requireApi.resolve('tsconfig-paths/register'),
  '--test', 'src/shorts/shorts-assembled.test.cjs',
], { cwd: apiRoot, env: { ...process.env, SHORTS_TEST_WEB_REPO: webRoot }, stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
