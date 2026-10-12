'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const TARGETS = Object.freeze({
  cursor: { label: 'Cursor', directory: '.agents/skills' },
  'claude-code': { label: 'Claude Code', directory: '.claude/skills' },
  codex: { label: 'OpenAI Codex', directory: '.agents/skills' },
  qoder: { label: 'Qoder', directory: '.qoder/skills' },
  opencode: { label: 'OpenCode', directory: '.agents/skills' },
  'kiro-cli': { label: 'Kiro', directory: '.kiro/skills' },
});
const NAME = 'autogopay-payment-gateway';
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
function validRelative(relative) {
  return typeof relative === 'string' && relative && !relative.includes('\\') &&
    !path.posix.isAbsolute(relative) && !relative.split('/').some(x => x === '..' || x === '.' || !x) &&
    !relative.includes(':');
}
async function assertNoLinks(root, destination) {
  const relative = path.relative(root, destination);
  if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Path outside workspace');
  let current = root;
  for (const segment of relative.split(path.sep).filter(Boolean)) {
    current = path.join(current, segment);
    try {
      const stat = await fs.lstat(current);
      if (stat.isSymbolicLink()) throw new Error('Symbolic links are not supported for skill installation');
    } catch (err) { if (err.code !== 'ENOENT') throw err; }
  }
}
async function buildPlan(workspace, bundle, targetIds) {
  if (!Array.isArray(targetIds) || !targetIds.length) throw new Error('Choose at least one AI target');
  if (targetIds.some(id => !Object.hasOwn(TARGETS, id))) throw new Error('Unsupported AI target');
  const root = await fs.realpath(workspace);
  const metadata = JSON.parse(await fs.readFile(path.join(bundle, 'bundle-manifest.json'), 'utf8'));
  if (metadata.name !== NAME || !Array.isArray(metadata.files) || !metadata.files.length) throw new Error('Invalid skill bundle');
  const dirs = [...new Set(targetIds.map(id => TARGETS[id].directory))];
  const seen = new Set();
  const operations = [];
  for (const entry of metadata.files) {
    if (!validRelative(entry.path) || !/^[a-f\d]{64}$/.test(entry.sha256) || seen.has(entry.path)) throw new Error('Invalid bundle entry');
    seen.add(entry.path);
    await assertNoLinks(bundle, path.join(bundle, entry.path));
    const bytes = await fs.readFile(path.join(bundle, entry.path));
    if (hash(bytes) !== entry.sha256) throw new Error('Skill bundle integrity failed');
    for (const directory of dirs) {
      const destination = path.join(root, directory, NAME, entry.path);
      await assertNoLinks(root, destination);
      let previous;
      try { previous = await fs.readFile(destination); }
      catch (err) { if (err.code !== 'ENOENT') throw err; }
      operations.push({ destination, bytes, previous,
        state: previous === undefined ? 'new' : previous.equals(bytes) ? 'same' : 'changed' });
    }
  }
  if (!seen.has('SKILL.md')) throw new Error('Bundle has no SKILL.md');
  return { root, version: metadata.version, targets: targetIds, operations };
}
async function installPlan(plan, { overwrite = false } = {}) {
  if (plan.operations.some(x => x.state === 'changed') && !overwrite) throw new Error('Existing skill changes need explicit overwrite approval');
  const completed = [];
  try {
    for (const op of plan.operations) {
      if (op.state === 'same') continue;
      await assertNoLinks(plan.root, op.destination);
      // Detect file changes after preview instead of silently overwriting them.
      let current;
      try { current = await fs.readFile(op.destination); }
      catch (err) { if (err.code !== 'ENOENT') throw err; }
      if (op.previous === undefined ? current !== undefined : !current?.equals(op.previous)) throw new Error('Skill changed since preview; retry installation');
      await fs.mkdir(path.dirname(op.destination), { recursive: true });
      const temp = op.destination + '.autogopay-' + crypto.randomUUID();
      try { await fs.writeFile(temp, op.bytes, { flag: 'wx' }); await fs.rename(temp, op.destination); }
      finally { await fs.rm(temp, { force: true }); }
      completed.push(op);
    }
    return { written: completed.length, unchanged: plan.operations.length - completed.length };
  } catch (err) {
    for (const op of completed.reverse()) {
      if (op.previous === undefined) await fs.rm(op.destination, { force: true });
      else await fs.writeFile(op.destination, op.previous);
    }
    throw err;
  }
}
module.exports = { TARGETS, NAME, buildPlan, installPlan, validRelative };
