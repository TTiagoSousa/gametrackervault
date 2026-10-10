import { ForbiddenException } from '@nestjs/common';
import { PrismaUserRepository } from 'src/user/repositories/prisma/prisma-user-repository';
import { CreateUserDto } from 'src/user/dto/create-user.dto';
import { createUser } from 'src/user/helpers/createUser';

/**
 * Public registration only exists to create the first user, who becomes ADMIN — that is
 * how the installer sets up the account. From then on accounts are created in the
 * Admin panel (POST /user). If it stayed open, anyone reaching the app from the
 * internet could create an account.
 */
export async function registerFirstUser(
  dto: CreateUserDto,
  userRepository: PrismaUserRepository,
) {
  if ((await userRepository.count()) > 0) {
    throw new ForbiddenException(
      'O registo está fechado. Pede a um administrador para te criar a conta.',
    );
  }
  return createUser(dto, userRepository);
}
