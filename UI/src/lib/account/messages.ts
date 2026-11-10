import { TOO_MANY_LOGIN_ATTEMPTS_MESSAGE } from '../../api/auth';

/** Texts from the design spec, section 7. */
export const WRONG_LOGIN_MESSAGE = 'Fel e-post eller lösenord';
export const LOCKED_OUT_MESSAGE = 'För många försök. Vänta en stund och försök igen.';
export const PASSWORDS_DIFFER_MESSAGE = 'Lösenorden matchar inte';
export const NO_CONNECTION_MESSAGE = 'Kunde inte nå servern. Försök igen.';

/**
 * The API answers in English. These are the fixed texts AuthService sends,
 * so the screens can show Swedish instead. Anything else is shown as it is
 * (readErrorMessage already turns a generic 403 into Swedish).
 */
const SERVER_TEXT: Record<string, string> = {
  'Invalid email or password': WRONG_LOGIN_MESSAGE,
  'Email and password are required': WRONG_LOGIN_MESSAGE,
  'Current password is wrong': 'Nuvarande lösenord är fel',
  'Current password is required': 'Fyll i nuvarande lösenord',
  'New password must be at least 8 characters': 'Det nya lösenordet måste ha minst 8 tecken',
};

/** Turns an error from login or change-password into the Swedish text to show. */
export function accountErrorMessage(err: unknown): string {
  // fetch throws a TypeError when the phone cannot reach the API at all.
  if (err instanceof TypeError) {
    return NO_CONNECTION_MESSAGE;
  }
  if (!(err instanceof Error)) {
    return NO_CONNECTION_MESSAGE;
  }
  // api/auth.ts has its own 429 text; the spec asks for this one.
  if (err.message === TOO_MANY_LOGIN_ATTEMPTS_MESSAGE) {
    return LOCKED_OUT_MESSAGE;
  }
  return SERVER_TEXT[err.message] ?? err.message;
}
