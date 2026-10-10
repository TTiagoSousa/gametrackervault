import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Role } from 'src/generated/prisma/client/client';
import { UserRepository } from '../repositories/user-repository';
import { AdminUpdateUserDto } from '../dto/update-account.dto';

/**
 * The admin changes an account's username, role or password. Never leaves the
 * installation without an administrator.
 */
export async function updateUserByAdmin(
  id: string,
  dto: AdminUpdateUserDto,
  repository: UserRepository,
) {
  const user = await repository.findById(id);
  if (!user) throw new NotFoundException('Utilizador não encontrado');

  const data: { username?: string; hashedPassword?: string; role?: Role } = {};

  if (dto.username !== undefined && dto.username.trim() !== user.username) {
    const name = dto.username.trim();
    const taken = await repository.findByUsername(name);
    if (taken && taken.id !== id) {
      throw new ConflictException('Esse nome já está a ser usado.');
    }
    data.username = name;
  }

  if (dto.role !== undefined && dto.role !== user.role) {
    if (user.role === Role.ADMIN && (await repository.countAdmins()) <= 1) {
      throw new BadRequestException(
        'Tem de haver pelo menos um administrador.',
      );
    }
    data.role = dto.role;
  }

  if (dto.password) data.hashedPassword = await bcrypt.hash(dto.password, 12);

  if (Object.keys(data).length === 0) return user;
  return repository.update(id, data);
}
