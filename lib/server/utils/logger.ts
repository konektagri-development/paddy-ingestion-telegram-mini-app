/**
 * Structured logging utility for server-side operations
 * Provides consistent log formatting with context and timestamps
 */

type LogLevel = "info" | "warn" | "error" | "debug";

interface LogContext {
	[key: string]: unknown;
}

/**
 * Format log message with timestamp and context
 */
function formatLog(
	level: LogLevel,
	message: string,
	context?: LogContext,
): string {
	const timestamp = new Date().toISOString();
	const contextStr = context ? ` ${JSON.stringify(context)}` : "";
	return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
}

/**
 * Log info message
 */
export function logInfo(message: string, context?: LogContext): void {
	console.log(formatLog("info", message, context));
}

/**
 * Log warning message
 */
export function logWarn(message: string, context?: LogContext): void {
	console.warn(formatLog("warn", message, context));
}

/**
 * Log error message with error details
 */
export function logError(
	message: string,
	error: Error | unknown,
	context?: LogContext,
): void {
	const errorDetails =
		error instanceof Error
			? {
					name: error.name,
					message: error.message,
					stack: error.stack,
				}
			: { error: String(error) };

	console.error(
		formatLog("error", message, {
			...context,
			error: errorDetails,
		}),
	);
}

/**
 * Log debug message (only in development)
 */
export function logDebug(message: string, context?: LogContext): void {
	if (process.env.NODE_ENV === "development") {
		console.debug(formatLog("debug", message, context));
	}
}

/**
 * Create a scoped logger with a prefix
 */
export function createLogger(scope: string) {
	return {
		info: (message: string, context?: LogContext) =>
			logInfo(`[${scope}] ${message}`, context),
		warn: (message: string, context?: LogContext) =>
			logWarn(`[${scope}] ${message}`, context),
		error: (message: string, error: Error | unknown, context?: LogContext) =>
			logError(`[${scope}] ${message}`, error, context),
		debug: (message: string, context?: LogContext) =>
			logDebug(`[${scope}] ${message}`, context),
	};
}

/**
 * Default logger instance
 */
export const logger = {
	info: logInfo,
	warn: logWarn,
	error: logError,
	debug: logDebug,
	createLogger,
};
