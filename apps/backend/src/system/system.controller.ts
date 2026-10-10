import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from 'src/generated/prisma/client/client';
import { SystemService } from './system.service';
import { RequestUpdateDto } from './dto/request-update.dto';

// Installed version, releases and updates — admins only.
@Controller('system')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class SystemController {
  constructor(private readonly systemService: SystemService) {}

  @Get('version')
  // lang: pt-PT, en or es — the language of the notes (any other value gives English).
  version(@Query('lang') lang?: string) {
    return this.systemService.version(lang);
  }

  @Get('releases')
  releases(@Query('refresh') refresh?: string, @Query('lang') lang?: string) {
    return this.systemService.releases(refresh === '1', lang);
  }

  @Post('update')
  @HttpCode(202)
  update(@Body() dto: RequestUpdateDto) {
    return this.systemService.update(dto.version);
  }

  @Get('update/status')
  updateStatus() {
    return this.systemService.updateStatus();
  }
}
