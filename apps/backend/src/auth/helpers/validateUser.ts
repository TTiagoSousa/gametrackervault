import { PrismaUserRepository } from 'src/user/repositories/prisma/prisma-user-repository';
import * as bcrypt from 'bcrypt';

export async function validateUser(
  username: string,
  password: string,
  userRepository: PrismaUserRepository,
) {
  const user = await userRepository.findByUsername(username);
  if (!user) return null;

  const valid = await bcrypt.compare(password, user.hashedPassword);
  if (!valid) return null;

  const { hashedPassword: _, ...result } = user;
  return result;
}
