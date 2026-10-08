/**
 * Papéis dos utilizadores.
 *
 * Os valores têm de bater com o enum Role do schema Prisma — é ele que manda na base
 * de dados; isto é a cópia que o frontend consegue importar.
 */
export const ROLES = ['USER', 'ADMIN'] as const;

export type Role = (typeof ROLES)[number];
