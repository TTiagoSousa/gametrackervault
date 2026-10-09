const TOKEN_URL = 'https://id.twitch.tv/oauth2/token';

export interface TwitchToken {
  value: string;
  expiresAt: number;
}

/**
 * Pede um token de aplicação à Twitch (client credentials) — é o que o IGDB
 * aceita. Devolve null quando a Twitch rejeita as credenciais; um erro de rede
 * propaga-se como exceção.
 */
export async function requestTwitchToken(
  clientId: string,
  clientSecret: string,
): Promise<TwitchToken | null> {
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'client_credentials',
  });
  const response = await fetch(`${TOKEN_URL}?${params.toString()}`, {
    method: 'POST',
  });
  if ([400, 401, 403].includes(response.status)) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`Twitch respondeu ${response.status}`);
  }
  const data = (await response.json()) as {
    access_token: string;
    expires_in: number;
  };
  return {
    value: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
}
