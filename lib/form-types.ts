// Form Types for Rice Field Data Collection
// Types are derived from constants to ensure they never get out of sync

// ============================================================================
// CONSTANTS - Define these FIRST, they are the single source of truth
// ============================================================================

export const GROWTH_STAGES = [
	{
		value: "landPrep",
		label: "Preparing Field",
		description: "Plowing or flooding the field",
	},
	{
		value: "recentlyTransplanted",
		label: "Seedling (Young Plants)",
		description: "Just planted or small seedlings",
	},
	{
		value: "tilleringOnset",
		label: "Tillering Onset (Growing Stems)",
		description: "Plants getting bigger with more stems",
	},
	{
		value: "flowering",
		label: "Flowering (Panicle)",
		description: "Flowers or grain heads appearing",
	},
	{
		value: "ripening",
		label: "Ripening (Yellowing)",
		description: "Grains turning yellow and hard",
	},
	{
		value: "harvestReady",
		label: "Ready to Harvest",
		description: "Dry and ready to cut",
	},
	{
		value: "fallow",
		label: "Fallow (Empty Field)",
		description: "Nothing planted right now",
	},
] as const;

export const WATER_STATUS_OPTIONS = [
	{
		value: "alwaysFlooded",
		label: "Consistently Flooded",
		description: "Water covers the soil well",
	},
	{
		value: "mostlyWet",
		label: "Mostly Wet",
		description: "Saturated soil, occasional drying",
	},
	{
		value: "frequentlyDry",
		label: "Often Dry",
		description: "Soil dries out sometimes",
	},
	{
		value: "veryDry",
		label: "Very Dry / Cracked",
		description: "Soil is hard and cracked",
	},
] as const;

export const HEALTH_OPTIONS = [
	{
		value: "excellent",
		label: "Very Good",
		description: "Strong, green, no problems",
	},
	{
		value: "good",
		label: "Good",
		description: "Looks healthy, small problems",
	},
	{
		value: "fair",
		label: "Okay",
		description: "Some yellowing or problems",
	},
	{
		value: "poor",
		label: "Bad",
		description: "Many dead plants or big problems",
	},
] as const;

export const RAINFALL_INTENSITY_OPTIONS = [
	{ value: "heavy", label: "Heavy Rain" },
	{ value: "moderate", label: "Normal Rain" },
	{ value: "low", label: "Little Rain" },
] as const;

export const SOIL_ROUGHNESS_OPTIONS = [
	{ value: "smooth", label: "Smooth" },
	{ value: "medium", label: "Medium" },
	{ value: "rough", label: "Rough" },
] as const;

export const YES_NO_REMEMBER_OPTIONS = [
	{ value: "yes", label: "Yes" },
	{ value: "no", label: "No" },
	{ value: "dontRemember", label: "Not Sure" },
] as const;

// ============================================================================
// DERIVED TYPES - These are automatically derived from the constants above
// If you change a constant, the type updates automatically!
// ============================================================================

/** Growth stage values derived from GROWTH_STAGES constant */
export type GrowthStage = (typeof GROWTH_STAGES)[number]["value"];

/** Water status values derived from WATER_STATUS_OPTIONS constant */
export type WaterStatus = (typeof WATER_STATUS_OPTIONS)[number]["value"];

/** Overall health values derived from HEALTH_OPTIONS constant */
export type OverallHealth = (typeof HEALTH_OPTIONS)[number]["value"];

/** Rainfall intensity values derived from RAINFALL_INTENSITY_OPTIONS constant */
export type RainfallIntensity =
	(typeof RAINFALL_INTENSITY_OPTIONS)[number]["value"];

/** Soil roughness values derived from SOIL_ROUGHNESS_OPTIONS constant */
export type SoilRoughness = (typeof SOIL_ROUGHNESS_OPTIONS)[number]["value"];

/** Yes/No/Don't Remember values derived from YES_NO_REMEMBER_OPTIONS constant */
export type YesNoRemember = (typeof YES_NO_REMEMBER_OPTIONS)[number]["value"];

// ============================================================================
// COMPLEX TYPES - These use the derived types above
// ============================================================================

export interface VisibleProblems {
	none: boolean;
	yellowing: boolean;
	yellowingLocation?: string;
	brownSpots: boolean;
	wilting: boolean;
	lodging: boolean;
	pestDamage: boolean;
	pestType?: string;
	weedInfestation: boolean;
	unevenGrowth: boolean;
	other: boolean;
	otherDescription?: string;
}

export interface FertilizerData {
	used: YesNoRemember | null;
	types?: {
		urea: boolean;
		npk: boolean;
		organic: boolean;
		other: boolean;
		otherType?: string;
	};
}

export interface PesticideData {
	used: YesNoRemember | null;
}

export interface HerbicideData {
	used: YesNoRemember | null;
}

export interface StressEvents {
	flood: boolean;
	drought: boolean;
	none: boolean;
	other: boolean;
	otherDescription?: string;
}

export interface PhotoData {
	id: string;
	file: File | null;
	preview: string;
	type: "farm" | "soil";
}

// ============================================================================
// MAIN FORM DATA TYPE - Uses all the derived types
// ============================================================================

export interface FormData {
	farmNumber: string;
	gpsLatitude: string;
	gpsLongitude: string;
	rainfall2days: boolean | null;
	rainfallIntensity?: RainfallIntensity;
	soilRoughness: SoilRoughness | null;

	growthStage: GrowthStage | null;

	overallHealth: OverallHealth | null;
	visibleProblems: VisibleProblems;
	waterStatus: WaterStatus | null;

	fertilizer: FertilizerData;
	herbicide: HerbicideData;
	pesticide: PesticideData;

	stressEvents: StressEvents;
	photos: PhotoData[];
}

export const initialFormData: FormData = {
	farmNumber: "",
	gpsLatitude: "",
	gpsLongitude: "",
	rainfall2days: null,
	rainfallIntensity: undefined,
	soilRoughness: null,

	growthStage: null,

	overallHealth: null,
	visibleProblems: {
		none: false,
		yellowing: false,
		yellowingLocation: "",
		brownSpots: false,
		wilting: false,
		lodging: false,
		pestDamage: false,
		pestType: "",
		weedInfestation: false,
		unevenGrowth: false,
		other: false,
		otherDescription: "",
	},
	waterStatus: null,

	fertilizer: {
		used: null,
		types: {
			urea: false,
			npk: false,
			organic: false,
			other: false,
			otherType: "",
		},
	},
	herbicide: {
		used: null,
	},
	pesticide: {
		used: null,
	},

	stressEvents: {
		flood: false,
		drought: false,
		none: false,
		other: false,
		otherDescription: "",
	},
	photos: [],
};
