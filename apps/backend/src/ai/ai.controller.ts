import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  Post,
  Put,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { JwtPayload } from 'src/auth/jwt-payload.interface';
import { AiService } from './ai.service';
import { ChatDto, ListModelsDto, SaveAiSettingsDto } from './dto/ai.dto';
import { ChatEvent } from './helpers/streamChat';

type AuthRequest = Request & { user: JwtPayload };

// O assistente de cada utilizador: a sua chave, o seu modelo, a sua conversa.
@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Get('settings')
  getSettings(@Req() req: AuthRequest) {
    return this.ai.getSettings(req.user.id);
  }

  @Put('settings')
  saveSettings(@Req() req: AuthRequest, @Body() dto: SaveAiSettingsDto) {
    return this.ai.saveSettings(req.user.id, dto);
  }

  @Delete('settings')
  removeSettings(@Req() req: AuthRequest) {
    return this.ai.removeSettings(req.user.id);
  }

  // POST para a chave (ainda por guardar) não ir parar a um URL
  @Post('models')
  @HttpCode(200)
  models(@Req() req: AuthRequest, @Body() dto: ListModelsDto) {
    return this.ai.models(req.user.id, dto.apiKey);
  }

  /**
   * A resposta do assistente em streaming: uma linha JSON por evento
   * (application/x-ndjson) — pedaços de texto, pesquisas no IGDB, erro e fim.
   * Se o browser fechar a ligação, o pedido à Anthropic é cancelado.
   */
  @Post('chat')
  async chat(
    @Req() req: AuthRequest,
    @Res() res: Response,
    @Body() dto: ChatDto,
  ) {
    const controller = new AbortController();
    res.on('close', () => {
      if (!res.writableEnded) controller.abort();
    });

    const emit = (event: ChatEvent) => {
      if (!res.headersSent) {
        res.status(200);
        res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        // O nginx não deve guardar a resposta antes de a mandar
        res.setHeader('X-Accel-Buffering', 'no');
        res.flushHeaders();
      }
      res.write(`${JSON.stringify(event)}\n`);
    };

    try {
      await this.ai.chat(req.user, dto, controller.signal, emit);
    } catch (error) {
      if (controller.signal.aborted) return;
      const message =
        error instanceof HttpException
          ? String(
              (error.getResponse() as { message?: string }).message ??
                error.message,
            )
          : 'O assistente falhou a responder. Tenta outra vez.';
      // Antes de começar a resposta, um erro HTTP normal; a meio, uma linha de erro
      if (!res.headersSent) {
        const status = error instanceof HttpException ? error.getStatus() : 500;
        res.status(status).json({ statusCode: status, message });
        return;
      }
      emit({ type: 'error', message });
    }
    if (!res.writableEnded) res.end();
  }
}
