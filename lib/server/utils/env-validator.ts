/**
 * Environment variable validation utility
 * Ensures required environment variables are set at runtime
 */

import { logger } from "@/lib/server/utils/logger";

/**
 * Get required environment variable
 * Throws error if not set
 */
export function getRequiredEnv(key: string): string {
	const value = process.env[key];
	if (!value) {
		throw new Error(`Required environment variable ${key} is not set`);
	}
	return value;
}

/**
 * Get optional environment variable with default value
 */
export function getOptionalEnv(key: string, defaultValue: string): string {
	return process.env[key] || defaultValue;
}

/**
 * Get optional environment variable as number
 */
export function getOptionalEnvNumber(
	key: string,
	defaultValue: number,
): number {
	const value = process.env[key];
	if (!value) return defaultValue;

	const parsed = Number.parseInt(value, 10);
	if (Number.isNaN(parsed)) {
		logger.warn(`Invalid number for ${key}, using default: ${defaultValue}`);
		return defaultValue;
	}

	return parsed;
}

/**
 * Get optional environment variable as boolean
 */
export function getOptionalEnvBoolean(
	key: string,
	defaultValue: boolean,
): boolean {
	const value = process.env[key];
	if (!value) return defaultValue;

	return value.toLowerCase() === "true";
}

/**
 * Validate all required environment variables
 * Call this on application startup
 */
export function validateEnv(): void {
	const errors: string[] = [];

	// Database URLs (at least one should be configured)
	const hasPaddyDb = !!process.env.POSTGRES_PADDY_DATABASE_URL;
	const hasGeometryDb = !!process.env.POSTGRES_GEOMETRY_DATABASE_URL;

	if (!hasPaddyDb) {
		errors.push("POSTGRES_PADDY_DATABASE_URL is not configured");
	}

	if (!hasGeometryDb) {
		errors.push("POSTGRES_GEOMETRY_DATABASE_URL is not configured");
	}

	// Telegram Bot Token (required for production)
	if (
		process.env.NODE_ENV === "production" &&
		!process.env.TELEGRAM_BOT_TOKEN
	) {
		errors.push("TELEGRAM_BOT_TOKEN is required in production");
	}

	// Google Drive (optional but warn if partially configured)
	const hasGoogleDriveFolder = !!process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
	const hasGoogleServiceAccount = !!process.env.GOOGLE_SERVICE_ACCOUNT_PATH;

	if (hasGoogleDriveFolder !== hasGoogleServiceAccount) {
		logger.warn(
			"Google Drive is partially configured. Both GOOGLE_DRIVE_ROOT_FOLDER_ID and GOOGLE_SERVICE_ACCOUNT_PATH should be set.",
		);
	}

	// MinIO (optional but warn if partially configured)
	const hasMinioEndpoint = !!process.env.MINIO_ENDPOINT;
	const hasMinioCredentials =
		!!process.env.MINIO_ACCESS_KEY && !!process.env.MINIO_SECRET_KEY;

	if (hasMinioEndpoint !== hasMinioCredentials) {
		logger.warn(
			"MinIO is partially configured. MINIO_ENDPOINT, MINIO_ACCESS_KEY, and MINIO_SECRET_KEY should all be set.",
		);
	}

	// Cron secret (required for production)
	if (process.env.NODE_ENV === "production" && !process.env.CRON_SECRET) {
		errors.push("CRON_SECRET is required in production");
	}

	// Log warnings for optional services
	if (!hasGoogleDriveFolder || !hasGoogleServiceAccount) {
		logger.warn("Google Drive integration is not configured");
	}

	if (!hasMinioEndpoint || !hasMinioCredentials) {
		logger.warn("MinIO storage is not configured");
	}

	// Throw if critical errors
	if (errors.length > 0) {
		throw new Error(
			`Environment validation failed:\n${errors.map((e) => `  - ${e}`).join("\n")}`,
		);
	}

	logger.info("Environment validation passed");
}

/**
 * Get service availability status
 */
export function getServiceStatus() {
	return {
		database: {
			paddy: !!process.env.POSTGRES_PADDY_DATABASE_URL,
			geometry: !!process.env.POSTGRES_GEOMETRY_DATABASE_URL,
		},
		googleDrive:
			!!process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID &&
			!!process.env.GOOGLE_SERVICE_ACCOUNT_PATH,
		minio: !!process.env.MINIO_ACCESS_KEY && !!process.env.MINIO_SECRET_KEY,
		telegram: !!process.env.TELEGRAM_BOT_TOKEN,
	};
}
