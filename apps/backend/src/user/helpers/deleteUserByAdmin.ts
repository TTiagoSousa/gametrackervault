import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Role } from 'src/generated/prisma/client/client';
import { UserRepository } from '../repositories/user-repository';

/**
 * O admin apaga uma conta (a estante e a chave do assistente vão com ela).
 * Não se apaga a si próprio nem o último administrador.
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
