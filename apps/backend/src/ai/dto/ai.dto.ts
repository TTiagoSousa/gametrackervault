import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

const MODEL_ID = /^[a-z0-9][a-z0-9.\-_@]*$/i;

/** Guardar a chave e/ou o modelo. Sem chave, muda só o modelo da que já lá está. */
export class SaveAiSettingsDto {
  @IsOptional()
  @IsString()
  @MinLength(20, { message: 'A chave da API parece incompleta.' })
  @MaxLength(400)
  apiKey?: string;

  @IsString()
  @MaxLength(100)
  @Matches(MODEL_ID, { message: 'Nome de modelo inválido.' })
  model: string;
}

/** Listar os modelos com uma chave ainda não guardada (ou com a guardada). */
export class ListModelsDto {
  @IsOptional()
  @IsString()
  @MinLength(20, { message: 'A chave da API parece incompleta.' })
  @MaxLength(400)
  apiKey?: string;
}

export class ChatMessageDto {
  @IsIn(['user', 'assistant'])
  role: 'user' | 'assistant';

  @IsString()
  @MinLength(1)
  @MaxLength(12_000)
  content: string;
}

export class ChatDto {
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  @ArrayMinSize(1)
  @ArrayMaxSize(60)
  messages: ChatMessageDto[];

  @IsOptional()
  @IsIn(['pt-PT', 'en', 'es'])
  language?: 'pt-PT' | 'en' | 'es';
}
