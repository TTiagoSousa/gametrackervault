import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Role } from 'src/generated/prisma/client/client';
import { UserRepository } from '../repositories/user-repository';

/**
 * The admin deletes an account (the shelf and assistant key go with it).
 * Can't delete themselves or the last administrator.
 */
export async function deleteUserByAdmin(
  id: string,
  requesterId: string,
  repository: UserRepository,
) {
  if (id === requesterId) {
    throw new BadRequestException('Não podes apagar a tua própria conta.');
  }
  const user = await repository.findById(id);
  if (!user) throw new NotFoundException('Utilizador não encontrado');
  if (user.role === Role.ADMIN && (await repository.countAdmins()) <= 1) {
    throw new BadRequestException('Tem de haver pelo menos um administrador.');
  }
  await repository.delete(id);
  return { message: 'Utilizador apagado' };
}
