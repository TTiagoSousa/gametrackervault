import { Role, User } from 'src/generated/prisma/client/client';

export type PublicUser = Omit<User, 'hashedPassword'>;

export interface UserRepository {
  findByUsername(username: string): Promise<User | null>;
  findById(id: string): Promise<PublicUser | null>;
  findByIdWithPassword(id: string): Promise<User | null>;
  create(data: {
    username: string;
    hashedPassword: string;
    role: Role;
  }): Promise<User>;
  update(
    id: string,
    data: { username?: string; hashedPassword?: string; role?: Role },
  ): Promise<PublicUser>;
  delete(id: string): Promise<void>;
  findAll(): Promise<PublicUser[]>;
  count(): Promise<number>;
  countAdmins(): Promise<number>;
}
