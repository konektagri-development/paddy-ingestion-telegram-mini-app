/**
 * Retry utility with exponential backoff
 * Provides resilient error handling for external service calls
 */

import { logger } from "@/lib/server/utils/logger";

export interface RetryOptions {
	/** Maximum number of retry attempts */
	maxRetries: number;
	/** Base delay in milliseconds (will be multiplied by 2^attempt) */
	baseDelay: number;
	/** Maximum delay in milliseconds */
	maxDelay?: number;
	/** Function to determine if error is retryable */
	isRetryable?: (error: unknown) => boolean;
	/** Optional name for logging */
	operationName?: string;
}

/**
 * Default retry options
 */
const DEFAULT_OPTIONS: Required<Omit<RetryOptions, "operationName">> = {
	maxRetries: 3,
	baseDelay: 1000,
	maxDelay: 30000,
	isRetryable: () => true,
};

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate delay with exponential backoff
 */
function calculateDelay(
	attempt: number,
	baseDelay: number,
	maxDelay: number,
): number {
	const delay = baseDelay * 2 ** attempt;
	return Math.min(delay, maxDelay);
}

/**
 * Retry an async operation with exponential backoff
 *
 * @example
 * const result = await retryWithBackoff(
 *   () => fetchDataFromAPI(),
 *   { maxRetries: 3, baseDelay: 1000, operationName: 'API fetch' }
 * );
 */
export async function retryWithBackoff<T>(
	fn: () => Promise<T>,
	options: Partial<RetryOptions> = {},
): Promise<T> {
	const opts = { ...DEFAULT_OPTIONS, ...options };
	let lastError: unknown;

	for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
		try {
			const result = await fn();
			if (attempt > 0) {
				logger.info(
					`${opts.operationName || "Operation"} succeeded after ${attempt} retries`,
				);
			}
			return result;
		} catch (error) {
			lastError = error;

			// Check if error is retryable
			if (!opts.isRetryable(error)) {
				logger.warn(
					`${opts.operationName || "Operation"} failed with non-retryable error`,
					{ attempt },
				);
				throw error;
			}

			// Don't retry if we've exhausted attempts
			if (attempt >= opts.maxRetries) {
				logger.error(
					`${opts.operationName || "Operation"} failed after ${opts.maxRetries} retries`,
					error,
					{ attempt },
				);
				break;
			}

			// Calculate delay and wait
			const delay = calculateDelay(attempt, opts.baseDelay, opts.maxDelay);
			logger.warn(
				`${opts.operationName || "Operation"} failed, retrying in ${delay}ms`,
				{ attempt: attempt + 1, maxRetries: opts.maxRetries },
			);
			await sleep(delay);
		}
	}

	throw lastError;
}

/**
 * Check if error is a network error (typically retryable)
 */
export function isNetworkError(error: unknown): boolean {
	if (error instanceof Error) {
		const message = error.message.toLowerCase();
		return (
			message.includes("network") ||
			message.includes("timeout") ||
			message.includes("econnrefused") ||
			message.includes("enotfound") ||
			message.includes("fetch failed")
		);
	}
	return false;
}

/**
 * Check if error is a rate limit error (retryable with backoff)
 */
export function isRateLimitError(error: unknown): boolean {
	if (error instanceof Error) {
		const message = error.message.toLowerCase();
		return (
			message.includes("rate limit") ||
			message.includes("too many requests") ||
			message.includes("quota exceeded")
		);
	}
	return false;
}

/**
 * Check if error is retryable (network or rate limit)
 */
export function isRetryableError(error: unknown): boolean {
	return isNetworkError(error) || isRateLimitError(error);
}
