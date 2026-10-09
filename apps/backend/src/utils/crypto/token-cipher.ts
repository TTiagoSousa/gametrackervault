import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

function getKey(): Buffer {
  const key = process.env.TOKEN_ENCRYPTION_KEY;
  if (!key) throw new Error('TOKEN_ENCRYPTION_KEY não está definida');

  const buffer = Buffer.from(key, 'base64');
  if (buffer.length !== 32) {
    throw new Error(
      'TOKEN_ENCRYPTION_KEY tem de ser uma chave base64 de 32 bytes (256 bits)',
    );
  }

  return buffer;
}

export function encryptToken(plainText: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);

  const encrypted = Buffer.concat([
    cipher.update(plainText, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [iv, authTag, encrypted]
    .map((part) => part.toString('base64'))
    .join('.');
}

export function decryptToken(cipherText: string): string {
  const [ivPart, authTagPart, encryptedPart] = cipherText.split('.');
  if (!ivPart || !authTagPart || !encryptedPart) {
    throw new Error('Formato de token cifrado inválido');
  }

  const decipher = createDecipheriv(
    ALGORITHM,
    getKey(),
    Buffer.from(ivPart, 'base64'),
  );
  decipher.setAuthTag(Buffer.from(authTagPart, 'base64'));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedPart, 'base64')),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}
