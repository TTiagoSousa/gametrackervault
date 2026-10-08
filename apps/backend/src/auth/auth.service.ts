import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaUserRepository } from 'src/user/repositories/prisma/prisma-user-repository';
import { CreateUserDto } from 'src/user/dto/create-user.dto';
import { registerFirstUser } from './helpers/registerFirstUser';
import { validateUser } from './helpers/validateUser';
import { loginUser } from './helpers/loginUser';
import { Role } from 'src/generated/prisma/client/client';

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: PrismaUserRepository,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: CreateUserDto) {
    return registerFirstUser(dto, this.userRepository);
  }

  async validateUser(username: string, password: string) {
    return validateUser(username, password, this.userRepository);
  }

  login(user: { id: string; username: string; role: Role }) {
    return loginUser(user, this.jwt);
  }
}
