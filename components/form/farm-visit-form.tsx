"use client";

import { Check, RefreshCw, Send, Wheat, WifiOff } from "lucide-react";
import { useCallback, useState } from "react";
import { BasicInfoSection } from "@/components/form/basic-info-section";
import { FertilizerSection } from "@/components/form/fertilizer-section";
import { GrowthStageSection } from "@/components/form/growth-stage-section";
import { HealthSection } from "@/components/form/health-section";
import { HerbicideSection } from "@/components/form/herbicide-section";
import { PesticideSection } from "@/components/form/pesticide-section";
import { PhotoSection } from "@/components/form/photo-section";
import { ProblemsSection } from "@/components/form/problems-section";
import { RainfallSection } from "@/components/form/rainfall-section";
import { SoilSection } from "@/components/form/soil-section";
import { StressSection } from "@/components/form/stress-section";
import { WaterStatusSection } from "@/components/form/water-status-section";
import { triggerHaptic } from "@/components/telegram-provider";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useFormPersistence } from "@/hooks/use-form-persistence";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { useTelegramUser } from "@/hooks/use-telegram-user";
import type { FormData } from "@/lib/form-types";
import { useLanguage } from "@/lib/i18n/language-context";

export function FarmVisitForm() {
	const { t, language, setLanguage } = useLanguage();
	const { user, initDataRaw } = useTelegramUser();
	const { isOnline, pendingCount, saveForOffline } = useOnlineStatus();
	const { formData, updateFormData, clearSavedData } = useFormPersistence();
	const [isSubmitted, setIsSubmitted] = useState(false);

	// Validation rules with corresponding section IDs
	const getFirstInvalidField = useCallback((): {
		id: string;
		message: string;
	} | null => {
		if (!formData.farmNumber.trim()) {
			return { id: "section-basic-info", message: "Field number is needed" };
		}
		if (!formData.gpsLatitude.trim() || !formData.gpsLongitude.trim()) {
			return {
				id: "section-basic-info",
				message: "Location is needed",
			};
		}
		if (formData.rainfall2days === null) {
			return {
				id: "section-rainfall",
				message: "Rainfall info is needed",
			};
		}
		if (!formData.soilRoughness) {
			return { id: "section-soil", message: "Soil type is needed" };
		}
		if (!formData.growthStage) {
			return { id: "section-growth", message: "Growth stage is needed" };
		}
		if (!formData.overallHealth) {
			return { id: "section-health", message: "Crop health is needed" };
		}
		if (!formData.waterStatus) {
			return { id: "section-water", message: "Water level is needed" };
		}
		if (formData.fertilizer.used === null) {
			return {
				id: "section-fertilizer",
				message: "Fertilizer info is needed",
			};
		}
		if (formData.herbicide.used === null) {
			return {
				id: "section-herbicide",
				message: "Herbicide info is needed",
			};
		}
		if (formData.pesticide.used === null) {
			return {
				id: "section-pesticide",
				message: "Pesticide info is needed",
			};
		}
		if (formData.photos.length === 0) {
			return {
				id: "section-photos",
				message: "Please take a photo",
			};
		}
		return null;
	}, [formData]);

	// Scroll to invalid field and highlight it
	const scrollToInvalidField = useCallback((fieldId: string) => {
		const element = document.getElementById(fieldId);
		if (element) {
			element.scrollIntoView({ behavior: "smooth", block: "center" });
			// Add highlight animation
			element.classList.add("ring-2", "ring-destructive", "ring-offset-2");
			setTimeout(() => {
				element.classList.remove("ring-2", "ring-destructive", "ring-offset-2");
			}, 2000);
		}
	}, []);

	const handleSubmit = async () => {
		// Check for validation errors first
		const invalidField = getFirstInvalidField();
		if (invalidField) {
			triggerHaptic("error");
			scrollToInvalidField(invalidField.id);
			return;
		}

		triggerHaptic("medium");

		// Helper functions for human-readable values
		const getGrowthStageText = (stage: FormData["growthStage"]): string => {
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
		};

		const getHealthText = (health: FormData["overallHealth"]): string => {
			const healthMap: Record<string, string> = {
				excellent: "Very Good",
				good: "Good",
				fair: "Okay",
				poor: "Bad",
			};
			return health ? healthMap[health] || "N/A" : "N/A";
		};

		const getSoilText = (soil: FormData["soilRoughness"]): string => {
			const soilMap: Record<string, string> = {
				smooth: "Smooth",
				medium: "Medium",
				rough: "Rough",
			};
			return soil ? soilMap[soil] || "N/A" : "N/A";
		};

		const getYesNoText = (
			value: "yes" | "no" | "dontRemember" | null,
		): string => {
			if (value === "yes") return "Yes";
			if (value === "no") return "No";
			if (value === "dontRemember") return "Don't Remember";
			return "N/A";
		};

		const getVisibleProblemsText = (
			problems: FormData["visibleProblems"],
		): string => {
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
		};

		const getWaterStatusText = (status: FormData["waterStatus"]): string => {
			const statusMap: Record<string, string> = {
				alwaysFlooded: "Consistently flooded",
				mostlyWet: "Mostly wet, occasional drying",
				frequentlyDry: "Often dry",
				veryDry: "Very dry / cracked",
			};
			return status ? statusMap[status] || "N/A" : "N/A";
		};

		const getFertilizerTypeText = (
			fertilizer: FormData["fertilizer"],
		): string => {
			if (fertilizer.used === "no") return "No";
			if (fertilizer.used === "dontRemember") return "Don't Remember";
			if (fertilizer.used === "yes" && fertilizer.types) {
				const types: string[] = [];
				if (fertilizer.types.urea) types.push("Urea");
				if (fertilizer.types.npk) types.push("NPK");
				if (fertilizer.types.organic) types.push("Organic");
				if (fertilizer.types.other)
					types.push(fertilizer.types.otherType || "Other");
				return types.length > 0 ? `${types.join(", ")}` : "";
			}
			return "";
		};

		const getStressEventsText = (stress: FormData["stressEvents"]): string => {
			if (stress.none) return "None";
			const items: string[] = [];
			if (stress.flood) items.push("Flood");
			if (stress.drought) items.push("Drought");
			if (stress.other) items.push(stress.otherDescription || "Other");
			return items.length > 0 ? items.join(", ") : "None";
		};

		const getRainfallText = (): string => {
			if (formData.rainfall2days === true) return "Yes";
			if (formData.rainfall2days === false) return "No";
			return "N/A";
		};

		const getRainfallIntensityText = (): string => {
			if (formData.rainfallIntensity === null) return "N/A";
			const intensityMap: Record<string, string> = {
				heavy: "Heavy Rain",
				moderate: "Normal Rain",
				low: "Little Rain",
			};
			return formData.rainfallIntensity
				? intensityMap[formData.rainfallIntensity]
				: "N/A";
		};

		// Prepare FormData for submission with photos
		const submitFormData = new FormData();

		// Add text fields
		submitFormData.append("dateOfVisit", formData.dateOfVisit);
		submitFormData.append("gpsLatitude", formData.gpsLatitude || "N/A");
		submitFormData.append("gpsLongitude", formData.gpsLongitude || "N/A");
		submitFormData.append("farmNumber", formData.farmNumber || "N/A");
		submitFormData.append("rainfall", getRainfallText());
		submitFormData.append("rainfallIntensity", getRainfallIntensityText());
		submitFormData.append("soilRoughness", getSoilText(formData.soilRoughness));
		submitFormData.append(
			"growthStage",
			getGrowthStageText(formData.growthStage),
		);
		submitFormData.append(
			"overallHealth",
			getHealthText(formData.overallHealth),
		);
		submitFormData.append(
			"visibleProblems",
			getVisibleProblemsText(formData.visibleProblems),
		);
		submitFormData.append(
			"waterStatus",
			getWaterStatusText(formData.waterStatus),
		);
		submitFormData.append("fertilizer", getYesNoText(formData.fertilizer.used));
		submitFormData.append(
			"fertilizerType",
			getFertilizerTypeText(formData.fertilizer),
		);
		submitFormData.append("herbicide", getYesNoText(formData.herbicide.used));
		submitFormData.append("pesticide", getYesNoText(formData.pesticide.used));
		submitFormData.append(
			"stressEvents",
			getStressEventsText(formData.stressEvents),
		);
		submitFormData.append("telegramUserId", String(user?.id || 0));
		submitFormData.append(
			"telegramUsername",
			user?.username || user?.firstName || "unknown",
		);

		// Add photos as files
		for (const photo of formData.photos) {
			if (photo.file) {
				// Name the file with its type prefix (farm_ or soil_)
				const fileName = `${photo.type}_${photo.id}.${photo.file.name.split(".").pop() || "jpg"}`;
				submitFormData.append("photos", photo.file, fileName);
			}
		}

		// Fire and forget - submit in background without waiting
		// Include Telegram init data for backend validation
		const headers: Record<string, string> = {};
		if (initDataRaw) {
			headers["X-Telegram-Init-Data"] = initDataRaw;
		}

		const apiUrl =
			process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v3";

		// If offline, save to IndexedDB for later sync
		if (!isOnline) {
			const offlineData = {
				dateOfVisit: new Date().toISOString().split("T")[0],
				gpsLatitude: formData.gpsLatitude,
				gpsLongitude: formData.gpsLongitude,
				farmNumber: formData.farmNumber,
				rainfall: formData.rainfall2days ? "Yes" : "No",
				rainfallIntensity: formData.rainfallIntensity,
				soilRoughness: formData.soilRoughness,
				growthStage: formData.growthStage,
				overallHealth: formData.overallHealth,
				waterStatus: formData.waterStatus,
				fertilizer: formData.fertilizer.used,
				herbicide: formData.herbicide.used,
				pesticide: formData.pesticide.used,
				telegramUserId: user?.id?.toString(),
				telegramUsername: user?.username,
			};

			await saveForOffline(offlineData);
			triggerHaptic("success");
			setIsSubmitted(true);
			return;
		}

		fetch(`${apiUrl}/paddy-farm-survey`, {
			method: "POST",
			headers,
			body: submitFormData,
		})
			.then((response) => {
				if (!response.ok && response.status !== 401) {
					// Non-401 errors - save for retry (e.g., 500, 503)
					throw new Error(`Server error: ${response.status}`);
				}
				// 401 = auth error, don't save for retry (it will keep failing)
				// 2xx = success, no action needed
			})
			.catch(async (error) => {
				// Network error or non-401 server error - save offline for retry
				console.error("Background submission failed:", error);
				const offlineData = {
					dateOfVisit: new Date().toISOString().split("T")[0],
					gpsLatitude: formData.gpsLatitude,
					gpsLongitude: formData.gpsLongitude,
					farmNumber: formData.farmNumber,
					rainfall: formData.rainfall2days ? "Yes" : "No",
					telegramUserId: user?.id?.toString(),
				};
				await saveForOffline(offlineData);
			});

		// Immediately show success to user and clear saved draft
		triggerHaptic("success");
		clearSavedData();
		setIsSubmitted(true);
	};

	const handleNewForm = () => {
		triggerHaptic("light");
		clearSavedData();
		setIsSubmitted(false);
		window.scrollTo({ top: 0, behavior: "smooth" });
	};

	// Success screen
	if (isSubmitted) {
		return (
			<div className="min-h-screen bg-muted/30 flex items-center justify-center p-6">
				<div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center space-y-6">
					<div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
						<Check className="w-10 h-10 text-primary" strokeWidth={3} />
					</div>
					<div>
						<h2 className="text-xl font-bold text-foreground mb-2">
							{t.common.successTitle}
						</h2>
						<p className="text-muted-foreground text-sm">
							{t.common.successMessage}
						</p>
					</div>
					<Button
						onClick={handleNewForm}
						className="w-full h-12 rounded-xl font-semibold"
					>
						{t.common.startNew}
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-background pb-32">
			{/* Header */}
			<header className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-primary/90 text-primary-foreground">
				{/* Decorative background elements */}
				<div className="absolute inset-0 opacity-10">
					<div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/20 blur-2xl" />
					<div className="absolute -bottom-4 -left-4 w-24 h-24 rounded-full bg-white/10 blur-xl" />
				</div>

				<div className="relative p-4">
					<div className="flex items-center justify-between gap-3">
						{/* Logo and Title */}
						<div className="flex items-center gap-3 flex-1 min-w-0">
							<Wheat className="w-8 h-8" />
							<div className="min-w-0">
								<h1 className="text-lg font-bold tracking-tight truncate">
									{t.header.title}
								</h1>
								<p className="text-sm text-primary-foreground/70 truncate">
									{t.header.subtitle}
								</p>
							</div>
						</div>

						{/* Language Toggle */}
						<button
							type="button"
							onClick={() => {
								triggerHaptic("light");
								setLanguage(language === "en" ? "km" : "en");
							}}
							className="shrink-0 px-3 py-1.5 rounded-lg bg-white/15 text-sm font-semibold hover:bg-white/25 active:scale-95 transition-all backdrop-blur-sm border border-white/10"
						>
							{language === "en" ? "🇰🇭" : "🇬🇧"}
						</button>
					</div>

					{/* Offline Status Indicator */}
					{(!isOnline || pendingCount > 0) && (
						<div className="flex items-center gap-2 mt-2 px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm text-sm">
							{!isOnline ? (
								<>
									<WifiOff className="w-4 h-4 text-yellow-300" />
									<span className="text-yellow-100">Offline mode</span>
								</>
							) : pendingCount > 0 ? (
								<>
									<RefreshCw className="w-4 h-4 text-blue-300 animate-spin" />
									<span className="text-blue-100">
										Syncing {pendingCount} record{pendingCount > 1 ? "s" : ""}
										...
									</span>
								</>
							) : null}
						</div>
					)}
				</div>
			</header>

			{/* Form Content */}
			<main className="p-4 space-y-4">
				<BasicInfoSection data={formData} onChange={updateFormData} />
				<Separator />
				<RainfallSection data={formData} onChange={updateFormData} />
				<Separator />
				<SoilSection data={formData} onChange={updateFormData} />
				<Separator />
				<GrowthStageSection data={formData} onChange={updateFormData} />
				<Separator />
				<HealthSection data={formData} onChange={updateFormData} />
				<Separator />
				<ProblemsSection data={formData} onChange={updateFormData} />
				<Separator />
				<WaterStatusSection data={formData} onChange={updateFormData} />
				<Separator />
				<FertilizerSection data={formData} onChange={updateFormData} />
				<Separator />
				<HerbicideSection data={formData} onChange={updateFormData} />
				<Separator />
				<PesticideSection data={formData} onChange={updateFormData} />
				<Separator />
				<StressSection data={formData} onChange={updateFormData} />
				<Separator />
				<PhotoSection data={formData} onChange={updateFormData} />
			</main>

			{/* Submit Button */}
			<div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-xl border-t border-border/50 z-50">
				<Button
					onClick={handleSubmit}
					className="w-full h-14 text-lg rounded-2xl font-bold gap-3 shadow-lg shadow-primary/20"
				>
					<Send className="w-6 h-6" />
					{t.common.submit}
				</Button>
			</div>
		</div>
	);
}
