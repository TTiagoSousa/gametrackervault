import { IsOptional, IsString, Matches } from 'class-validator';

// Os ids e secrets da Twitch são cadeias alfanuméricas minúsculas (~30)
const TWITCH_KEY = /^[a-z0-9]{20,64}$/;

export class SaveIgdbDto {
  @IsString()
  @Matches(TWITCH_KEY, {
    message: 'O Client ID não tem o formato da Twitch',
  })
  clientId: string;

  // Em branco ao editar = manter o secret que já está guardado
  @IsOptional()
  @IsString()
  @Matches(TWITCH_KEY, {
    message: 'O Client Secret não tem o formato da Twitch',
  })
  clientSecret?: string;
}
