import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const SORTS = [
  'relevance',
  'popular',
  'rating',
  'newest',
  'oldest',
  'name',
] as const;
export type Sort = (typeof SORTS)[number];

export const MAX_PAGE_SIZE = 50;

// "6,48,130" no URL → [6, 48, 130]. Valores que não são inteiros caem fora e o
// @IsInt dá o erro.
const toIntArray = ({ value }: { value: unknown }): unknown => {
  if (value === undefined || value === '') return undefined;
  const raw = Array.isArray(value)
    ? value.join(',')
    : typeof value === 'string' || typeof value === 'number'
      ? String(value)
      : '';
  return raw
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map(Number);
};

export class SearchGamesDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @IsOptional()
  @Transform(toIntArray)
  @IsArray()
  @IsInt({ each: true })
  platforms?: number[];

  @IsOptional()
  @Transform(toIntArray)
  @IsArray()
  @IsInt({ each: true })
  genres?: number[];

  @IsOptional()
  @Transform(toIntArray)
  @IsArray()
  @IsInt({ each: true })
  themes?: number[];

  @IsOptional()
  @Transform(toIntArray)
  @IsArray()
  @IsInt({ each: true })
  modes?: number[];

  @IsOptional()
  @Transform(toIntArray)
  @IsArray()
  @IsInt({ each: true })
  perspectives?: number[];

  @IsOptional()
  @Transform(toIntArray)
  @IsArray()
  @IsInt({ each: true })
  types?: number[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1950)
  @Max(2100)
  yearFrom?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1950)
  @Max(2100)
  yearTo?: number;

  // Nota mínima de 0 a 100 (total_rating do IGDB: críticos + utilizadores)
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  minRating?: number;

  @IsOptional()
  @IsIn(SORTS)
  sort?: Sort;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  pageSize?: number;
}
