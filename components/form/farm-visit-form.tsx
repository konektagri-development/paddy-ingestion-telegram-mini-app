"use client";

import { Check, Loader2, Send, Wheat } from "lucide-react";
import { useCallback, useState } from "react";
import { BasicInfoSection } from "@/components/form/basic-info-section";
import { GrowthWaterSection } from "@/components/form/growth-water-section";
import { HealthSection } from "@/components/form/health-section";
import { StressPhotoSection } from "@/components/form/stress-photo-section";
import { TreatmentsSection } from "@/components/form/treatments-section";
import { triggerHaptic } from "@/components/telegram-provider";
import { Button } from "@/components/ui/button";
import { useTelegramUser } from "@/hooks/use-telegram-user";
import type { FormData } from "@/lib/form-types";
import { initialFormData } from "@/lib/form-types";
import { useLanguage } from "@/lib/i18n/language-context";

export function FarmVisitForm() {
	const { t, language, setLanguage } = useLanguage();
	const { user } = useTelegramUser();
	const [formData, setFormData] = useState<FormData>(initialFormData);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isSubmitted, setIsSubmitted] = useState(false);

	const updateFormData = useCallback((data: Partial<FormData>) => {
		setFormData((prev) => ({ ...prev, ...data }));
	}, []);

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
		if (!formData.waterStatus) {
			return { id: "section-water", message: "Water level is needed" };
		}
		if (!formData.overallHealth) {
			return { id: "section-health", message: "Crop health is needed" };
		}
		if (formData.fertilizer.used === null) {
			return {
				id: "section-fertilizer",
				message: "Fertilizer info is needed",
			};
		}
		if (formData.herbicide === null) {
			return {
				id: "section-herbicide",
				message: "Herbicide info is needed",
			};
		}
		if (formData.pesticide === null) {
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
		setIsSubmitting(true);

		try {
			// Prepare submission data with user info
			const submissionData = {
				...formData,
				telegramUserId: user?.id || 0,
				telegramUsername: user?.username || user?.firstName || "unknown",
				// Remove photos file objects (can't serialize to JSON)
				photos: formData.photos.map((p) => ({
					id: p.id,
					type: p.type,
				})),
			};

			// Submit to API
			const response = await fetch("/api/submit", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(submissionData),
			});

			if (!response.ok) {
				throw new Error("Submission failed");
			}

			console.log("Form submitted successfully");
			triggerHaptic("success");
			setIsSubmitted(true);
		} catch (error) {
			console.error("Submission failed:", error);
			triggerHaptic("error");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleNewForm = () => {
		triggerHaptic("light");
		setFormData(initialFormData);
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
						{user?.username && (
							<p className="text-muted-foreground text-xs mt-1">
								{t.common.submittedBy} @{user.username}
							</p>
						)}
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
		<div className="min-h-screen bg-muted/30 pb-24">
			{/* Header */}
			<header className="bg-primary text-primary-foreground px-4 py-5">
				<div className="flex items-center gap-3">
					<div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
						<Wheat className="w-5 h-5" />
					</div>
					<div className="flex-1">
						<h1 className="text-lg font-bold">{t.header.title}</h1>
						<p className="text-sm text-primary-foreground/80">
							{t.header.subtitle}
						</p>
					</div>
					<button
						type="button"
						onClick={() => {
							triggerHaptic("light");
							setLanguage(language === "en" ? "km" : "en");
						}}
						className="px-3 py-1.5 rounded-lg bg-white/20 text-sm font-medium hover:bg-white/30 transition-colors"
					>
						{language === "en" ? "🇰🇭 ខ្មែរ" : "🇬🇧 EN"}
					</button>
				</div>
			</header>

			{/* Form Content */}
			<main className="px-4 py-4 space-y-4">
				<BasicInfoSection data={formData} onChange={updateFormData} />
				<GrowthWaterSection data={formData} onChange={updateFormData} />
				<HealthSection data={formData} onChange={updateFormData} />
				<TreatmentsSection data={formData} onChange={updateFormData} />
				<StressPhotoSection data={formData} onChange={updateFormData} />
			</main>

			{/* Submit Button */}
			<div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-border">
				<Button
					onClick={handleSubmit}
					disabled={isSubmitting}
					className="w-full h-12 rounded-xl font-semibold gap-2"
				>
					{isSubmitting ? (
						<>
							<Loader2 className="w-5 h-5 animate-spin" />
							{t.common.submitting}
						</>
					) : (
						<>
							<Send className="w-5 h-5" />
							{t.common.submit}
						</>
					)}
				</Button>
			</div>
		</div>
	);
}
