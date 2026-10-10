import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { JwtPayload } from '../jwt-payload.interface';
import { SESSION_COOKIE } from '../session-cookie';
import { PrismaUserRepository } from 'src/user/repositories/prisma/prisma-user-repository';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly users: PrismaUserRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) =>
          (req?.cookies as Record<string, string> | undefined)?.[
            SESSION_COOKIE
          ] ?? null,
      ]),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET')!,
    });
  }

  // The token only says who it is; name and role always come from the database. So changing
  // the name, changing the role or deleting the account takes effect immediately, without waiting
  // for the token to expire.
  async validate(payload: { sub: string }): Promise<JwtPayload> {
    const user = await this.users.findById(payload.sub);
    if (!user) throw new UnauthorizedException('Sessão inválida');
    return { id: user.id, username: user.username, role: user.role };
  }
}
