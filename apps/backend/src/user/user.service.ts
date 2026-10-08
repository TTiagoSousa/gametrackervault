import { Injectable } from '@nestjs/common';
import { PrismaUserRepository } from './repositories/prisma/prisma-user-repository';
import { findAllUsers } from './helpers/findAllUsers';
import { findCurrentUser } from './helpers/findCurrentUser';
import { createUserByAdmin } from './helpers/createUserByAdmin';
import { AdminCreateUserDto } from './dto/admin-create-user.dto';

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
}
