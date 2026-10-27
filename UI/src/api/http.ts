/** Shared helper so API modules can show the server "message" field. */
export async function readErrorMessage(response: Response): Promise<string> {
  try {
    const text = await response.text();
    if (!text) {
      return `Request failed (${response.status})`;
    }
    try {
      const json = JSON.parse(text) as { message?: string };
      if (json.message) {
        return json.message;
      }
    } catch {
      // not JSON — use raw text
    }
    return text;
  } catch {
    return `Request failed (${response.status})`;
  }
}
