import { createWriteStream, promises as fs } from "node:fs";
import * as path from "node:path";
import { pipeline } from "node:stream/promises";
import * as ExcelJS from "exceljs";
import { getLocationCode } from "@/lib/server/administrative-divisions";
import * as gcs from "@/lib/server/gcs";
import * as googleDrive from "@/lib/server/google-drive";
import { prismaPaddy } from "@/lib/server/prisma-paddy";
import type { CreatePaddyFarmSurveyDto } from "@/lib/server/survey-paddy/schema";
import type { AuthResult } from "@/lib/server/survey-paddy/submission-handler";
import { createLogger } from "@/lib/server/utils/logger";
import { getWeatherAtLocation } from "@/lib/server/weather-service";

const logger = createLogger("SurveyService");

const DRIVE_SYNC_CONCURRENCY = Number.parseInt(
	process.env.DRIVE_SYNC_CONCURRENCY ?? "2",
	10,
);

async function runWithConcurrency<T>(
	items: T[],
	limit: number,
	worker: (item: T) => Promise<void>,
): Promise<void> {
	const concurrency =
		Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 1;
	const executing = new Set<Promise<void>>();

	for (const item of items) {
		const task = (async () => worker(item))();
		executing.add(task);
		const cleanup = () => executing.delete(task);
		task.then(cleanup).catch(cleanup);

		if (executing.size >= concurrency) {
			await Promise.race(executing);
		}
	}

	await Promise.allSettled(executing);
}

/**
 * Phnom Penh timezone identifier
 */
const PHNOM_PENH_TIMEZONE = "Asia/Phnom_Penh";

/**
 * Format a Date object to Phnom Penh local date string (YYYY-MM-DD)
 */
function formatDateToPhnomPenh(date: Date): string {
	return date.toLocaleDateString("en-CA", { timeZone: PHNOM_PENH_TIMEZONE });
}

/**
 * Format a Date object to Phnom Penh local date folder format (YYYYMMDD)
 */
function formatDateFolderPhnomPenh(date: Date): string {
	return formatDateToPhnomPenh(date).replace(/-/g, "");
}

const TEMPLATE_PATH = path.join(
	process.cwd(),
	"templates",
	"recurring-survey-template.xlsx",
);

export interface ProcessResult {
	success: boolean;
	message: string;
	locationCode?: string;
	photosUploaded?: number;
	driveFolderLink?: string;
}

/**
 * Extract object name from GCS or legacy MinIO-style URLs
 */
function extractObjectNameFromUrl(url: string): string | null {
	try {
		const publicBase = (process.env.GCS_PUBLIC_BASE_URL || "").replace(
			/\/+$/,
			"",
		);
		if (publicBase && url.startsWith(publicBase)) {
			return url.slice(publicBase.length).replace(/^\/+/, "") || null;
		}

		if (url.startsWith("gs://")) {
			const withoutScheme = url.replace("gs://", "");
			const parts = withoutScheme.split("/").filter(Boolean);
			if (parts.length > 1) {
				return parts.slice(1).join("/");
			}
			return null;
		}

		if (url.startsWith("https://")) {
			const parsed = new URL(url);
			const pathParts = parsed.pathname.split("/").filter(Boolean);

			if (parsed.hostname === "storage.googleapis.com") {
				if (pathParts.length > 1) {
					return pathParts.slice(1).join("/");
				}
			}

			if (parsed.hostname.endsWith(".storage.googleapis.com")) {
				if (pathParts.length > 0) {
					return pathParts.join("/");
				}
			}
		}

		if (url.startsWith("/")) {
			const parts = url.split("/").filter(Boolean);
			if (parts.length > 1) {
				return parts.slice(1).join("/");
			}
		}
		return null;
	} catch {
		return null;
	}
}

type Coordinate = number | { toString(): string };

type DriveSyncRecord = {
	id: string;
	farmId: string;
	dateOfVisit: Date;
	gpsLatitude: Coordinate;
	gpsLongitude: Coordinate;
	photoUrls: string[] | null;
	provinceName: string | null;
	weatherTemperature: number | null;
	rainfall: string;
	rainfallIntensity: string | null;
	soilRoughness: string;
	growthStage: string;
	waterStatus: string;
	overallHealth: string;
	visibleProblems: string;
	fertilizer: string;
	fertilizerType: string | null;
	herbicide: string;
	pesticide: string;
	stressEvents: string;
	notes: string | null;
	surveyor: {
		locationCode: string;
		firstName?: string | null;
		lastName?: string | null;
	} | null;
};

type ExcelRowGroup = {
	rowData: (string | number)[];
	excelFilename: string;
	excelFolderPath: string;
};

function buildTempPath(objectName: string): string {
	const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
	return path.join("/tmp", `${uniqueSuffix}-${path.basename(objectName)}`);
}

async function uploadPhotosToDrive(params: {
	farmId: string;
	dateFolder: string;
	photoUrls: string[] | null;
	provinceName: string | null;
	contextLabel: string;
}): Promise<string> {
	const { farmId, dateFolder, photoUrls, provinceName, contextLabel } = params;
	let driveFolderLink = "";

	if (
		!googleDrive.isGoogleDriveAvailable() ||
		!photoUrls ||
		photoUrls.length === 0 ||
		!provinceName
	) {
		return driveFolderLink;
	}

	const folderPath = `4_GT photo and log/${provinceName}/${farmId}/${dateFolder}`;

	try {
		const folderId = await googleDrive.createFolderPath(folderPath);
		driveFolderLink = `https://drive.google.com/drive/folders/${folderId}`;

		for (const photoUrl of photoUrls) {
			const objectName = extractObjectNameFromUrl(photoUrl);
			if (!objectName || !gcs.isGcsAvailable()) continue;

			const tempPath = buildTempPath(objectName);

			try {
				const stream = await gcs.getFileStream(objectName);
				await pipeline(stream, createWriteStream(tempPath));

				const result = await googleDrive.uploadFile(tempPath, folderPath);
				if (result.success) {
					logger.debug("Uploaded photo to Drive", {
						objectName,
						context: contextLabel,
					});
				}
			} catch (error) {
				logger.warn("Failed to upload photo", {
					photoUrl,
					context: contextLabel,
					error: error instanceof Error ? error.message : String(error),
				});
			} finally {
				await fs.unlink(tempPath).catch(() => {});
			}
		}
	} catch (error) {
		logger.error("Failed to create Drive folder", error, { farmId });
	}

	return driveFolderLink;
}

function buildExcelRowGroup(
	record: DriveSyncRecord,
	dateFolder: string,
	driveFolderLink: string,
): ExcelRowGroup | null {
	if (!record.provinceName || !record.surveyor) return null;

	const rowData = [
		record.farmId,
		formatDateToPhnomPenh(record.dateOfVisit),
		record.gpsLatitude.toString(),
		record.gpsLongitude.toString(),
		record.weatherTemperature ?? "N/A",
		formatSurveyorName(record.surveyor),
		"N/A", // Phone
		record.rainfall,
		record.rainfallIntensity || "N/A",
		record.soilRoughness,
		record.growthStage,
		record.waterStatus,
		record.overallHealth,
		record.visibleProblems,
		record.fertilizer,
		record.fertilizerType || "N/A",
		record.herbicide,
		record.pesticide,
		record.stressEvents,
		driveFolderLink,
		record.notes || "",
	];

	return {
		rowData,
		excelFilename: `GT-${record.surveyor.locationCode}-${dateFolder}.xlsx`,
		excelFolderPath: `5_GT text-data/RecurringVisit/${record.provinceName} - Data`,
	};
}

/**
 * Format surveyor display name with fallback logic
 * Priority: "firstName lastName" > "N/A"
 */
function formatSurveyorName(surveyor: {
	firstName?: string | null;
	lastName?: string | null;
}): string {
	// Build full name from firstName and lastName
	const parts: string[] = [];
	if (surveyor.firstName) parts.push(surveyor.firstName);
	if (surveyor.lastName) parts.push(surveyor.lastName);

	if (parts.length > 0) {
		return parts.join(" ");
	}

	return "N/A";
}

/**
 * Create a new workbook from template or with headers
 */
async function createWorkbookFromTemplate(): Promise<ExcelJS.Workbook> {
	const workbook = new ExcelJS.Workbook();

	await fs.access(TEMPLATE_PATH);
	await workbook.xlsx.readFile(TEMPLATE_PATH);

	return workbook;
}

/**
 * Sync Excel file with Google Drive
 */
async function syncExcelWithDrive(
	filename: string,
	folderPath: string,
	rowsData: (string | number)[][],
): Promise<void> {
	const tempDir = path.join("/tmp", `survey-${Date.now()}`);
	const tempPath = path.join(tempDir, filename);

	try {
		await fs.mkdir(tempDir, { recursive: true });

		let workbook: ExcelJS.Workbook;

		const downloadResult = await googleDrive.downloadFile(
			filename,
			folderPath,
			tempPath,
		);

		if (downloadResult.found) {
			workbook = new ExcelJS.Workbook();
			await workbook.xlsx.readFile(tempPath);
			logger.debug("Downloaded existing Excel from Drive", { filename });
		} else {
			workbook = await createWorkbookFromTemplate();
			logger.debug("Created new Excel from template", { filename });
		}

		const worksheet = workbook.worksheets[0];
		if (!worksheet) {
			throw new Error("No worksheet found in workbook");
		}

		let lastDataRow = 1;
		for (let i = 2; i <= worksheet.rowCount; i++) {
			const row = worksheet.getRow(i);
			const firstCell = row.getCell(1).value;
			if (firstCell !== null && firstCell !== undefined && firstCell !== "") {
				lastDataRow = i;
			}
		}

		let currentRowNum = lastDataRow + 1;

		// Append all rows in the batch
		for (const rowData of rowsData) {
			const newRow = worksheet.getRow(currentRowNum);
			rowData.forEach((value, index) => {
				const cell = newRow.getCell(index + 1);
				cell.value = value;
				cell.font = { name: "Calibri", size: 11, color: { argb: "FF0000FF" } };
			});
			newRow.commit();
			currentRowNum++;
		}

		await workbook.xlsx.writeFile(tempPath);
		logger.info("Appended rows to Excel", {
			filename,
			rowsAdded: rowsData.length,
			totalRows: currentRowNum - 1,
		});

		const uploadResult = await googleDrive.uploadExcel(tempPath, folderPath);
		if (!uploadResult.success) {
			throw new Error(`Failed to upload to Drive: ${uploadResult.error}`);
		}
	} finally {
		await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
	}
}

export interface SubmissionContext {
	surveyor: {
		id: string;
		surveyorNumber: string;
		locationCode: string;
		providerUsername: string | null;
	};
	locationInfo: {
		locationCode: string;
		provinceName: string | null;
		districtName: string | null;
		communeName: string | null;
	};
	fullFarmId: string;
	safeProvince: string;
	dateFolder: string;
	dateOfVisit: Date;
}

/**
 * Stage 1: Prepare Submission Context (Fast, DB reads only)
 */
export async function prepareSubmissionContext(
	authResult: AuthResult,
	data: CreatePaddyFarmSurveyDto,
): Promise<SubmissionContext> {
	// Get location info from GPS (required - will throw if not found)
	const lat = Number.parseFloat(data.gpsLatitude);
	const lng = Number.parseFloat(data.gpsLongitude);

	if (Number.isNaN(lat) || Number.isNaN(lng)) {
		throw new Error("Invalid GPS coordinates");
	}

	const locationInfo = await getLocationCode(lat, lng);
	const gpsLocationCode = locationInfo.locationCode;

	// Find or create surveyor
	let surveyor: {
		id: string;
		surveyorNumber: string;
		locationCode: string;
		providerUsername: string | null;
	} | null = null;

	if (prismaPaddy) {
		// Try to find existing surveyor for this user
		surveyor = await prismaPaddy.surveyor.findFirst({
			where: {
				providerName: authResult.provider,
				providerUserId: authResult.userId ?? "",
			},
			select: {
				id: true,
				surveyorNumber: true,
				locationCode: true,
				providerUsername: true,
			},
		});

		// Create new surveyor if not found
		if (!surveyor) {
			// Count surveyors in the same location to generate location-specific number
			// e.g., PNH-BKK-TS1-S01, PNH-BKK-TS1-S02, PNH-BKK-TS2-S01...
			const surveyorCount = await prismaPaddy.surveyor.count({
				where: { locationCode: gpsLocationCode },
			});
			const newSurveyorNumber = `S${String(surveyorCount + 1).padStart(2, "0")}`;

			surveyor = await prismaPaddy.surveyor.create({
				data: {
					providerName: authResult.provider,
					providerUserId: authResult.userId ?? "",
					providerUsername: authResult.username,
					firstName: authResult.firstName,
					lastName: authResult.lastName,
					phone: authResult.phone,
					surveyorNumber: newSurveyorNumber,
					locationCode: gpsLocationCode,
				},
				select: {
					id: true,
					surveyorNumber: true,
					locationCode: true,
					providerUsername: true,
				},
			});
			logger.info("Created new surveyor", {
				surveyorNumber: surveyor.surveyorNumber,
				locationCode: surveyor.locationCode,
				provider: authResult.provider,
			});
		}
	}

	if (!surveyor) throw new Error("Could not initialize surveyor");

	// Use surveyor's data for folder naming
	const locationCode = surveyor.locationCode;
	const surveyorNumber = surveyor.surveyorNumber;

	// Format farm number
	const farmNum = Number.parseInt(data.farmNumber.replace(/\D/g, ""), 10) || 0;
	const formattedFarmNumber = `F${String(farmNum).padStart(3, "0")}`;

	// Full Farm ID: locationCode-surveyorNumber-farmNumber
	const fullFarmId = `${locationCode}-${surveyorNumber}-${formattedFarmNumber}`;

	// Format date as YYYYMMDD in Phnom Penh timezone
	const dateOfVisit = new Date();

	const dateFolder = formatDateFolderPhnomPenh(dateOfVisit);

	const safeProvince = (locationInfo.provinceName || "unknown")
		.toLowerCase()
		.replace(/\s+/g, "-")
		.replace(/\//g, "-");

	return {
		surveyor,
		locationInfo,
		fullFarmId,
		safeProvince,
		dateFolder,
		dateOfVisit,
	};
}

/**
 * Stage 2: Perform Save (Slow, Uploads + DB persistence)
 */
export async function performSubmissionSave(
	context: SubmissionContext,
	data: CreatePaddyFarmSurveyDto,
	photos: Array<{ buffer: Buffer; originalname: string; mimetype: string }>,
): Promise<{ success: boolean; photosUploaded: number }> {
	const {
		surveyor,
		locationInfo,
		fullFarmId,
		safeProvince,
		dateFolder,
		dateOfVisit,
	} = context;

	// Upload photos to GCS with structured path
	const photoUrls: string[] = [];
	if (gcs.isGcsAvailable() && photos.length > 0) {
		console.log(`[Async] Uploading ${photos.length} photos to GCS...`);

		const uploadPromises = photos.map(async (photo) => {
			const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
			const ext = path.extname(photo.originalname) || ".jpg";
			const safeFilename = `${path.basename(photo.originalname, ext)}-${uniqueSuffix}${ext}`;

			const objectPath = `survey-paddy/${safeProvince}/${fullFarmId}/${dateFolder}/${safeFilename}`;

			return gcs.uploadFileWithFullPath(
				photo.buffer,
				objectPath,
				photo.mimetype,
			);
		});

		try {
			const uploadedFiles = await Promise.all(uploadPromises);
			photoUrls.push(...uploadedFiles.map((f) => f.url));
			logger.info("Uploaded photos to GCS", { count: photoUrls.length });
		} catch (error) {
			logger.error("Photo upload failed, but attempting to save record", error);
		}
	}

	// Save to database
	if (prismaPaddy) {
		const lat = Number.parseFloat(data.gpsLatitude);
		const lng = Number.parseFloat(data.gpsLongitude);
		const weather = await getWeatherAtLocation(
			data.gpsLatitude,
			data.gpsLongitude,
		);

		await prismaPaddy.paddy.create({
			data: {
				surveyorId: surveyor.id,
				farmId: fullFarmId,
				farmNumber: data.farmNumber,
				gpsLatitude: lat,
				gpsLongitude: lng,
				provinceName: locationInfo.provinceName,
				districtName: locationInfo.districtName,
				communeName: locationInfo.communeName,
				dateOfVisit: dateOfVisit,
				rainfall: data.rainfall,
				rainfallIntensity: data.rainfallIntensity,
				soilRoughness: data.soilRoughness,
				growthStage: data.growthStage,
				waterStatus: data.waterStatus,
				overallHealth: data.overallHealth,
				visibleProblems: data.visibleProblems,
				fertilizer: data.fertilizer,
				fertilizerType: data.fertilizerType,
				herbicide: data.herbicide,
				pesticide: data.pesticide,
				stressEvents: data.stressEvents,
				weatherTemperature: weather?.temperature ?? null,
				weatherHumidity: weather?.humidity ?? null,
				weatherPrecipitation: weather?.precipitation ?? null,
				photoUrls,
				syncStatus: "pending",
			},
		});
		logger.info("Survey saved to database with pending sync status", {
			farmId: fullFarmId,
		});
	} else {
		logger.warn("Paddy database not available - survey not saved to DB");
	}

	return { success: true, photosUploaded: photoUrls.length };
}

/**
 * Process drive sync for a single paddy record
 * called by Cron job
 */
export async function processDriveSync(paddyId: string): Promise<boolean> {
	if (!prismaPaddy) return false;

	try {
		const record = await prismaPaddy.paddy.findUnique({
			where: { id: paddyId },
			include: { surveyor: true },
		});

		if (!record || !record.surveyor) return false;

		// Reconstruct data needed for Drive upload
		const { farmId, dateOfVisit, photoUrls, provinceName } = record;

		// Format date as YYYYMMDD in Phnom Penh timezone
		const dateFolder = formatDateFolderPhnomPenh(dateOfVisit);

		// 1. Upload Photos
		const driveFolderLink = await uploadPhotosToDrive({
			farmId,
			dateFolder,
			photoUrls,
			provinceName,
			contextLabel: "single",
		});

		// 2. Sync Excel
		if (googleDrive.isGoogleDriveAvailable()) {
			const rowGroup = buildExcelRowGroup(record, dateFolder, driveFolderLink);
			if (rowGroup) {
				await syncExcelWithDrive(
					rowGroup.excelFilename,
					rowGroup.excelFolderPath,
					[rowGroup.rowData],
				);
				logger.info("Excel updated successfully", {
					excelFilename: rowGroup.excelFilename,
					farmId,
				});
			}
		}

		// Update DB status
		await prismaPaddy.paddy.update({
			where: { id: paddyId },
			data: {
				syncStatus: "synced",
				syncedAt: new Date(),
				photoFolderDriveUrl: driveFolderLink || null,
			},
		});

		return true;
	} catch (error) {
		logger.error("Drive sync failed for record", error, { paddyId });

		// Update DB with error
		if (prismaPaddy) {
			await prismaPaddy.paddy.update({
				where: { id: paddyId },
				data: {
					syncStatus: "failed",
					syncError: error instanceof Error ? error.message : "Unknown error",
				},
			});
		}

		return false;
	}
}

/**
 * Process drive sync for multiple paddy records in batches
 * called by Cron job
 */
export async function processBatchDriveSync(
	paddyIds: string[],
): Promise<{ success: number; failed: number }> {
	if (!prismaPaddy || paddyIds.length === 0) return { success: 0, failed: 0 };

	const results = { success: 0, failed: 0 };

	try {
		// Fetch all records with surveyor info
		const records = await prismaPaddy.paddy.findMany({
			where: { id: { in: paddyIds } },
			include: { surveyor: true },
		});

		// Map for grouping Excel writes: Filename -> Array of { record, rowData }
		const excelGroups = new Map<
			string,
			Array<{
				record: (typeof records)[number];
				rowData: (string | number)[];
				folderPath: string;
			}>
		>();

		// Map to track processing result per record ID
		const recordStatus = new Map<
			string,
			{ status: "synced" | "failed"; error?: string; driveLink?: string }
		>();

		// 1. Process Photos & Prepare Excel Data (Parallel per record)
		const concurrency =
			Number.isFinite(DRIVE_SYNC_CONCURRENCY) && DRIVE_SYNC_CONCURRENCY > 0
				? DRIVE_SYNC_CONCURRENCY
				: 2;

		await runWithConcurrency(records, concurrency, async (record) => {
			try {
				if (!record.surveyor) throw new Error("Surveyor not found");

				const { farmId, dateOfVisit, photoUrls, provinceName } = record;

				// Format date as YYYYMMDD in Phnom Penh timezone
				const dateFolder = formatDateFolderPhnomPenh(dateOfVisit);

				// Upload Photos logic
				const driveFolderLink = await uploadPhotosToDrive({
					farmId,
					dateFolder,
					photoUrls,
					provinceName,
					contextLabel: "batch",
				});

				// Prepare Excel Row
				if (googleDrive.isGoogleDriveAvailable()) {
					const rowGroup = buildExcelRowGroup(
						record,
						dateFolder,
						driveFolderLink,
					);
					if (rowGroup) {
						const groupKey = `${rowGroup.excelFolderPath}/${rowGroup.excelFilename}`;
						if (!excelGroups.has(groupKey)) {
							excelGroups.set(groupKey, []);
						}
						excelGroups.get(groupKey)?.push({
							record,
							rowData: rowGroup.rowData,
							folderPath: rowGroup.excelFolderPath,
						});
					}
				}

				// Mark as tentatively synced (final confirmation after Excel write)
				recordStatus.set(record.id, {
					status: "synced",
					driveLink: driveFolderLink,
				});
			} catch (error) {
				console.error(`[Sync] Error processing record ${record.id}:`, error);
				recordStatus.set(record.id, {
					status: "failed",
					error: error instanceof Error ? error.message : "Unknown",
				});
			}
		});

		// 2. Process Excel Batches
		for (const [groupKey, items] of excelGroups) {
			if (items.length === 0) continue;

			const filename = path.basename(groupKey);
			const folderPath = items[0].folderPath; // Same for all in group
			const rows = items.map((i) => i.rowData);

			try {
				await syncExcelWithDrive(filename, folderPath, rows);
				logger.info("Batch updated Excel", { filename, rowCount: rows.length });
			} catch (error) {
				logger.error("Failed to update Excel in batch", error, { filename });
				// Mark all in this batch as failed
				for (const item of items) {
					recordStatus.set(item.record.id, {
						status: "failed",
						error: `Excel sync failed: ${error instanceof Error ? error.message : "Unknown"}`,
					});
				}
			}
		}

		// 3. Update Database
		for (const [id, statusInfo] of recordStatus) {
			try {
				if (statusInfo.status === "synced") {
					await prismaPaddy.paddy.update({
						where: { id },
						data: {
							syncStatus: "synced",
							syncedAt: new Date(),
							photoFolderDriveUrl: statusInfo.driveLink || null,
						},
					});
					results.success++;
				} else {
					await prismaPaddy.paddy.update({
						where: { id },
						data: {
							syncStatus: "failed",
							syncError: statusInfo.error,
						},
					});
					results.failed++;
				}
			} catch (e) {
				logger.error("Failed to update DB status in batch", e, {
					recordId: id,
				});
			}
		}
	} catch (error) {
		logger.error("Batch process fatal error", error);
	}

	return results;
}
