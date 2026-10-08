import { promises as fs } from 'fs';
import { join } from 'path';

/**
 * Ficheiros partilhados com o atualizador (deploy/proxmox/update.sh), na pasta
 * SYSTEM_UPDATES_DIR. O backend corre sem privilégios e não atualiza nada sozinho:
 * escreve `request` com a versão pedida, e uma unit .path do systemd (root) vê o
 * ficheiro aparecer e corre a atualização. O progresso volta em `status.json` e o
 * output em `update.log`.
 *
 * Sem SYSTEM_UPDATES_DIR (desenvolvimento) as atualizações estão desligadas.
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

// Códigos de cor do terminal que o update.sh escreve no log.
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
      // ficheiro a meio de ser escrito: fica o estado anterior na próxima leitura
    }
  }

  // Pedido escrito mas o atualizador ainda não lhe pegou.
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

/** Escreve o pedido de forma atómica (o atualizador nunca lê meio ficheiro). */
export async function writeUpdateRequest(version: string): Promise<void> {
  const dir = updatesDir();
  if (!dir) throw new Error('Updates are disabled');
  const tmp = join(dir, `.request-${process.pid}`);
  await fs.writeFile(tmp, `${version}\n`, { mode: 0o644 });
  await fs.rename(tmp, join(dir, 'request'));
}
