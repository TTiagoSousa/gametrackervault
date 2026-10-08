import { NotFoundException } from '@nestjs/common';
import { UserRepository } from '../repositories/user-repository';

export async function findCurrentUser(id: string, repository: UserRepository) {
  const user = await repository.findById(id);
  if (!user) throw new NotFoundException('Utilizador não encontrado');
  return user;
}
