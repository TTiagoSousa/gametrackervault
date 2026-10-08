import { ConflictException } from '@nestjs/common';
import { PrismaUserRepository } from '../repositories/prisma/prisma-user-repository';
import { AdminCreateUserDto } from '../dto/admin-create-user.dto';
import { Role } from 'src/generated/prisma/client/client';
import * as bcrypt from 'bcrypt';

export async function createUserByAdmin(
  dto: AdminCreateUserDto,
  userRepository: PrismaUserRepository,
) {
  const usernameExists = await userRepository.findByUsername(dto.username);
  if (usernameExists) throw new ConflictException('Username já existe');

  const hashedPassword = await bcrypt.hash(dto.password, 12);
  const { hashedPassword: _, ...user } = await userRepository.create({
    username: dto.username,
    hashedPassword,
    role: dto.role ?? Role.USER,
  });
  return user;
}
