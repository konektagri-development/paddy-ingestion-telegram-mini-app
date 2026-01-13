import { promises as fs } from "node:fs";
import * as path from "node:path";
import ExcelJS from "exceljs";
import { getLocationCode } from "@/lib/server/administrative-divisions";
import * as googleDrive from "@/lib/server/google-drive";
import * as minio from "@/lib/server/minio";
import { prismaPaddy } from "@/lib/server/prisma-paddy";
import type { CreatePaddyFarmSurveyDto } from "@/lib/server/survey-paddy/schema";
import { createLogger } from "@/lib/server/utils/logger";

const logger = createLogger("SurveyService");

/**
 * Excel headers matching the template file structure
 */
const EXCEL_HEADERS = [
	"Farm ID",
	"Date of Visit",
	"GPS Latitude",
	"GPS Longitude",
	"Surveyor Name",
	"Surveyor Phone",
	"Rainfall in last 2 days",
	"Rainfall intensity (if yes)",
	"Soil Roughness",
	"Growth Stage",
	"Water Status (last 1 week)",
	"Overall Health",
	"Visible Problems",
	"Fertilizer used (last 1 week)",
	"Fertilizer type (if yes)",
	"Herbicide used (last 1 week)",
	"Pesticide used (last 1 week)",
	"Stress events (last 1 week)",
	"Photo Google Drive folder",
	"Surveyor notes",
];

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
 * Extract object name from MinIO URL
 */
function extractObjectNameFromUrl(url: string): string | null {
	try {
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

	let templateExists = false;
	try {
		await fs.access(TEMPLATE_PATH);
		templateExists = true;
	} catch {
		// Template doesn't exist
	}

	if (templateExists) {
		await workbook.xlsx.readFile(TEMPLATE_PATH);
		logger.debug("Loaded Excel template", { path: TEMPLATE_PATH });
	} else {
		const worksheet = workbook.addWorksheet("Entries");
		worksheet.addRow(EXCEL_HEADERS);
		logger.warn("Template not found, created new workbook with headers", {
			path: TEMPLATE_PATH,
		});
	}

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

/**
 * Process a paddy farm survey submission
 */
// ... imports

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
}

/**
 * Stage 1: Prepare Submission Context (Fast, DB reads only)
 */
export async function prepareSubmissionContext(
	authResult: {
		valid: boolean;
		userId?: string;
		username?: string;
		firstName?: string;
		lastName?: string;
	},
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
		// Try to find existing surveyor for this user at this location
		surveyor = await prismaPaddy.surveyor.findFirst({
			where: {
				providerName: "telegram",
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
					providerName: "telegram",
					providerUserId: authResult.userId ?? "",
					providerUsername: authResult.username,
					firstName: authResult.firstName,
					lastName: authResult.lastName,
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

	// Format date as YYYYMMDD
	const dateFolder = data.dateOfVisit.replace(/-/g, "");

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
	const { surveyor, locationInfo, fullFarmId, safeProvince, dateFolder } =
		context;

	// Upload photos to MinIO with structured path
	const photoUrls: string[] = [];
	if (minio.isMinioAvailable() && photos.length > 0) {
		console.log(`[Async] Uploading ${photos.length} photos to MinIO...`);

		const uploadPromises = photos.map(async (photo) => {
			const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
			const ext = path.extname(photo.originalname) || ".jpg";
			const safeFilename = `${path.basename(photo.originalname, ext)}-${uniqueSuffix}${ext}`;

			const objectPath = `survey-paddy/${safeProvince}/${fullFarmId}/${dateFolder}/${safeFilename}`;

			return minio.uploadFileWithFullPath(
				photo.buffer,
				objectPath,
				photo.mimetype,
			);
		});

		try {
			const uploadedFiles = await Promise.all(uploadPromises);
			photoUrls.push(...uploadedFiles.map((f) => f.url));
			logger.info("Uploaded photos to MinIO", { count: photoUrls.length });
		} catch (error) {
			logger.error("Photo upload failed, but attempting to save record", error);
		}
	}

	// Save to database
	if (prismaPaddy) {
		const lat = Number.parseFloat(data.gpsLatitude);
		const lng = Number.parseFloat(data.gpsLongitude);

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
				dateOfVisit: new Date(data.dateOfVisit),
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
		const {
			farmId,
			dateOfVisit,
			gpsLatitude,
			gpsLongitude,
			photoUrls,
			provinceName,
		} = record;
		const surveyor = record.surveyor;

		// Format date as YYYYMMDD
		const dateFolder = dateOfVisit
			.toISOString()
			.split("T")[0]
			.replace(/-/g, "");

		// 1. Upload Photos
		let driveFolderLink = "";

		if (
			googleDrive.isGoogleDriveAvailable() &&
			photoUrls &&
			photoUrls.length > 0 &&
			provinceName
		) {
			const folderPath = `4_GT photo and log/${provinceName}/${farmId}/${dateFolder}`;

			try {
				const folderId = await googleDrive.createFolderPath(folderPath);
				driveFolderLink = `https://drive.google.com/drive/folders/${folderId}`;

				for (const photoUrl of photoUrls) {
					try {
						const objectName = extractObjectNameFromUrl(photoUrl);
						if (objectName && minio.isMinioAvailable()) {
							const stream = await minio.getFileStream(objectName);
							const tempPath = path.join("/tmp", path.basename(objectName));

							const chunks: Buffer[] = [];
							for await (const chunk of stream) {
								chunks.push(chunk as Buffer);
							}
							await fs.writeFile(tempPath, Buffer.concat(chunks));

							const result = await googleDrive.uploadFile(tempPath, folderPath);
							if (result.success) {
								logger.debug("Uploaded photo to Drive", { objectName });
							}

							await fs.unlink(tempPath).catch(() => {});
						}
					} catch (error) {
						logger.warn("Failed to upload photo", {
							photoUrl,
							error: error instanceof Error ? error.message : String(error),
						});
					}
				}
			} catch (error) {
				logger.error("Failed to create Drive folder", error, { farmId });
			}
		}

		// 2. Sync Excel
		if (googleDrive.isGoogleDriveAvailable() && provinceName) {
			const rowData = [
				farmId,
				dateOfVisit.toISOString().split("T")[0],
				gpsLatitude.toString(),
				gpsLongitude.toString(),
				formatSurveyorName(surveyor),
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

			const excelFilename = `GT-${surveyor.locationCode}-${dateFolder}.xlsx`;
			const excelFolderPath = `5_GT text-data/RecurringVisit/${provinceName} - Data`;

			await syncExcelWithDrive(excelFilename, excelFolderPath, [rowData]);
			logger.info("Excel updated successfully", { excelFilename, farmId });
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
		for (const record of records) {
			try {
				if (!record.surveyor) throw new Error("Surveyor not found");

				const {
					farmId,
					dateOfVisit,
					gpsLatitude,
					gpsLongitude,
					photoUrls,
					provinceName,
				} = record;
				const surveyor = record.surveyor;

				// Format date as YYYYMMDD
				const dateFolder = dateOfVisit
					.toISOString()
					.split("T")[0]
					.replace(/-/g, "");

				// Upload Photos logic
				let driveFolderLink = "";
				if (
					googleDrive.isGoogleDriveAvailable() &&
					photoUrls &&
					photoUrls.length > 0 &&
					provinceName
				) {
					const folderPath = `4_GT photo and log/${provinceName}/${farmId}/${dateFolder}`;

					try {
						const folderId = await googleDrive.createFolderPath(folderPath);
						driveFolderLink = `https://drive.google.com/drive/folders/${folderId}`;

						for (const photoUrl of photoUrls) {
							// Upload each photo
							try {
								const objectName = extractObjectNameFromUrl(photoUrl);
								if (objectName && minio.isMinioAvailable()) {
									const stream = await minio.getFileStream(objectName);
									const uniquePath = path.join(
										"/tmp",
										`${Date.now()}-${path.basename(objectName)}`,
									);
									await fs.writeFile(uniquePath, stream); // Stream to file for Drive upload

									const result = await googleDrive.uploadFile(
										uniquePath,
										folderPath,
									);
									if (result.success) {
										logger.debug("Uploaded photo to Drive in batch", {
											objectName,
										});
									}
									await fs.unlink(uniquePath).catch(() => {});
								}
							} catch (e) {
								logger.warn("Failed to upload photo in batch", {
									photoUrl,
									error: e instanceof Error ? e.message : String(e),
								});
							}
						}
					} catch (e) {
						logger.error("Failed to prep Drive folder in batch", e, { farmId });
					}
				}

				// Prepare Excel Row
				if (provinceName) {
					const rowData = [
						farmId,
						dateOfVisit.toISOString().split("T")[0],
						gpsLatitude.toString(),
						gpsLongitude.toString(),
						formatSurveyorName(surveyor),
						"N/A",
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

					// Group by Filename (Location-Date)
					const excelFilename = `GT-${surveyor.locationCode}-${dateFolder}.xlsx`;
					const excelFolderPath = `5_GT text-data/RecurringVisit/${provinceName} - Data`;
					const groupKey = `${excelFolderPath}/${excelFilename}`;

					if (!excelGroups.has(groupKey)) {
						excelGroups.set(groupKey, []);
					}
					excelGroups
						.get(groupKey)
						?.push({ record, rowData, folderPath: excelFolderPath });
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
		}

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
