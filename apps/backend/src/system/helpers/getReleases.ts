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

// As notas vivem na mensagem da tag anotada (escrita pelo scripts/release.mjs):
//   ### Features / ### Fixes / ### Improvements, cada linha começada por "- ".
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

// Línguas com notas próprias. As notas vivem em releases/<versão>/<língua>.md.
export const NOTE_LANGUAGES = ['pt-PT', 'en', 'es'] as const;
export type NoteLanguage = (typeof NOTE_LANGUAGES)[number];

export function noteLanguage(value: string | undefined): NoteLanguage {
  return (NOTE_LANGUAGES as readonly string[]).includes(value ?? '')
    ? (value as NoteLanguage)
    : 'en';
}

// Notas já lidas, por commit de origem: uma tag não muda, e o main só muda quando
// o fetch traz commits novos (e então o sha é outro).
const notesCache = new Map<string, string | null>();

async function readFile(ref: string, path: string): Promise<string | null> {
  const key = `${ref}:${path}`;
  if (notesCache.has(key)) return notesCache.get(key) ?? null;
  const content = await git(['show', `${ref}:${path}`]).catch(() => null);
  notesCache.set(key, content);
  return content;
}

/**
 * As notas de uma release na língua pedida. Procura releases/<versão>/<língua>.md
 * primeiro no main (assim as traduções podem chegar ou ser corrigidas depois da
 * release) e depois na própria tag; sem ficheiro nessa língua usa o inglês, e sem
 * ficheiro nenhum a mensagem da tag (é o que as releases antigas têm).
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
 * Todas as releases (tags vX.Y.Z), da mais recente para a mais antiga, com as notas
 * na língua pedida. Vai buscar as tags novas ao remoto no máximo de 5 em 5 minutos;
 * sem rede, usa as que já tem.
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
