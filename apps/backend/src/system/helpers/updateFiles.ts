import { promises as fs } from 'fs';
import { join } from 'path';

/**
 * Files shared with the updater (deploy/proxmox/update.sh), in the
 * SYSTEM_UPDATES_DIR folder. The backend runs unprivileged and doesn't update anything itself:
 * it writes `request` with the requested version, and a systemd .path unit (root) sees the
 * file appear and runs the update. Progress comes back in `status.json` and the
 * output in `update.log`.
 *
 * Without SYSTEM_UPDATES_DIR (development) updates are disabled.
 */
export function updatesDir(): string | null {
  return process.env.SYSTEM_UPDATES_DIR || null;
}

export type UpdateState = 'idle' | 'queued' | 'running' | 'success' | 'failed';

export interface UpdateStatus {
  state: UpdateState;
  target: string | null;
  from: string | null;
  step: string | null;
  message: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  log: string[];
}

const IDLE: UpdateStatus = {
  state: 'idle',
  target: null,
  from: null,
  step: null,
  message: null,
  startedAt: null,
  finishedAt: null,
  log: [],
};

// Terminal colour codes that update.sh writes to the log.
const ESC = String.fromCharCode(27);
const ANSI_COLOURS = new RegExp(`${ESC}\\[[0-9;]*m`, 'g');

export async function readUpdateStatus(logLines = 40): Promise<UpdateStatus> {
  const dir = updatesDir();
  if (!dir) return IDLE;

  const pending = await fs
    .readFile(join(dir, 'request'), 'utf8')
    .catch(() => null);
  const raw = await fs
    .readFile(join(dir, 'status.json'), 'utf8')
    .catch(() => null);
  let status: UpdateStatus = { ...IDLE };
  if (raw) {
    try {
      status = {
        ...IDLE,
        ...(JSON.parse(raw) as Partial<UpdateStatus>),
        log: [],
      };
    } catch {
      // file half-written: the previous status stays until the next read
    }
  }

  // Request written but the updater hasn't picked it up yet.
  if (pending && status.state !== 'running') {
    status = { ...IDLE, state: 'queued', target: pending.trim() };
  }

  const log = await fs
    .readFile(join(dir, 'update.log'), 'utf8')
    .catch(() => '');
  const lines = log
    .replace(ANSI_COLOURS, '')
    .split('\n')
    .filter((line) => line.trim());
  status.log = logLines > 0 ? lines.slice(-logLines) : [];
  return status;
}

/** Writes the request atomically (the updater never reads half a file). */
export async function writeUpdateRequest(version: string): Promise<void> {
  const dir = updatesDir();
  if (!dir) throw new Error('Updates are disabled');
  const tmp = join(dir, `.request-${process.pid}`);
  await fs.writeFile(tmp, `${version}\n`, { mode: 0o644 });
  await fs.rename(tmp, join(dir, 'request'));
}
