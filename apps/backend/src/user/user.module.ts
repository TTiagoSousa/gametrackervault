import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { PrismaUserRepository } from './repositories/prisma/prisma-user-repository';

@Module({
  controllers: [UserController],
  providers: [
    UserService,
    {
      provide: PrismaUserRepository,
      useClass: PrismaUserRepository,
    },
  ],
  exports: [PrismaUserRepository],
})
export class UserModule {}
