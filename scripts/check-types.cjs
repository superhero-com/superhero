#!/usr/bin/env node
/**
 * Ratchet for `tsc --noEmit`.
 *
 * The tree carries pre-existing type errors, so a plain `tsc` gate cannot be turned on without
 * fixing all of them first. This fails only when the count goes UP, which is enough to stop new
 * ones landing — the previous batch went unnoticed purely because nothing typechecked in CI.
 *
 * Lower BASELINE whenever you clear errors. Never raise it.
 */

const { spawnSync } = require('child_process');

const BASELINE = 95;

// `--pretty false` because the count is parsed out of the output: pretty mode wraps `error TS…`
// in ANSI colour, and tsc turns it on by itself the moment stdout looks like a terminal.
const tsc = spawnSync('npx', ['tsc', '--noEmit', '--pretty', 'false'], { encoding: 'utf8', shell: true });
const output = `${tsc.stdout || ''}${tsc.stderr || ''}`;
const lines = output.split('\n');

// Only errors tsc pinned to a file and position are type errors: `src/x.ts(12,3): error TS2339:`.
// A bare `error TS5058:` is tsc refusing to start (bad tsconfig, bad flag) — counting those as
// type errors turns a total failure to run into a *small* count, which reads as progress and
// invites lowering the baseline.
const errors = lines.filter((l) => /^\S.*\(\d+,\d+\): error TS\d+:/.test(l));
const startupErrors = lines.filter((l) => /^error TS\d+:/.test(l));

// A count of 0 means "clean tree" only if tsc actually ran. A missing binary, an OOM kill or the
// startup errors above all produce zero file-level matches, and would sail under the baseline —
// the gate would go green having typechecked nothing. tsc exits 0 only when it found no errors,
// so any other exit with no file-level diagnostics is a failure to run, not a clean tree.
if (tsc.error || tsc.status === null || startupErrors.length > 0
  || (tsc.status !== 0 && errors.length === 0)) {
  console.error('[types] tsc did not run to completion — refusing to report a count.\n');
  console.error(tsc.error ? tsc.error.message : output.trim() || `tsc exited ${tsc.status}`);
  process.exit(1);
}

if (errors.length > BASELINE) {
  const byFile = new Map();
  for (const line of errors) {
    const file = line.split('(')[0];
    byFile.set(file, (byFile.get(file) || 0) + 1);
  }
  console.error(`[types] ${errors.length} errors, up from the ${BASELINE} baseline.\n`);
  for (const [file, count] of [...byFile].sort((a, b) => b[1] - a[1]).slice(0, 15)) {
    console.error(`  ${String(count).padStart(3)}  ${file}`);
  }
  console.error('\nFix the new errors, or explain the rise before touching BASELINE.');
  process.exit(1);
}

if (errors.length < BASELINE) {
  console.log(`[types] ${errors.length} errors — below the ${BASELINE} baseline. Lower BASELINE in scripts/check-types.cjs.`);
  process.exit(0);
}

console.log(`[types] ${errors.length} errors, matching the baseline.`);
