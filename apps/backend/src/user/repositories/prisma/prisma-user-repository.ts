import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserRepository } from '../user-repository';
import { Role, User } from 'src/generated/prisma/client/client';

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUsername(username: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { username } });
  }

  async create(data: {
    username: string;
    hashedPassword: string;
    role: Role;
  }): Promise<User> {
    return this.prisma.user.create({ data });
  }

  async findById(id: string): Promise<Omit<User, 'hashedPassword'> | null> {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findAll(): Promise<Omit<User, 'hashedPassword'>[]> {
    return this.prisma.user.findMany({
      select: {
        id: true,
        username: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async count(): Promise<number> {
    return this.prisma.user.count();
  }
}
