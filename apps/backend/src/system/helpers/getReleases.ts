import { git } from './git';
import { compareVersions, isVersion } from './semver';

export interface ReleaseNotes {
  features: string[];
  fixes: string[];
  improvements: string[];
  other: string[];
}

export interface Release {
  version: string;
  date: string;
  title: string | null;
  notes: ReleaseNotes;
}

const FETCH_EVERY_MS = 5 * 60 * 1000;
let lastFetch = 0;
let lastFetchFailed = false;

// The notes live in the annotated tag message (written by scripts/release.mjs):
//   ### Features / ### Fixes / ### Improvements, each line starting with "- ".
const SECTION_KEYS: Record<string, keyof ReleaseNotes> = {
  features: 'features',
  'new features': 'features',
  fixes: 'fixes',
  'bug fixes': 'fixes',
  improvements: 'improvements',
};

function parseNotes(message: string): {
  title: string | null;
  notes: ReleaseNotes;
} {
  const notes: ReleaseNotes = {
    features: [],
    fixes: [],
    improvements: [],
    other: [],
  };
  let title: string | null = null;
  let section: keyof ReleaseNotes = 'other';

  for (const raw of message.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const heading = /^#{1,6}\s+(.+)$/.exec(line);
    if (heading) {
      section = SECTION_KEYS[heading[1].trim().toLowerCase()] ?? 'other';
      continue;
    }
    const item = /^[-*]\s+(.+)$/.exec(line);
    if (item) {
      notes[section].push(item[1]);
    } else if (title === null) {
      title = line;
    } else {
      notes[section].push(line);
    }
  }
  return { title, notes };
}

// Languages with their own notes. The notes live in releases/<version>/<language>.md.
export const NOTE_LANGUAGES = ['pt-PT', 'en', 'es'] as const;
export type NoteLanguage = (typeof NOTE_LANGUAGES)[number];

export function noteLanguage(value: string | undefined): NoteLanguage {
  return (NOTE_LANGUAGES as readonly string[]).includes(value ?? '')
    ? (value as NoteLanguage)
    : 'en';
}

// Notes already read, by source commit: a tag doesn't change, and main only changes when
// fetch brings new commits (and then the sha is different).
const notesCache = new Map<string, string | null>();

async function readFile(ref: string, path: string): Promise<string | null> {
  const key = `${ref}:${path}`;
  if (notesCache.has(key)) return notesCache.get(key) ?? null;
  const content = await git(['show', `${ref}:${path}`]).catch(() => null);
  notesCache.set(key, content);
  return content;
}

/**
 * A release's notes in the requested language. Looks for releases/<version>/<language>.md
 * first on main (so translations can arrive or be fixed after the
 * release) and then on the tag itself; with no file in that language it uses English, and with
 * no file at all the tag message (which is what old releases have).
 */
async function notesFor(
  version: string,
  tagMessage: string,
  language: NoteLanguage,
  mainSha: string | null,
): Promise<string> {
  const languages = language === 'en' ? ['en'] : [language, 'en'];
  const refs = [mainSha, version].filter((r): r is string => Boolean(r));
  for (const lang of languages) {
    for (const ref of refs) {
      const content = await readFile(ref, `releases/${version}/${lang}.md`);
      if (content) return content;
    }
  }
  return tagMessage;
}

/**
 * All releases (vX.Y.Z tags), newest to oldest, with the notes
 * in the requested language. Fetches new tags from the remote at most every 5 minutes;
 * without network, uses the ones it has.
 */
export async function getReleases(
  force = false,
  language: NoteLanguage = 'en',
): Promise<{ releases: Release[]; offline: boolean }> {
  if (force || Date.now() - lastFetch > FETCH_EVERY_MS) {
    try {
      await git(['fetch', '--tags', '--force', '--quiet', 'origin'], 30_000);
      lastFetchFailed = false;
    } catch {
      lastFetchFailed = true;
    }
    lastFetch = Date.now();
  }

  const SEP = '\u001e';
  const raw = await git([
    'for-each-ref',
    'refs/tags/v*',
    `--format=%(refname:short)%00%(creatordate:iso-strict)%00%(contents)${SEP}`,
  ]).catch(() => '');

  const tags = raw
    .split(SEP)
    .map((chunk) => chunk.replace(/^\n/, ''))
    .filter((chunk) => chunk.includes('\u0000'))
    .map((chunk) => {
      const [version, date, message = ''] = chunk.split('\u0000');
      return { version, date, message };
    })
    .filter((tag) => isVersion(tag.version))
    .sort((a, b) => compareVersions(b.version, a.version));

  const mainSha = await git([
    'rev-parse',
    '--verify',
    '-q',
    'origin/main',
  ]).catch(() => null);
  const releases: Release[] = [];
  for (const tag of tags) {
    const text = await notesFor(tag.version, tag.message, language, mainSha);
    const { title, notes } = parseNotes(text);
    releases.push({ version: tag.version, date: tag.date, title, notes });
  }

  return { releases, offline: lastFetchFailed };
}
