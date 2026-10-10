import { IsOptional, IsString, Matches } from 'class-validator';

// Twitch ids and secrets are lowercase alphanumeric strings (~30)
const TWITCH_KEY = /^[a-z0-9]{20,64}$/;

export class SaveIgdbDto {
  @IsString()
  @Matches(TWITCH_KEY, {
    message: 'O Client ID não tem o formato da Twitch',
  })
  clientId: string;

  // Blank when editing = keep the already stored secret
  @IsOptional()
  @IsString()
  @Matches(TWITCH_KEY, {
    message: 'O Client Secret não tem o formato da Twitch',
  })
  clientSecret?: string;
}
