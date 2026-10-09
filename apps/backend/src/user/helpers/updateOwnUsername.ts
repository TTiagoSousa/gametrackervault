import { ConflictException } from '@nestjs/common';
import { UserRepository } from '../repositories/user-repository';

/** Muda o nome do próprio utilizador; o nome é único na instalação. */
export async function updateOwnUsername(
  userId: string,
  username: string,
  repository: UserRepository,
) {
  const name = username.trim();
  const taken = await repository.findByUsername(name);
  if (taken && taken.id !== userId) {
    throw new ConflictException('Esse nome já está a ser usado.');
  }
  return repository.update(userId, { username: name });
}
