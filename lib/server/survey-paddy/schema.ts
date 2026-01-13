import { z } from "zod";

export const createPaddyFarmSurveySchema = z.object({
	// Form data - all human-readable strings from frontend
	dateOfVisit: z.string(),
	gpsLatitude: z.string(),
	gpsLongitude: z.string(),
	farmNumber: z.string(),
	rainfall: z.string(),
	rainfallIntensity: z.string().optional(),
	soilRoughness: z.string(),
	growthStage: z.string(),
	waterStatus: z.string(),
	overallHealth: z.string(),
	visibleProblems: z.string(),
	fertilizer: z.string(),
	fertilizerType: z.string().optional(),
	herbicide: z.string(),
	pesticide: z.string(),
	stressEvents: z.string(),
});

export type CreatePaddyFarmSurveyDto = z.infer<
	typeof createPaddyFarmSurveySchema
>;
