import { act } from '@testing-library/react-native';

/**
 * A promise the test answers by hand, so it can look at the screen while the API
 * call is still on its way (e.g. the grey loading rows).
 */
export function deferred<T>() {
  let resolvePromise!: (value: T) => void;
  let rejectPromise!: (error: unknown) => void;
  const promise = new Promise<T>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });
  return {
    promise,
    /** Answers the call, inside act so the screen updates. */
    resolve: (value: T) =>
      act(async () => {
        resolvePromise(value);
      }),
    /** Fails the call, inside act so the screen updates. */
    reject: (error: unknown) =>
      act(async () => {
        rejectPromise(error);
      }),
  };
}
