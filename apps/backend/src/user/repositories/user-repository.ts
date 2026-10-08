import { Role, User } from 'src/generated/prisma/client/client';

export interface UserRepository {
  findByUsername(username: string): Promise<User | null>;
  findById(id: string): Promise<Omit<User, 'hashedPassword'> | null>;
  create(data: {
    username: string;
    hashedPassword: string;
    role: Role;
  }): Promise<User>;
  findAll(): Promise<Omit<User, 'hashedPassword'>[]>;
  count(): Promise<number>;
}
