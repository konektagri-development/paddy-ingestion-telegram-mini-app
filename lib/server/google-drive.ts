import * as fs from "node:fs";
import * as path from "node:path";
import { PassThrough } from "node:stream";

import { type drive_v3, google } from "googleapis";
import { driveConfig } from "@/lib/server/config";
import { TTLCache } from "@/lib/server/utils/cache";
import { createLogger } from "@/lib/server/utils/logger";
import { isRetryableError, retryWithBackoff } from "@/lib/server/utils/retry";

const logger = createLogger("GoogleDrive");

// Google Drive configuration from environment
const PARENT_FOLDER_ID = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || "";
const SERVICE_ACCOUNT_PATH =
	process.env.GOOGLE_SERVICE_ACCOUNT_PATH || "secrets/service_account.json";
const IMPERSONATED_EMAIL = process.env.GOOGLE_IMPERSONATED_EMAIL || "";

// Lazy initialization of Google Drive client
let driveClient: drive_v3.Drive | null = null;
// Folder cache with TTL for performance
const folderCache = new TTLCache<string, string>(
	driveConfig.folderCacheSize,
	driveConfig.folderCacheTTL,
);

export interface DriveUploadResult {
	success: boolean;
	fileId?: string;
	webLink?: string;
	error?: string;
}

/**
 * Initialize the Drive client if not already done
 */
function getClient(): drive_v3.Drive | null {
	if (driveClient) {
		return driveClient;
	}

	if (!PARENT_FOLDER_ID) {
		logger.warn(
			"GOOGLE_DRIVE_ROOT_FOLDER_ID not configured - Drive uploads disabled",
		);
		return null;
	}

	const fullPath = path.resolve(SERVICE_ACCOUNT_PATH);
	if (!fs.existsSync(fullPath)) {
		logger.warn("Service account file not found - Drive uploads disabled", {
			path: fullPath,
		});
		return null;
	}

	try {
		const auth = new google.auth.GoogleAuth({
			keyFile: fullPath,
			scopes: ["https://www.googleapis.com/auth/drive"],
			clientOptions: IMPERSONATED_EMAIL
				? { subject: IMPERSONATED_EMAIL }
				: undefined,
		});

		driveClient = google.drive({ version: "v3", auth });
		logger.info("Google Drive service initialized successfully");
		return driveClient;
	} catch (error) {
		logger.error("Failed to initialize Google Drive service", error);
		return null;
	}
}

/**
 * Check if Drive service is available
 */
export function isGoogleDriveAvailable(): boolean {
	return getClient() !== null;
}

/**
 * Get or create a folder inside a parent folder
 */
async function getOrCreateFolder(
	folderName: string,
	parentId: string,
): Promise<string> {
	const client = getClient();
	if (!client) {
		throw new Error("Drive service not initialized");
	}

	const cacheKey = `${parentId}/${folderName}`;

	// Check cache first
	const cached = folderCache.get(cacheKey);
	if (cached) {
		logger.debug("Folder found in cache", { folderName, folderId: cached });
		return cached;
	}

	// Search for existing folder with retry
	const query = `name='${folderName}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;

	const response = await retryWithBackoff(
		() =>
			client.files.list({
				q: query,
				spaces: "drive",
				fields: "files(id, name)",
				supportsAllDrives: true,
				includeItemsFromAllDrives: true,
			}),
		{
			maxRetries: driveConfig.retryAttempts,
			baseDelay: 1000,
			isRetryable: isRetryableError,
			operationName: `Search folder: ${folderName}`,
		},
	);

	const folders = response.data.files || [];
	const existingFolder = folders[0];

	if (existingFolder?.id) {
		folderCache.set(cacheKey, existingFolder.id);
		logger.debug("Found existing folder", {
			folderName,
			folderId: existingFolder.id,
		});
		return existingFolder.id;
	}

	// Create new folder with retry
	const folder = await retryWithBackoff(
		() =>
			client.files.create({
				requestBody: {
					name: folderName,
					mimeType: "application/vnd.google-apps.folder",
					parents: [parentId],
				},
				fields: "id",
				supportsAllDrives: true,
			}),
		{
			maxRetries: driveConfig.retryAttempts,
			baseDelay: 1000,
			isRetryable: isRetryableError,
			operationName: `Create folder: ${folderName}`,
		},
	);

	const folderId = folder.data.id;
	if (!folderId) {
		throw new Error("Failed to create folder - no ID returned");
	}

	folderCache.set(cacheKey, folderId);
	logger.info("Created new folder", { folderName, folderId });
	return folderId;
}

/**
 * Create entire folder path
 * Returns the ID of the final folder
 */
export async function createFolderPath(folderPath: string): Promise<string> {
	const folderParts = folderPath.split("/").filter(Boolean);
	let currentParentId = PARENT_FOLDER_ID;

	for (const folderName of folderParts) {
		currentParentId = await getOrCreateFolder(folderName, currentParentId);
	}

	return currentParentId;
}

/**
 * Get MIME type based on file extension
 */
function getMimeType(filePath: string): string {
	const ext = path.extname(filePath).toLowerCase();
	const mimeTypes: Record<string, string> = {
		".jpg": "image/jpeg",
		".jpeg": "image/jpeg",
		".png": "image/png",
		".gif": "image/gif",
		".webp": "image/webp",
		".xlsx":
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		".xls": "application/vnd.ms-excel",
	};
	return mimeTypes[ext] || "application/octet-stream";
}

/**
 * Upload a file to a specific folder path in Google Drive
 */
export async function uploadFile(
	filePath: string,
	folderPath: string,
): Promise<DriveUploadResult> {
	const client = getClient();
	if (!client) {
		return { success: false, error: "Drive service not initialized" };
	}

	try {
		console.log(`Starting upload: ${filePath} -> ${folderPath}`);

		if (!fs.existsSync(filePath)) {
			return { success: false, error: `File not found: ${filePath}` };
		}

		const folderId = await createFolderPath(folderPath);
		const fileName = path.basename(filePath);
		const mimeType = getMimeType(filePath);

		// Read file into buffer and convert to PassThrough stream for Bun/googleapis compatibility
		const fileBuffer = fs.readFileSync(filePath);
		console.log(
			`[Drive] Read file ${fileName}, size: ${fileBuffer.length} bytes`,
		);

		// Use PassThrough stream as workaround for Bun runtime compatibility
		const passThrough = new PassThrough();
		passThrough.end(fileBuffer);

		const media = {
			mimeType,
			body: passThrough,
		};

		const file = await client.files.create({
			requestBody: {
				name: fileName,
				parents: [folderId],
			},
			media,
			fields: "id, webViewLink",
			supportsAllDrives: true,
		});

		console.log(`Upload successful: ${file.data.id}`);

		return {
			success: true,
			fileId: file.data.id || undefined,
			webLink: file.data.webViewLink || undefined,
		};
	} catch (error) {
		const errorMsg = error instanceof Error ? error.message : "Unknown error";
		console.error(`Drive upload error: ${errorMsg}`);
		return { success: false, error: errorMsg };
	}
}

/**
 * Upload Excel file to a specified folder path, updating if exists
 */
export async function uploadExcel(
	excelFilePath: string,
	folderPath?: string,
): Promise<DriveUploadResult> {
	const client = getClient();
	if (!client) {
		return { success: false, error: "Drive service not initialized" };
	}

	try {
		if (!fs.existsSync(excelFilePath)) {
			return {
				success: false,
				error: `Excel file not found: ${excelFilePath}`,
			};
		}

		// Use provided folder path or default to "Surveys"
		let folderId: string;
		if (folderPath) {
			folderId = await createFolderPath(folderPath);
		} else {
			folderId = await getOrCreateFolder("Surveys", PARENT_FOLDER_ID);
		}

		const filename = path.basename(excelFilePath);

		// Check if file already exists
		const query = `name='${filename}' and '${folderId}' in parents and trashed=false`;
		const response = await client.files.list({
			q: query,
			spaces: "drive",
			fields: "files(id, name)",
			supportsAllDrives: true,
			includeItemsFromAllDrives: true,
		});

		const existingFiles = response.data.files || [];

		// Read file into buffer and convert to PassThrough stream for Bun/googleapis compatibility
		const mimeType =
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

		const fileBuffer = fs.readFileSync(excelFilePath);
		console.log(
			`[Drive] Read Excel ${filename}, size: ${fileBuffer.length} bytes`,
		);

		// Use PassThrough stream as workaround for Bun runtime compatibility
		const passThrough = new PassThrough();
		passThrough.end(fileBuffer);

		const media = {
			mimeType,
			body: passThrough,
		};

		let file: { data: { id?: string | null; webViewLink?: string | null } };

		const existingFile = existingFiles[0];
		if (existingFile?.id) {
			// Update existing file
			file = await client.files.update({
				fileId: existingFile.id,
				media,
				fields: "id, webViewLink",
				supportsAllDrives: true,
			});
			console.log(`Updated Excel file in Google Drive: ${filename}`);
		} else {
			// Create new file
			file = await client.files.create({
				requestBody: {
					name: filename,
					parents: [folderId],
					mimeType,
				},
				media,
				fields: "id, webViewLink",
				supportsAllDrives: true,
			});
			console.log(`Uploaded new Excel file to Google Drive: ${filename}`);
		}

		return {
			success: true,
			fileId: file.data.id || undefined,
			webLink: file.data.webViewLink || undefined,
		};
	} catch (error) {
		const errorMsg = error instanceof Error ? error.message : "Unknown error";
		console.error(`Excel Drive upload error: ${errorMsg}`);
		return { success: false, error: errorMsg };
	}
}

/**
 * Download a file from Google Drive to a local path
 */
export async function downloadFile(
	filename: string,
	folderPath: string,
	localPath: string,
): Promise<{ found: boolean; error?: string }> {
	const client = getClient();
	if (!client) {
		return { found: false, error: "Drive service not initialized" };
	}

	try {
		// Get the folder ID
		const folderId = await createFolderPath(folderPath);

		// Search for the file in the folder
		const query = `name='${filename}' and '${folderId}' in parents and trashed=false`;
		const response = await client.files.list({
			q: query,
			spaces: "drive",
			fields: "files(id, name)",
			supportsAllDrives: true,
			includeItemsFromAllDrives: true,
		});

		const files = response.data.files || [];
		const existingFile = files[0];

		if (!existingFile?.id) {
			return { found: false };
		}

		// Ensure directory exists
		const dir = path.dirname(localPath);
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir, { recursive: true });
		}

		// Download the file
		const dest = fs.createWriteStream(localPath);
		const fileResponse = await client.files.get(
			{
				fileId: existingFile.id,
				alt: "media",
				supportsAllDrives: true,
			},
			{ responseType: "stream" },
		);

		await new Promise<void>((resolve, reject) => {
			(fileResponse.data as NodeJS.ReadableStream)
				.pipe(dest)
				.on("finish", resolve)
				.on("error", reject);
		});

		console.log(`Downloaded file from Drive: ${filename}`);
		return { found: true };
	} catch (error) {
		const errorMsg = error instanceof Error ? error.message : "Unknown error";
		console.error(`Drive download error: ${errorMsg}`);
		return { found: false, error: errorMsg };
	}
}

/**
 * Clear the folder ID cache
 */
export function clearFolderCache(): void {
	folderCache.clear();
	console.log("Folder cache cleared");
}
