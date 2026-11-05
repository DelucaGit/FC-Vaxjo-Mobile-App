/** Shared maps for the Jest mocks of SecureStore and AsyncStorage. */
export const secureMemory = new Map<string, string>();
export const asyncMemory = new Map<string, string>();

export function resetMemoryStores(): void {
  secureMemory.clear();
  asyncMemory.clear();
}
