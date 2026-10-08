import { JwtService } from '@nestjs/jwt';
import { Role } from 'src/generated/prisma/client/client';

export function loginUser(
  user: { id: string; username: string; role: Role },
  jwtService: JwtService,
) {
  const payload = { sub: user.id, username: user.username, role: user.role };
  return jwtService.sign(payload);
}
