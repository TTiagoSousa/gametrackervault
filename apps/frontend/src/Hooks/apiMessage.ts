import i18n from '../i18n';

type ApiError = { response?: { data?: { message?: string | string[] } }; message?: string };

/**
 * The error message of an API request: the one the backend sent (the first, if
 * it's a validation list) or, failing that, the generic one.
 */
export const apiMessage = (error: unknown): string => {
  const e = error as ApiError;
  const message = e.response?.data?.message;
  return (Array.isArray(message) ? message[0] : message) ?? e.message ?? i18n.t('common:errors.generic');
};
