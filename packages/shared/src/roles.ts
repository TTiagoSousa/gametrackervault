/**
 * User roles.
 *
 * The values must match the Role enum in the Prisma schema — it rules the
 * database; this is the copy the frontend can import.
 */
export const ROLES = ['USER', 'ADMIN'] as const;

export type Role = (typeof ROLES)[number];
