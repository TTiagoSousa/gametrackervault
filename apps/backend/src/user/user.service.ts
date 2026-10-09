import { Injectable } from '@nestjs/common';
import { PrismaUserRepository } from './repositories/prisma/prisma-user-repository';
import { findAllUsers } from './helpers/findAllUsers';
import { findCurrentUser } from './helpers/findCurrentUser';
import { createUserByAdmin } from './helpers/createUserByAdmin';
import { updateOwnUsername } from './helpers/updateOwnUsername';
import { changeOwnPassword } from './helpers/changeOwnPassword';
import { updateUserByAdmin } from './helpers/updateUserByAdmin';
import { deleteUserByAdmin } from './helpers/deleteUserByAdmin';
import { AdminCreateUserDto } from './dto/admin-create-user.dto';
import {
  AdminUpdateUserDto,
  ChangePasswordDto,
} from './dto/update-account.dto';

@Injectable()
export class UserService {
  constructor(private readonly userRepository: PrismaUserRepository) {}

  async findAll() {
    return findAllUsers(this.userRepository);
  }

  async findCurrent(id: string) {
    return findCurrentUser(id, this.userRepository);
  }

  async create(dto: AdminCreateUserDto) {
    return createUserByAdmin(dto, this.userRepository);
  }

  async updateUsername(id: string, username: string) {
    return updateOwnUsername(id, username, this.userRepository);
  }

  async changePassword(id: string, dto: ChangePasswordDto) {
    return changeOwnPassword(
      id,
      dto.currentPassword,
      dto.newPassword,
      this.userRepository,
    );
  }

  async updateByAdmin(id: string, dto: AdminUpdateUserDto) {
    return updateUserByAdmin(id, dto, this.userRepository);
  }

  async deleteByAdmin(id: string, requesterId: string) {
    return deleteUserByAdmin(id, requesterId, this.userRepository);
  }
}
