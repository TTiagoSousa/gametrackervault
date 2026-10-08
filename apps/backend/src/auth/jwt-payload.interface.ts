import { Role } from 'src/generated/prisma/client/client';

export interface JwtPayload {
  id: string;
  username: string;
  role: Role;
}
