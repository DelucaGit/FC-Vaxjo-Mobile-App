/** The API modules throw an Error with the server's (or the Swedish 403) message. */
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Något gick fel';
}
