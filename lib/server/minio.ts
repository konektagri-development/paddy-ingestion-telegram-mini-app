import * as Minio from "minio";
import { minioConfig } from "@/lib/server/config";
import { createLogger } from "@/lib/server/utils/logger";
import { isRetryableError, retryWithBackoff } from "@/lib/server/utils/retry";

const logger = createLogger("MinIO");

// MinIO configuration from environment
const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT || "localhost";
const MINIO_PORT = Number.parseInt(process.env.MINIO_PORT || "9000", 10);
const MINIO_USE_SSL = process.env.MINIO_USE_SSL === "true";
const MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY || "";
const MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY || "";
const MINIO_BUCKET = process.env.MINIO_BUCKET || "agrikredit";

// Lazy initialization of MinIO client
let minioClient: Minio.Client | null = null;

function getClient(): Minio.Client | null {
	if (!MINIO_ACCESS_KEY || !MINIO_SECRET_KEY) {
		logger.warn("MinIO credentials not configured");
		return null;
	}

	if (!minioClient) {
		minioClient = new Minio.Client({
			endPoint: MINIO_ENDPOINT,
			port: MINIO_PORT,
			useSSL: MINIO_USE_SSL,
			accessKey: MINIO_ACCESS_KEY,
			secretKey: MINIO_SECRET_KEY,
		});
	}

	return minioClient;
}

export interface UploadedFile {
	objectName: string;
	url: string;
}

/**
 * Check if MinIO is configured and available
 */
export function isMinioAvailable(): boolean {
	return !!(MINIO_ACCESS_KEY && MINIO_SECRET_KEY);
}

/**
 * Upload a single file to MinIO
 */
export async function uploadFile(
	buffer: Buffer,
	fileName: string,
	mimeType: string,
	subDirectory: string,
): Promise<UploadedFile> {
	const client = getClient();
	if (!client) {
		throw new Error("MinIO client not configured");
	}

	const timestamp = Date.now();
	const objectName = `${subDirectory}/${timestamp}_${fileName}`;

	// Upload with retry logic
	await retryWithBackoff(
		() =>
			client.putObject(MINIO_BUCKET, objectName, buffer, buffer.length, {
				"Content-Type": mimeType,
			}),
		{
			maxRetries: minioConfig.retryAttempts,
			baseDelay: 1000,
			isRetryable: isRetryableError,
			operationName: `Upload file: ${fileName}`,
		},
	);

	logger.info("File uploaded successfully", {
		objectName,
		size: buffer.length,
	});

	// Return relative URL path (bucket/path)
	const url = `/${MINIO_BUCKET}/${objectName}`;

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
		throw new Error("MinIO client not configured");
	}

	// Upload with retry logic
	await retryWithBackoff(
		() =>
			client.putObject(MINIO_BUCKET, objectName, buffer, buffer.length, {
				"Content-Type": mimeType,
			}),
		{
			maxRetries: minioConfig.retryAttempts,
			baseDelay: 1000,
			isRetryable: isRetryableError,
			operationName: `Upload file with path: ${objectName}`,
		},
	);

	logger.info("File uploaded with full path", {
		objectName,
		size: buffer.length,
	});

	const url = `/${MINIO_BUCKET}/${objectName}`;
	return { objectName, url };
}

/**
 * Upload multiple files to MinIO (in parallel)
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
 * Get a readable stream for a file from MinIO
 */
export async function getFileStream(
	objectName: string,
): Promise<NodeJS.ReadableStream> {
	const client = getClient();
	if (!client) {
		throw new Error("MinIO client not configured");
	}

	return await client.getObject(MINIO_BUCKET, objectName);
}
