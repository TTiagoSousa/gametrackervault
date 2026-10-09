import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { UserService } from './user.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { JwtPayload } from 'src/auth/jwt-payload.interface';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from 'src/generated/prisma/client/client';
import { AdminCreateUserDto } from './dto/admin-create-user.dto';
import {
  AdminUpdateUserDto,
  ChangePasswordDto,
  UpdateUsernameDto,
} from './dto/update-account.dto';

type AuthRequest = Request & { user: JwtPayload };

@Controller('user')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  findCurrent(@Req() req: AuthRequest) {
    return this.userService.findCurrent(req.user.id);
  }

  // --- A própria conta ---------------------------------------------------------------

  @Patch('me')
  updateUsername(@Req() req: AuthRequest, @Body() dto: UpdateUsernameDto) {
    return this.userService.updateUsername(req.user.id, dto.username);
  }

  @Put('me/password')
  @HttpCode(200)
  changePassword(@Req() req: AuthRequest, @Body() dto: ChangePasswordDto) {
    return this.userService.changePassword(req.user.id, dto);
  }

  // --- Administração -----------------------------------------------------------------

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Get()
  findAll() {
    return this.userService.findAll();
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Post()
  create(@Body() dto: AdminCreateUserDto) {
    return this.userService.create(dto);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminUpdateUserDto,
  ) {
    return this.userService.updateByAdmin(id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Delete(':id')
  remove(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.userService.deleteByAdmin(id, req.user.id);
  }
}
