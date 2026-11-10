/** Shown when the server says the email or phone number belongs to someone else. */
export const DUPLICATE_CONTACT_MESSAGE = 'E-post eller telefon används redan';

/**
 * Server sentences that all mean "this email or phone is taken".
 * A coach gets "Could not create the user" for every duplicate (the server
 * hides whether the person is on another team), so that one is here too.
 */
const DUPLICATE_SENTENCES = [
  'User already exists',
  'Email already in use',
  'Phone number already in use',
  'Could not create the user',
  'Could not save the user',
];

/** Turns a save error from the users API into the text the screen shows. */
export function playerSaveErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (DUPLICATE_SENTENCES.includes(message)) {
    return DUPLICATE_CONTACT_MESSAGE;
  }
  if (message === 'Shirt number already in use') {
    return 'Tröjnumret används redan';
  }
  return message;
}

/**
 * Optional shirt number from a text field.
 * Empty means "no number" (null). Anything that is not a whole number is invalid (undefined).
 */
export function parseShirtNumber(text: string): number | null | undefined {
  const trimmed = text.trim();
  if (trimmed === '') {
    return null;
  }
  return /^\d+$/.test(trimmed) ? Number(trimmed) : undefined;
}
