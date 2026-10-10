import { LibraryStatus } from 'src/generated/prisma/client/client';
import { EntryWithGame } from 'src/library/repositories/library-repository';
import { estimateHours } from 'src/library/helpers/estimateHours';

// How much of the shelf is sent to the model: newest first
const MAX_ENTRIES = 400;
const MAX_NOTE = 300;

const STATUS_LABEL: Record<LibraryStatus, string> = {
  PLAYING: 'playing now',
  PAUSED: 'paused',
  PLAN_TO_PLAY: 'wants to play (backlog)',
  FINISHED_MAIN: 'finished the main story',
  FINISHED_EXTRAS: 'finished main story + side content',
  COMPLETED_100: 'completed 100%',
  DROPPED: 'dropped',
};

const LANGUAGE: Record<string, string> = {
  'pt-PT': 'European Portuguese (pt-PT — never Brazilian Portuguese)',
  en: 'English',
  es: 'Spanish (Spain)',
};

const day = (date: Date | null) =>
  date ? date.toISOString().slice(0, 10) : null;

/** One line per game: what the user did with it and what they thought. */
function describeEntry(entry: EntryWithGame): string {
  const { game } = entry;
  const hours = estimateHours(entry, game);
  const parts = [
    `[id ${game.igdbId}] ${game.name}${game.releaseYear ? ` (${game.releaseYear})` : ''}`,
    `status: ${STATUS_LABEL[entry.status]}`,
    hours.hours != null
      ? `hours: ${hours.hours}${hours.estimated ? ' (estimated from IGDB average, not logged)' : ''}`
      : null,
    entry.rating != null ? `rating: ${entry.rating}/10` : null,
    game.genres.length ? `genres: ${game.genres.join(', ')}` : null,
    day(entry.startedAt) ? `started: ${day(entry.startedAt)}` : null,
    day(entry.finishedAt) ? `finished: ${day(entry.finishedAt)}` : null,
    entry.notes
      ? `notes: "${entry.notes.replace(/\s+/g, ' ').slice(0, MAX_NOTE)}"`
      : null,
  ].filter(Boolean);
  return `- ${parts.join(' | ')}`;
}

/**
 * The assistant's instructions: who it is, how to answer, how to link games to
 * the app's pages, and the user's whole shelf (the model uses it to
 * recommend).
 */
export function buildSystemPrompt(args: {
  username: string;
  language: string;
  entries: EntryWithGame[];
}): string {
  const { entries } = args;
  const shown = entries.slice(0, MAX_ENTRIES);
  const shelf = shown.length
    ? shown.map(describeEntry).join('\n')
    : '(the shelf is empty — the user has not added any games yet)';

  return `You are the assistant inside GameTracker Vault, a personal app where ${args.username} keeps track of the video games they are playing, have finished, dropped or want to play.

Today is ${new Date().toISOString().slice(0, 10)}.

## How to answer
- Always answer in ${LANGUAGE[args.language] ?? LANGUAGE['pt-PT']}, whatever language the shelf data is in.
- Be direct and concrete. Short paragraphs and short lists; no filler, no long introductions.
- You can talk about any video game topic: games, series, studios, platforms, history, tips, how long a game takes, what to play next.
- For recommendations, ground them in the shelf below: weigh the user's ratings (8–10 = loved, 1–4 = disliked), what they finished vs. dropped, the genres they play most, hours spent, and their notes. Say briefly why each pick fits *them* (e.g. "because you gave The Witcher 3 a 10"). Never recommend a game that is already on the shelf as something new — but you may suggest games from their backlog ("wants to play").
- Hours marked "estimated" are IGDB averages, not what the user logged; don't present them as the user's own numbers.
- If something depends on facts you are unsure about (release dates, new games after your knowledge, exact details), use the search_games tool instead of guessing.

## Linking games
Whenever you mention a specific game whose IGDB id you know (from the shelf below or from a tool result), write it as a Markdown link with the scheme "game:" and the id, e.g. [The Witcher 3: Wild Hunt](game:1942). The app turns these into links to the game's page. Never invent ids — if you don't know the id, use search_games or write the name without a link.

## ${args.username}'s shelf (${entries.length} games${entries.length > shown.length ? `, showing the ${shown.length} most recent` : ''})
${shelf}`;
}
