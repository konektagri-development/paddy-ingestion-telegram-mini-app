"use client";

import {
	AlertCircle,
	Check,
	Loader2,
	RefreshCw,
	Send,
	Wheat,
	WifiOff,
} from "lucide-react";
import { memo, useCallback, useState } from "react";
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
import { triggerHaptic, usePlatform } from "@/components/telegram-provider";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useFormPersistence } from "@/hooks/use-form-persistence";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { useTelegramUser } from "@/hooks/use-telegram-user";
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
import { useLanguage } from "@/lib/i18n/language-context";
import { buildOfflineSubmissionData } from "@/lib/utils/offline-data-builder";

// Memoized form sections to prevent unnecessary re-renders
const MemoizedBasicInfoSection = memo(BasicInfoSection);
const MemoizedRainfallSection = memo(RainfallSection);
const MemoizedSoilSection = memo(SoilSection);
const MemoizedGrowthStageSection = memo(GrowthStageSection);
const MemoizedHealthSection = memo(HealthSection);
const MemoizedProblemsSection = memo(ProblemsSection);
const MemoizedWaterStatusSection = memo(WaterStatusSection);
const MemoizedFertilizerSection = memo(FertilizerSection);
const MemoizedHerbicideSection = memo(HerbicideSection);
const MemoizedPesticideSection = memo(PesticideSection);
const MemoizedStressSection = memo(StressSection);
const MemoizedPhotoSection = memo(PhotoSection);

export function PaddyVisitForm() {
	const { t, language, setLanguage } = useLanguage();
	const { user, initDataRaw } = useTelegramUser();
	const { isOnline, pendingCount, saveForOffline } = useOnlineStatus();
	const { formData, updateFormData, clearSavedData } = useFormPersistence();
	const { isWeb } = usePlatform();
	const [isSubmitted, setIsSubmitted] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [submitError, setSubmitError] = useState<string | null>(null);

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

		// Prepare FormData for submission with photos
		const submitFormData = new FormData();

		// Add text fields
		submitFormData.append("gpsLatitude", formData.gpsLatitude || "N/A");
		submitFormData.append("gpsLongitude", formData.gpsLongitude || "N/A");
		submitFormData.append("farmNumber", formData.farmNumber || "N/A");
		submitFormData.append("rainfall", getRainfallText(formData.rainfall2days));
		submitFormData.append(
			"rainfallIntensity",
			getRainfallIntensityText(formData.rainfallIntensity),
		);
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
		// Note: telegramUserId and telegramUsername are extracted from auth header on server

		// Add photos as files
		for (const photo of formData.photos) {
			if (photo.file) {
				// Name the file with its type prefix (farm_ or soil_)
				const fileName = `${photo.type}_${photo.id}.${photo.file.name.split(".").pop() || "jpg"}`;
				submitFormData.append("photos", photo.file, fileName);
			}
		}

		// Set up headers and API endpoint based on platform
		const headers: Record<string, string> = {};
		let apiEndpoint = "/api/survey-paddy";

		if (isWeb) {
			// Web users: use web API with token auth
			const token = localStorage.getItem("web-auth-token");
			if (token) {
				headers.Authorization = `Bearer ${token}`;
			}
			apiEndpoint = "/api/survey-paddy-web";
		} else {
			// Telegram users: use Telegram init data
			if (initDataRaw) {
				headers["X-Telegram-Init-Data"] = initDataRaw;
			}
		}

		// If offline, save to IndexedDB for later sync
		if (!isOnline) {
			const offlineData = await buildOfflineSubmissionData(
				formData,
				user,
				initDataRaw,
			);

			await saveForOffline(offlineData);
			triggerHaptic("success");
			clearSavedData();
			setIsSubmitted(true);
			return;
		}

		// Submit with proper error handling - wait for response before showing success
		setIsSubmitting(true);
		setSubmitError(null);

		try {
			const response = await fetch(apiEndpoint, {
				method: "POST",
				headers,
				body: submitFormData,
			});

			if (!response.ok) {
				if (response.status === 401) {
					throw new Error("Authentication failed. Please restart the app.");
				}
				if (response.status === 413) {
					// Payload too large - photos are too big, don't save offline
					throw new Error(
						"Photos are too large. Please reduce the number of photos or try again.",
					);
				}
				throw new Error(`Server error (${response.status}). Please try again.`);
			}

			// Success!
			triggerHaptic("success");
			clearSavedData();
			setIsSubmitted(true);
		} catch (error) {
			const errorMessage =
				error instanceof Error
					? error.message
					: "Submission failed. Please try again.";
			setSubmitError(errorMessage);
			triggerHaptic("error");

			// Only save offline for actual network failures (not server errors like 500)
			// Server errors (500) are usually database/backend issues that retrying won't fix
			const isNetworkError =
				errorMessage.includes("fetch") ||
				errorMessage.includes("network") ||
				errorMessage.includes("Failed to fetch") ||
				errorMessage.includes("NetworkError");

			if (isNetworkError) {
				const offlineData = await buildOfflineSubmissionData(
					formData,
					user,
					initDataRaw,
				);
				await saveForOffline(offlineData);
			}
		} finally {
			setIsSubmitting(false);
		}
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
				<MemoizedBasicInfoSection data={formData} onChange={updateFormData} />
				<Separator />
				<MemoizedRainfallSection data={formData} onChange={updateFormData} />
				<Separator />
				<MemoizedSoilSection data={formData} onChange={updateFormData} />
				<Separator />
				<MemoizedGrowthStageSection data={formData} onChange={updateFormData} />
				<Separator />
				<MemoizedHealthSection data={formData} onChange={updateFormData} />
				<Separator />
				<MemoizedProblemsSection data={formData} onChange={updateFormData} />
				<Separator />
				<MemoizedWaterStatusSection data={formData} onChange={updateFormData} />
				<Separator />
				<MemoizedFertilizerSection data={formData} onChange={updateFormData} />
				<Separator />
				<MemoizedHerbicideSection data={formData} onChange={updateFormData} />
				<Separator />
				<MemoizedPesticideSection data={formData} onChange={updateFormData} />
				<Separator />
				<MemoizedStressSection data={formData} onChange={updateFormData} />
				<Separator />
				<MemoizedPhotoSection data={formData} onChange={updateFormData} />
			</main>

			{/* Submit Button */}
			<div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-xl border-t border-border/50 z-50 space-y-2">
				{/* Error Message */}
				{submitError && (
					<div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 text-destructive text-sm">
						<AlertCircle className="w-5 h-5 shrink-0" />
						<span>{submitError}</span>
					</div>
				)}
				<Button
					onClick={handleSubmit}
					disabled={isSubmitting}
					className="w-full h-14 text-lg rounded-2xl font-bold gap-3 shadow-lg shadow-primary/20"
				>
					{isSubmitting ? (
						<>
							<Loader2 className="w-6 h-6 animate-spin" />
							Submitting...
						</>
					) : (
						<>
							<Send className="w-6 h-6" />
							{submitError ? "Retry" : t.common.submit}
						</>
					)}
				</Button>
			</div>
		</div>
	);
}
