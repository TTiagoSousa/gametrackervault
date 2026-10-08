import { PrismaUserRepository } from '../repositories/prisma/prisma-user-repository';

export async function findAllUsers(userRepository: PrismaUserRepository) {
  return userRepository.findAll();
}
