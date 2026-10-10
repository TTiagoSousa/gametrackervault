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
   * Público: diz que este servidor é um GameTracker Vault. A app Android usa-o
   * para confirmar o endereço que o utilizador escreveu antes de o guardar.
   */
  @Get('health')
  health() {
    return { app: 'gametracker-vault', ok: true };
  }
}
