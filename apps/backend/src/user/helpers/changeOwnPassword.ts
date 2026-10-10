import { BadRequestException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserRepository } from '../repositories/user-repository';
import { comparePasswords } from 'src/utils/password/compare.passwords';

/** Changes the user's own password, confirming the current one first. */
export async function changeOwnPassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
  repository: UserRepository,
) {
  const user = await repository.findByIdWithPassword(userId);
  if (!user) throw new NotFoundException('Utilizador não encontrado');

  const matches = await comparePasswords({
    password: currentPassword,
    hash: user.hashedPassword,
  });
  if (!matches) throw new BadRequestException('A password atual está errada.');

  const hashedPassword = await bcrypt.hash(newPassword, 12);
  await repository.update(userId, { hashedPassword });
  return { message: 'Password alterada' };
}
