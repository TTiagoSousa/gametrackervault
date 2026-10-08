import { ForbiddenException } from '@nestjs/common';
import { PrismaUserRepository } from 'src/user/repositories/prisma/prisma-user-repository';
import { CreateUserDto } from 'src/user/dto/create-user.dto';
import { createUser } from 'src/user/helpers/createUser';

/**
 * O registo público só existe para criar o primeiro utilizador, que fica ADMIN — é
 * assim que o instalador deixa a conta pronta. A partir daí as contas criam-se no
 * painel de Admin (POST /user). Aberto, qualquer pessoa que chegasse à app pela
 * internet criava conta.
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
