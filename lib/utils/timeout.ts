// Timeout utilities for async operations

/**
 * Wrap a promise with a timeout
 * @param promise - The promise to wrap
 * @param timeoutMs - Timeout in milliseconds
 * @param operationName - Name of operation for error message
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operationName: string = 'Operation'
): Promise<T> {
  let timeoutId: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${operationName} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId!);
    return result;
  } catch (error) {
    clearTimeout(timeoutId!);
    throw error;
  }
}

/**
 * Wrap multiple promises with a shared timeout
 * @param promises - Array of promises to wrap
 * @param timeoutMs - Timeout in milliseconds
 * @param operationName - Name of operation for error message
 */
export async function withTimeoutAll<T extends readonly unknown[]>(
  promises: readonly [...{ [K in keyof T]: Promise<T[K]> }],
  timeoutMs: number,
  operationName: string = 'Operation'
): Promise<T> {
  return withTimeout(
    Promise.all(promises) as Promise<T>,
    timeoutMs,
    operationName
  );
}

// Default timeout values
export const TIMEOUTS = {
  // Google Sheets operations
  sheets: 15000, // 15 seconds
  // Claude API calls
  claude: 30000, // 30 seconds
  // External API calls (Fear & Greed, funding rate, etc.)
  externalApi: 10000, // 10 seconds
  // Overall request timeout
  request: 45000, // 45 seconds
};
