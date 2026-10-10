import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from 'src/generated/prisma/client/client';
import { IntegrationsService } from './integrations.service';
import { SaveIgdbDto } from './dto/save-igdb.dto';

// The installation's external service credentials — admins only.
@Controller('integrations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Get('igdb')
  igdbStatus() {
    return this.integrationsService.igdbStatus();
  }

  @Put('igdb')
  saveIgdb(@Body() dto: SaveIgdbDto) {
    return this.integrationsService.saveIgdb(dto);
  }

  @Post('igdb/test')
  @HttpCode(200)
  testIgdb() {
    return this.integrationsService.testIgdb();
  }

  @Delete('igdb')
  removeIgdb() {
    return this.integrationsService.removeIgdb();
  }
}
