import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { CreateUserDto } from 'src/user/dto/create-user.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtPayload } from './jwt-payload.interface';
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_MS,
  sessionCookieOptions,
} from './session-cookie';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(200)
  register(@Body() dto: CreateUserDto) {
    return this.authService.register(dto);
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(200)
  login(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = this.authService.login(req.user as JwtPayload);

    res.cookie(SESSION_COOKIE, token, {
      ...sessionCookieOptions(req),
      maxAge: SESSION_MAX_AGE_MS,
    });

    return { message: 'Login efetuado com sucesso' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(200)
  logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    res.clearCookie(SESSION_COOKIE, sessionCookieOptions(req));
    return { message: 'Sessão terminada' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@Req() req: Request & { user: JwtPayload }) {
    return req.user;
  }
}
