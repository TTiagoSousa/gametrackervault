import { BadRequestException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserRepository } from '../repositories/user-repository';
import { comparePasswords } from 'src/utils/password/compare.passwords';

/** Muda a password do próprio utilizador, confirmando primeiro a atual. */
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
