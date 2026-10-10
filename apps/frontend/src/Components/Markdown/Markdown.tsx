import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import './Markdown.scss';

/**
 * Simple Markdown for the assistant's replies — headings, paragraphs,
 * lists, bold, italic, code and links. Builds React elements (never raw
 * HTML), so the model's text can't inject anything into the page.
 *
 * "game:<id>" links open that game's page in the app, "/Vault/…" another app
 * page and http(s) open in a new window; any other scheme stays as plain text.
 */

// Bold, italic, code and links within a line. Italic is asterisks
// only: underscores would catch names like "game_time_to_beats".
const INLINE = /(\*\*([^*]+)\*\*|__([^_]+)__|\*([^*\s][^*]*)\*|`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\))/g;

function inline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let index = 0;
  for (const match of text.matchAll(INLINE)) {
    const start = match.index ?? 0;
    if (start > last) out.push(text.slice(last, start));
    const key = `${keyBase}-${index++}`;
    if (match[2] ?? match[3]) out.push(<strong key={key}>{inline(match[2] ?? match[3], key)}</strong>);
    else if (match[4]) out.push(<em key={key}>{inline(match[4], key)}</em>);
    else if (match[5]) out.push(<code key={key}>{match[5]}</code>);
    else if (match[6]) {
      const label = match[6];
      const href = match[7];
      const game = /^game:(\d+)$/.exec(href);
      if (game) out.push(<Link key={key} to={`/Vault/Game/${game[1]}`} className='Markdown_Game'>{label}</Link>);
      else if (href.startsWith('/Vault')) out.push(<Link key={key} to={href}>{label}</Link>);
      else if (/^https?:\/\//.test(href)) out.push(<a key={key} href={href} target='_blank' rel='noreferrer'>{label}</a>);
      else out.push(label);
    }
    last = start + match[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

type Block =
  | { type: 'heading'; level: number; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'code'; text: string };

function parse(source: string): Block[] {
  const blocks: Block[] = [];
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  let paragraph: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flush = () => {
    if (paragraph.length) blocks.push({ type: 'paragraph', text: paragraph.join(' ') });
    if (list) blocks.push({ type: 'list', ...list });
    paragraph = [];
    list = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim().startsWith('```')) {
      flush();
      const code: string[] = [];
      for (i++; i < lines.length && !lines[i].trim().startsWith('```'); i++) code.push(lines[i]);
      blocks.push({ type: 'code', text: code.join('\n') });
      continue;
    }

    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading) {
      flush();
      blocks.push({ type: 'heading', level: heading[1].length, text: heading[2] });
      continue;
    }

    const bullet = /^\s*[-*•]\s+(.*)$/.exec(line);
    const numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    if (bullet || numbered) {
      const ordered = Boolean(numbered);
      if (paragraph.length) {
        blocks.push({ type: 'paragraph', text: paragraph.join(' ') });
        paragraph = [];
      }
      if (list && list.ordered !== ordered) {
        blocks.push({ type: 'list', ...list });
        list = null;
      }
      list ??= { ordered, items: [] };
      list.items.push((bullet ?? numbered)![1]);
      continue;
    }

    if (!line.trim()) {
      flush();
      continue;
    }

    // Line continuing the previous list item
    if (list && /^\s{2,}/.test(line)) {
      list.items[list.items.length - 1] += ` ${line.trim()}`;
      continue;
    }
    if (list) {
      blocks.push({ type: 'list', ...list });
      list = null;
    }
    paragraph.push(line.trim());
  }
  flush();
  return blocks;
}

const Markdown = ({ text }: { text: string }) => (
  <div className='Markdown'>
    {parse(text).map((block, i) => {
      const key = `b${i}`;
      switch (block.type) {
        case 'heading':
          return block.level <= 2
            ? <h3 key={key}>{inline(block.text, key)}</h3>
            : <h4 key={key}>{inline(block.text, key)}</h4>;
        case 'list': {
          const items = block.items.map((item, j) => <li key={j}>{inline(item, `${key}-${j}`)}</li>);
          return block.ordered ? <ol key={key}>{items}</ol> : <ul key={key}>{items}</ul>;
        }
        case 'code':
          return <pre key={key}><code>{block.text}</code></pre>;
        default:
          return <p key={key}>{inline(block.text, key)}</p>;
      }
    })}
  </div>
);

export default Markdown;
