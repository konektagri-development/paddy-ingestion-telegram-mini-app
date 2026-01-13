import { FormData } from "@/lib/form-types";

/**
 * Shared text conversion utilities for form data
 * Used by both form submission and offline sync
 */

export function getGrowthStageText(stage: FormData["growthStage"]): string {
	const stageMap: Record<string, string> = {
		landPrep: "Preparing Field",
		recentlyTransplanted: "Seedling",
		tilleringOnset: "Tillering Onset",
		flowering: "Flowering",
		ripening: "Ripening",
		harvestReady: "Harvest Ready",
		fallow: "Fallow",
	};
	return stage ? stageMap[stage] || "N/A" : "N/A";
}

export function getHealthText(health: FormData["overallHealth"]): string {
	const healthMap: Record<string, string> = {
		excellent: "Very Good",
		good: "Good",
		fair: "Okay",
		poor: "Bad",
	};
	return health ? healthMap[health] || "N/A" : "N/A";
}

export function getSoilText(soil: FormData["soilRoughness"]): string {
	const soilMap: Record<string, string> = {
		smooth: "Smooth",
		medium: "Medium",
		rough: "Rough",
	};
	return soil ? soilMap[soil] || "N/A" : "N/A";
}

export function getWaterStatusText(status: FormData["waterStatus"]): string {
	const statusMap: Record<string, string> = {
		alwaysFlooded: "Consistently flooded",
		mostlyWet: "Mostly wet, occasional drying",
		frequentlyDry: "Often dry",
		veryDry: "Very dry / cracked",
	};
	return status ? statusMap[status] || "N/A" : "N/A";
}

export function getYesNoText(
	value: "yes" | "no" | "dontRemember" | null,
): string {
	if (value === "yes") return "Yes";
	if (value === "no") return "No";
	if (value === "dontRemember") return "Don't Remember";
	return "N/A";
}

export function getVisibleProblemsText(
	problems: FormData["visibleProblems"],
): string {
	if (problems.none) return "None";
	const items: string[] = [];
	if (problems.yellowing)
		items.push(
			`Yellowing${problems.yellowingLocation ? ` (${problems.yellowingLocation})` : ""}`,
		);
	if (problems.brownSpots) items.push("Brown Spots");
	if (problems.wilting) items.push("Wilting");
	if (problems.lodging) items.push("Lodging");
	if (problems.pestDamage)
		items.push(
			`Pest Damage${problems.pestType ? ` (${problems.pestType})` : ""}`,
		);
	if (problems.weedInfestation) items.push("Weed Infestation");
	if (problems.unevenGrowth) items.push("Uneven Growth");
	if (problems.other) items.push(problems.otherDescription || "Other");
	return items.length > 0 ? items.join(", ") : "None";
}

export function getFertilizerTypeText(
	fertilizer: FormData["fertilizer"],
): string {
	if (fertilizer.used === "no") return "No";
	if (fertilizer.used === "dontRemember") return "Don't Remember";
	if (fertilizer.used === "yes" && fertilizer.types) {
		const types: string[] = [];
		if (fertilizer.types.urea) types.push("Urea");
		if (fertilizer.types.npk) types.push("NPK");
		if (fertilizer.types.organic) types.push("Organic");
		if (fertilizer.types.other)
			types.push(fertilizer.types.otherType || "Other");
		return types.length > 0 ? types.join(", ") : "";
	}
	return "";
}

export function getStressEventsText(stress: FormData["stressEvents"]): string {
	if (stress.none) return "None";
	const items: string[] = [];
	if (stress.flood) items.push("Flood");
	if (stress.drought) items.push("Drought");
	if (stress.other) items.push(stress.otherDescription || "Other");
	return items.length > 0 ? items.join(", ") : "None";
}

export function getRainfallText(rainfall2days: boolean | null): string {
	if (rainfall2days === true) return "Yes";
	if (rainfall2days === false) return "No";
	return "N/A";
}

export function getRainfallIntensityText(
	intensity: FormData["rainfallIntensity"],
): string {
	if (intensity === null) return "N/A";
	const intensityMap: Record<string, string> = {
		heavy: "Heavy Rain",
		moderate: "Normal Rain",
		low: "Little Rain",
	};
	return intensity ? intensityMap[intensity] : "N/A";
}
