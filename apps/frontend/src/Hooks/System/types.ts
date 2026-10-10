import i18n from '../../i18n';

// Shapes returned by /system/* (admins only).

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

export interface ListedRelease extends Release {
  installed: boolean;
  newer: boolean;
}

export interface InstalledVersion {
  version: string | null;
  baseVersion: string | null;
  commit: string;
  date: string | null;
  branch: string | null;
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

export interface VersionOverview {
  updatesEnabled: boolean;
  installed: InstalledVersion;
  latest: Release | null;
  updateAvailable: boolean;
  newerCount: number;
  offline: boolean;
  update: UpdateStatus;
}

export interface ReleaseList {
  updatesEnabled: boolean;
  installed: InstalledVersion;
  offline: boolean;
  releases: ListedRelease[];
}

/** What is shown as the installed version: the release, or the branch and commit. */
export const installedLabel = (installed: InstalledVersion | undefined) => {
  if (!installed) return '—';
  if (installed.version) return installed.version;
  const base = installed.baseVersion ? `${installed.baseVersion}+` : '';
  return `${base}${installed.branch ?? 'dev'} (${installed.commit})`;
};

/** The error message of an axios request (or of any other error). */
export const errorMessage = (error: unknown): string => {
  const e = error as { response?: { data?: { message?: string | string[] } }; message?: string };
  const message = e?.response?.data?.message ?? e?.message;
  return (Array.isArray(message) ? message.join(', ') : message) || i18n.t('common:errors.generic');
};
