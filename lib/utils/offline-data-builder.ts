/**
 * Shared utility for building offline submission data
 * Reduces code duplication in form component
 */

import {
	getFertilizerTypeText,
	getGrowthStageText,
	getHealthText,
	getRainfallIntensityText,
	getRainfallText,
	getSoilText,
	getStressEventsText,
	getVisibleProblemsText,
	getWaterStatusText,
	getYesNoText,
} from "@/lib/form-text-utils";
import type { FormData } from "@/lib/form-types";
import type { OfflineFormData } from "@/lib/offline-storage";

/**
 * Convert a File to base64 string for offline storage
 */
async function fileToBase64(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.readAsDataURL(file);
		reader.onload = () => resolve(reader.result as string);
		reader.onerror = (error) => reject(error);
	});
}

/**
 * Build offline submission data from form data
 * Converts photos to base64 and prepares all fields
 * @param formData - The form data to convert
 * @param user - Telegram user info
 * @param initDataRaw - Telegram init data for auth
 */
export async function buildOfflineSubmissionData(
	formData: FormData,
	user: { id?: number; username?: string } | null,
	initDataRaw: string | null,
): Promise<OfflineFormData> {
	// Convert photos to base64 for offline storage
	const photosBase64 = await Promise.all(
		formData.photos
			.filter((p) => p.file)
			.map(async (photo) => {
				const base64 = await fileToBase64(photo.file as File);
				return {
					name: `${photo.type}_${photo.id}.${(photo.file as File).name.split(".").pop() || "jpg"}`,
					type: (photo.file as File).type,
					base64,
				};
			}),
	);

	return {
		gpsLatitude: formData.gpsLatitude,
		gpsLongitude: formData.gpsLongitude,
		farmNumber: formData.farmNumber,
		rainfall: getRainfallText(formData.rainfall2days),
		rainfallIntensity: getRainfallIntensityText(formData.rainfallIntensity),
		soilRoughness: getSoilText(formData.soilRoughness),
		growthStage: getGrowthStageText(formData.growthStage),
		overallHealth: getHealthText(formData.overallHealth),
		waterStatus: getWaterStatusText(formData.waterStatus),
		fertilizer: getYesNoText(formData.fertilizer.used),
		fertilizerType: getFertilizerTypeText(formData.fertilizer),
		herbicide: getYesNoText(formData.herbicide.used),
		pesticide: getYesNoText(formData.pesticide.used),
		visibleProblems: getVisibleProblemsText(formData.visibleProblems),
		stressEvents: getStressEventsText(formData.stressEvents),
		telegramUserId: user?.id?.toString(),
		telegramUsername: user?.username,
		// Include init data for authentication when syncing back online
		_initDataRaw: initDataRaw,
		// Photos as base64 for offline sync
		photos: photosBase64,
	};
}
