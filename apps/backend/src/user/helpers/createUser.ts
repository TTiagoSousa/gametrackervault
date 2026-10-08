import { ConflictException } from '@nestjs/common';
import { PrismaUserRepository } from '../repositories/prisma/prisma-user-repository';
import { CreateUserDto } from '../dto/create-user.dto';
import { Role } from 'src/generated/prisma/client/client';
import * as bcrypt from 'bcrypt';

export async function createUser(
  dto: CreateUserDto,
  userRepository: PrismaUserRepository,
) {
  const usernameExists = await userRepository.findByUsername(dto.username);
  if (usernameExists) throw new ConflictException('Username já existe');

  const userCount = await userRepository.count();
  const role = userCount === 0 ? Role.ADMIN : Role.USER;

  const hashedPassword = await bcrypt.hash(dto.password, 12);
  const { hashedPassword: _, ...user } = await userRepository.create({
    username: dto.username,
    hashedPassword,
    role,
  });
  return user;
}
