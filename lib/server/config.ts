/**
 * Centralized server configuration
 * All configuration values with defaults and validation
 */

import { getOptionalEnvNumber } from "@/lib/server/utils/env-validator";

export const config = {
	/**
	 * Database configuration
	 */
	database: {
		/** Connection pool size for Prisma */
		poolSize: getOptionalEnvNumber("DB_POOL_SIZE", 10),
		/** Query timeout in milliseconds */
		timeout: getOptionalEnvNumber("DB_TIMEOUT_MS", 30000),
	},

	/**
	 * Google Drive configuration
	 */
	googleDrive: {
		/** Maximum retry attempts for Drive operations */
		retryAttempts: getOptionalEnvNumber("GOOGLE_DRIVE_RETRY_ATTEMPTS", 3),
		/** Request timeout in milliseconds */
		timeout: getOptionalEnvNumber("GOOGLE_DRIVE_TIMEOUT_MS", 60000),
		/** Folder cache TTL in milliseconds (5 minutes) */
		folderCacheTTL: getOptionalEnvNumber(
			"GOOGLE_DRIVE_CACHE_TTL_MS",
			5 * 60 * 1000,
		),
		/** Maximum folder cache size */
		folderCacheSize: getOptionalEnvNumber("GOOGLE_DRIVE_CACHE_SIZE", 1000),
	},

	/**
	 * MinIO configuration
	 */
	minio: {
		/** Maximum retry attempts for MinIO operations */
		retryAttempts: getOptionalEnvNumber("MINIO_RETRY_ATTEMPTS", 3),
		/** Request timeout in milliseconds */
		timeout: getOptionalEnvNumber("MINIO_TIMEOUT_MS", 30000),
		/** Maximum file size in bytes (10MB) */
		maxFileSize: getOptionalEnvNumber("MINIO_MAX_FILE_SIZE", 10 * 1024 * 1024),
	},

	/**
	 * Sync configuration
	 */
	sync: {
		/** Batch size for processing multiple records */
		batchSize: getOptionalEnvNumber("SYNC_BATCH_SIZE", 10),
		/** Maximum retry attempts for sync operations */
		maxRetries: getOptionalEnvNumber("SYNC_MAX_RETRIES", 3),
		/** Base delay for retry backoff in milliseconds */
		retryBaseDelay: getOptionalEnvNumber("SYNC_RETRY_BASE_DELAY_MS", 1000),
	},

	/**
	 * Location cache configuration
	 */
	location: {
		/** Cache size for location lookups */
		cacheSize: getOptionalEnvNumber("LOCATION_CACHE_SIZE", 500),
		/** Cache TTL in milliseconds (1 hour) */
		cacheTTL: getOptionalEnvNumber("LOCATION_CACHE_TTL_MS", 60 * 60 * 1000),
	},

	/**
	 * API configuration
	 */
	api: {
		/** Request timeout in milliseconds */
		timeout: getOptionalEnvNumber("API_TIMEOUT_MS", 30000),
		/** Maximum request body size in bytes (50MB for photos) */
		maxBodySize: getOptionalEnvNumber("API_MAX_BODY_SIZE", 50 * 1024 * 1024),
	},
} as const;

/**
 * Export individual config sections for convenience
 */
export const {
	database: dbConfig,
	googleDrive: driveConfig,
	minio: minioConfig,
	location: locationConfig,
	api: apiConfig,
} = config;
