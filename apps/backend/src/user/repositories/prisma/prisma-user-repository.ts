import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { PublicUser, UserRepository } from '../user-repository';
import { Role, User } from 'src/generated/prisma/client/client';

// Everything except the password hash
const PUBLIC_FIELDS = {
  id: true,
  username: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} as const;

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

  async findById(id: string): Promise<PublicUser | null> {
    return this.prisma.user.findUnique({
      where: { id },
      select: PUBLIC_FIELDS,
    });
  }

  async findByIdWithPassword(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async update(
    id: string,
    data: { username?: string; hashedPassword?: string; role?: Role },
  ): Promise<PublicUser> {
    return this.prisma.user.update({
      where: { id },
      data,
      select: PUBLIC_FIELDS,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.delete({ where: { id } });
  }

  async findAll(): Promise<PublicUser[]> {
    return this.prisma.user.findMany({
      select: PUBLIC_FIELDS,
      orderBy: { createdAt: 'asc' },
    });
  }

  async count(): Promise<number> {
    return this.prisma.user.count();
  }

  async countAdmins(): Promise<number> {
    return this.prisma.user.count({ where: { role: Role.ADMIN } });
  }
}
