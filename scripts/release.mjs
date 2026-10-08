#!/usr/bin/env node
// Creates a release: the next vX.Y.Z tag on the current commit, with release notes
// built from the Conventional Commits since the previous release.
//
// Notes live in releases/<version>/<language>.md (en, pt-PT, es); the app shows the
// one for the interface language and falls back to English. The flow on main:
//
//   npm run release -- --prepare            writes releases/<version>/en.md from the commits
//   (write pt-PT.md and es.md, commit them)
//   npm run release -- --push               tags with en.md as the message and pushes
//
// Other options:
//   --dry-run                 preview version and notes, change nothing
//   --version v2.0.0          force a version
//   --title "Headline"        first line of the generated notes
//   --notes notes.md          use a hand-written English file instead
//   --allow-branch            tag somewhere other than main
//
// The version bump follows the commits: a breaking change ("!" or BREAKING CHANGE)
// bumps the major, a feat the minor, anything else the patch.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const option = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

const git = (...a) => execFileSync('git', a, { encoding: 'utf8' }).trim();
// Like git(), but a failure is an empty answer and git's stderr stays quiet
// ("No names found" before the first release).
const tryGit = (...a) => {
  try {
    return execFileSync('git', a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
};
const fail = (message) => {
  console.error(`✗ ${message}`);
  process.exit(1);
};

const VERSION = /^v(\d+)\.(\d+)\.(\d+)$/;

// --- checks -----------------------------------------------------------------------------

if (git('status', '--porcelain')) fail('The working tree has uncommitted changes.');
const branch = git('rev-parse', '--abbrev-ref', 'HEAD');
if (branch !== 'main' && !flag('allow-branch')) {
  fail(`Releases are tagged on main (you are on ${branch}). Use --allow-branch to override.`);
}
if (tryGit('describe', '--tags', '--exact-match', '--match', 'v*', 'HEAD')) {
  fail('This commit is already a release.');
}

// --- commits since the last release -----------------------------------------------------

const previous = tryGit('describe', '--tags', '--abbrev=0', '--match', 'v*', 'HEAD');
const range = previous ? `${previous}..HEAD` : 'HEAD';
const SEP = '\u001e';
const log = git('log', range, '--no-merges', `--format=%s%x00%b${SEP}`);

const SKIP = new Set(['chore', 'docs', 'ci', 'test', 'style', 'build']);
const SECTION = { feat: 'features', fix: 'fixes', perf: 'improvements', refactor: 'improvements' };
const notes = { features: [], fixes: [], improvements: [] };
let breaking = false;

for (const entry of log.split(SEP)) {
  const [subject = '', body = ''] = entry.replace(/^\n/, '').split('\u0000');
  const m = /^(\w+)(?:\(([^)]+)\))?(!)?:\s*(.+)$/.exec(subject.trim());
  if (!m) continue;
  const [, type, scope, bang, text] = m;
  if (bang || /BREAKING CHANGE/.test(body)) breaking = true;
  if (SKIP.has(type) && !bang) continue;
  const section = SECTION[type] ?? 'improvements';
  notes[section].push(scope ? `**${scope}**: ${text}` : text);
}

const count = notes.features.length + notes.fixes.length + notes.improvements.length;

// --- version ----------------------------------------------------------------------------

let version = option('version');
if (version) {
  if (!VERSION.test(version)) fail(`--version must look like v1.2.3 (got ${version}).`);
} else if (!previous) {
  version = 'v1.0.0';
} else {
  if (count === 0) fail(`Nothing to release: no feat/fix/perf/refactor commits since ${previous}.`);
  const [, major, minor, patch] = VERSION.exec(previous).map(Number);
  version =
    breaking ? `v${major + 1}.0.0` : notes.features.length ? `v${major}.${minor + 1}.0` : `v${major}.${minor}.${patch + 1}`;
}
if (tryGit('rev-parse', '-q', '--verify', `refs/tags/${version}`)) fail(`Tag ${version} already exists.`);

// --- notes ------------------------------------------------------------------------------

const LANGUAGES = ['en', 'pt-PT', 'es'];
const notesDir = join('releases', version);
const notesPath = (language) => join(notesDir, `${language}.md`);

let message;
const notesFile = option('notes');
if (notesFile) {
  message = readFileSync(notesFile, 'utf8').trim();
} else if (existsSync(notesPath('en')) && !flag('prepare')) {
  message = readFileSync(notesPath('en'), 'utf8').trim();
} else {
  const lines = [option('title') ?? `${version}`];
  const add = (heading, items) => {
    if (!items.length) return;
    lines.push('', `### ${heading}`, ...items.map((i) => `- ${i}`));
  };
  add('Features', notes.features);
  add('Fixes', notes.fixes);
  add('Improvements', notes.improvements);
  message = lines.join('\n');
}

console.log(`Previous release: ${previous || '(none)'}`);
console.log(`New release:      ${version}${breaking ? '  (breaking changes)' : ''}\n`);
console.log(message);
console.log('');

if (flag('dry-run')) {
  console.log('Dry run — no tag created.');
  process.exit(0);
}

// --prepare: write the English notes and stop; the translations and the commit come
// before the tag, so all the files are on main when the release is created.
if (flag('prepare')) {
  if (existsSync(notesPath('en')) && !flag('force')) {
    fail(`${notesPath('en')} already exists (use --force to overwrite).`);
  }
  mkdirSync(notesDir, { recursive: true });
  writeFileSync(notesPath('en'), `${message}\n`);
  console.log(`✓ Wrote ${notesPath('en')}`);
  console.log('  Next: write pt-PT.md and es.md next to it (same "### Features/Fixes/Improvements"');
  console.log('  headings), commit them on main, then: npm run release -- --push');
  process.exit(0);
}

const missing = LANGUAGES.filter((language) => !existsSync(notesPath(language)));
if (missing.length) {
  console.log(`! No ${missing.map((l) => `${l}.md`).join(', ')} in ${notesDir} — those languages fall back to English.`);
}

// --cleanup=verbatim: the default "strip" would drop the "### Features" headings as
// if they were comments.
const file = join(tmpdir(), `gametracker-release-${process.pid}.md`);
writeFileSync(file, `${message}\n`);
try {
  git('tag', '-a', version, '-F', file, '--cleanup=verbatim');
} finally {
  unlinkSync(file);
}
console.log(`✓ Tag ${version} created.`);

if (flag('push')) {
  execFileSync('git', ['push', 'origin', version], { stdio: 'inherit' });
  console.log(`✓ ${version} pushed — the app will offer it under Admin → Versions.`);
} else {
  console.log(`  Push it with: git push origin ${version}`);
}
