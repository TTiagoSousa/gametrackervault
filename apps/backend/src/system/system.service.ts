import { Injectable } from '@nestjs/common';
import { getVersionOverview, listReleases } from './helpers/getVersionOverview';
import { noteLanguage } from './helpers/getReleases';
import { requestUpdate } from './helpers/requestUpdate';
import { readUpdateStatus } from './helpers/updateFiles';

@Injectable()
export class SystemService {
  version(lang?: string) {
    return getVersionOverview(noteLanguage(lang));
  }

  releases(force: boolean, lang?: string) {
    return listReleases(force, noteLanguage(lang));
  }

  update(version: string) {
    return requestUpdate(version);
  }

  updateStatus() {
    return readUpdateStatus();
  }
}
