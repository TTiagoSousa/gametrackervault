import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  /**
   * Public: says this server is a GameTracker Vault. The Android app uses it
   * to confirm the address the user typed before saving it.
   */
  @Get('health')
  health() {
    return { app: 'gametracker-vault', ok: true };
  }
}
