import { IsEnum, IsOptional } from 'class-validator';
import { CreateUserDto } from './create-user.dto';
import { Role } from 'src/generated/prisma/client/client';

export class AdminCreateUserDto extends CreateUserDto {
  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
