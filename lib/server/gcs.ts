import * as fs from "node:fs";
import * as path from "node:path";

import { Storage } from "@google-cloud/storage";
import { gcsConfig } from "@/lib/server/config";
import { createLogger } from "@/lib/server/utils/logger";
import { isRetryableError, retryWithBackoff } from "@/lib/server/utils/retry";

const logger = createLogger("GCS");

// GCS configuration from environment
const GCS_PROJECT_ID = process.env.GCS_PROJECT_ID || "";
const GCS_BUCKET = process.env.GCS_BUCKET || "";
const GCS_KEY_FILE =
	process.env.GCS_KEY_FILE || process.env.GOOGLE_APPLICATION_CREDENTIALS || "";
const GCS_PUBLIC_BASE_URL = process.env.GCS_PUBLIC_BASE_URL || "";

// Lazy initialization of GCS client
let gcsClient: Storage | null = null;

function getClient(): Storage | null {
	if (!GCS_BUCKET) {
		logger.warn("GCS_BUCKET not configured");
		return null;
	}

	if (gcsClient) {
		return gcsClient;
	}

	if (GCS_KEY_FILE) {
		const fullPath = path.resolve(GCS_KEY_FILE);
		if (!fs.existsSync(fullPath)) {
			logger.warn("GCS key file not found - uploads disabled", {
				path: fullPath,
			});
			return null;
		}
	}

	try {
		gcsClient = new Storage({
			projectId: GCS_PROJECT_ID || undefined,
			keyFilename: GCS_KEY_FILE ? path.resolve(GCS_KEY_FILE) : undefined,
		});
		logger.info("GCS client initialized successfully");
		return gcsClient;
	} catch (error) {
		logger.error("Failed to initialize GCS client", error);
		return null;
	}
}

export interface UploadedFile {
	objectName: string;
	url: string;
}

function buildObjectUrl(objectName: string): string {
	if (GCS_PUBLIC_BASE_URL) {
		const base = GCS_PUBLIC_BASE_URL.replace(/\/+$/, "");
		return `${base}/${objectName}`;
	}
	return `gs://${GCS_BUCKET}/${objectName}`;
}

/**
 * Check if GCS is configured and available
 */
export function isGcsAvailable(): boolean {
	return getClient() !== null;
}

/**
 * Upload a single file to GCS
 */
export async function uploadFile(
	buffer: Buffer,
	fileName: string,
	mimeType: string,
	subDirectory: string,
): Promise<UploadedFile> {
	const client = getClient();
	if (!client) {
		throw new Error("GCS client not configured");
	}

	const timestamp = Date.now();
	const objectName = `${subDirectory}/${timestamp}_${fileName}`;

	const file = client.bucket(GCS_BUCKET).file(objectName);

	await retryWithBackoff(
		() =>
			file.save(buffer, {
				resumable: false,
				metadata: { contentType: mimeType },
			}),
		{
			maxRetries: gcsConfig.retryAttempts,
			baseDelay: 1000,
			isRetryable: isRetryableError,
			operationName: `Upload file: ${fileName}`,
		},
	);

	logger.info("File uploaded successfully", {
		objectName,
		size: buffer.length,
	});

	const url = buildObjectUrl(objectName);
	return { objectName, url };
}

/**
 * Upload a file with a specific full path (object name)
 */
export async function uploadFileWithFullPath(
	buffer: Buffer,
	objectName: string,
	mimeType: string,
): Promise<UploadedFile> {
	const client = getClient();
	if (!client) {
		throw new Error("GCS client not configured");
	}

	const file = client.bucket(GCS_BUCKET).file(objectName);

	await retryWithBackoff(
		() =>
			file.save(buffer, {
				resumable: false,
				metadata: { contentType: mimeType },
			}),
		{
			maxRetries: gcsConfig.retryAttempts,
			baseDelay: 1000,
			isRetryable: isRetryableError,
			operationName: `Upload file with path: ${objectName}`,
		},
	);

	logger.info("File uploaded with full path", {
		objectName,
		size: buffer.length,
	});

	const url = buildObjectUrl(objectName);
	return { objectName, url };
}

/**
 * Upload multiple files to GCS (in parallel)
 */
export async function uploadMultipleFiles(
	files: Array<{ buffer: Buffer; originalname: string; mimetype: string }>,
	subDirectory: string,
): Promise<UploadedFile[]> {
	return Promise.all(
		files.map((file) =>
			uploadFile(file.buffer, file.originalname, file.mimetype, subDirectory),
		),
	);
}

/**
 * Get a readable stream for a file from GCS
 */
export async function getFileStream(
	objectName: string,
): Promise<NodeJS.ReadableStream> {
	const client = getClient();
	if (!client) {
		throw new Error("GCS client not configured");
	}

	return client.bucket(GCS_BUCKET).file(objectName).createReadStream();
}
