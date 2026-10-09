import {
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Role } from 'src/generated/prisma/client/client';

// Letras, números, ponto, hífen e sublinhado — sem espaços
const USERNAME = /^[\p{L}\p{N}._-]+$/u;
const USERNAME_MESSAGE =
  'O nome só pode ter letras, números, ponto, hífen e sublinhado.';

/** O próprio utilizador muda o nome. */
export class UpdateUsernameDto {
  @IsString()
  @MinLength(3, { message: 'O nome tem de ter pelo menos 3 caracteres.' })
  @MaxLength(32, { message: 'O nome tem no máximo 32 caracteres.' })
  @Matches(USERNAME, { message: USERNAME_MESSAGE })
  username: string;
}

/** O próprio utilizador muda a password: tem de dizer a atual. */
export class ChangePasswordDto {
  @IsString()
  currentPassword: string;

  @IsString()
  @MinLength(8, {
    message: 'A password nova tem de ter pelo menos 8 caracteres.',
  })
  @MaxLength(128)
  newPassword: string;
}

/** O admin muda o nome, o papel ou define uma password nova de outra conta. */
export class AdminUpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'O nome tem de ter pelo menos 3 caracteres.' })
  @MaxLength(32, { message: 'O nome tem no máximo 32 caracteres.' })
  @Matches(USERNAME, { message: USERNAME_MESSAGE })
  username?: string;

  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'A password tem de ter pelo menos 8 caracteres.' })
  @MaxLength(128)
  password?: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
