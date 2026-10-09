import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { LibraryStatus } from 'src/generated/prisma/client/client';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

// PUT substitui a entrada inteira: um campo que não venha (ou venha a null)
// fica vazio
export class SaveLibraryEntryDto {
  @IsEnum(LibraryStatus)
  status: LibraryStatus;

  // Horas jogadas, com até duas casas decimais (1.5 = hora e meia)
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100000)
  hoursPlayed?: number | null;

  @IsOptional()
  @IsString()
  @Matches(DATE, { message: 'startedAt tem de ser AAAA-MM-DD' })
  startedAt?: string | null;

  @IsOptional()
  @IsString()
  @Matches(DATE, { message: 'finishedAt tem de ser AAAA-MM-DD' })
  finishedAt?: string | null;

  // Nota pessoal de 1 a 10
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  rating?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}
