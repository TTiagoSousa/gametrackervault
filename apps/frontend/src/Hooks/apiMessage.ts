import i18n from '../i18n';

type ApiError = { response?: { data?: { message?: string | string[] } }; message?: string };

/**
 * A mensagem de erro de um pedido à API: a que o backend mandou (a primeira, se
 * for uma lista de validação) ou, sem ela, a genérica.
 */
export const apiMessage = (error: unknown): string => {
  const e = error as ApiError;
  const message = e.response?.data?.message;
  return (Array.isArray(message) ? message[0] : message) ?? e.message ?? i18n.t('common:errors.generic');
};
