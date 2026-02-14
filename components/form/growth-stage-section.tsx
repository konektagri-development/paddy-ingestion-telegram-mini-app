"use client";

import { Check, Sprout } from "lucide-react";
import Image from "next/image";
import { SectionCard } from "@/components/form/section-card";
import { triggerHaptic } from "@/components/telegram-provider";
import { DateInput } from "@/components/ui/Date input";
import type { FormData, GrowthStage } from "@/lib/form-types";
import { useLanguage } from "@/lib/i18n/language-context";
import { cn } from "@/lib/utils";

interface GrowthStageSectionProps {
	data: FormData;
	onChange: (data: Partial<FormData>) => void;
}

// Type-safe mapping of growth stage values to images
const GROWTH_STAGE_IMAGES: Record<GrowthStage, string> = {
	landPrep: "/images/growth/land_prep.jpeg",
	recentlyTransplanted: "/images/growth/seedling.jpeg",
	tilleringOnset: "/images/growth/tillering.jpeg",
	flowering: "/images/growth/flowering.jpeg",
	ripening: "/images/growth/ripening.jpeg",
	harvestReady: "/images/growth/harvest.jpeg",
	fallow: "/images/growth/fallow.jpeg",
};

export function GrowthStageSection({
	data,
	onChange,
}: GrowthStageSectionProps) {
	const { t } = useLanguage();

	// Using GrowthStage type ensures values match the FormData type
	const GROWTH_STAGES: Array<{
		value: GrowthStage;
		label: string;
		description: string;
		image: string;
		hasDateInput?: boolean;
		dateInputLabel?: string;
	}> = [
		{
			value: "landPrep",
			label: t.sections.growth.landPrep.label,
			description: t.sections.growth.landPrep.description,
			image: GROWTH_STAGE_IMAGES.landPrep,
		},
		{
			value: "recentlyTransplanted",
			label: t.sections.growth.recentlyTransplanted.label,
			description: t.sections.growth.recentlyTransplanted.description,
			image: GROWTH_STAGE_IMAGES.recentlyTransplanted,
			hasDateInput: true,
			dateInputLabel: "Transplant date",
		},
		{
			value: "tilleringOnset",
			label: t.sections.growth.tilleringOnset.label,
			description: t.sections.growth.tilleringOnset.description,
			image: GROWTH_STAGE_IMAGES.tilleringOnset,
		},
		{
			value: "flowering",
			label: t.sections.growth.flowering.label,
			description: t.sections.growth.flowering.description,
			image: GROWTH_STAGE_IMAGES.flowering,
		},
		{
			value: "ripening",
			label: t.sections.growth.ripening.label,
			description: t.sections.growth.ripening.description,
			image: GROWTH_STAGE_IMAGES.ripening,
		},
		{
			value: "harvestReady",
			label: t.sections.growth.harvestReady.label,
			description: t.sections.growth.harvestReady.description,
			image: GROWTH_STAGE_IMAGES.harvestReady,
		},
		{
			value: "fallow",
			label: t.sections.growth.fallow.label,
			description: t.sections.growth.fallow.description,
			image: GROWTH_STAGE_IMAGES.fallow,
			hasDateInput: true,
			dateInputLabel: "Fallow start date",
		},
	];

	const handleDateChange = (field: string, value: string) => {
		onChange({
			[field]: value,
		});
	};

	return (
		<SectionCard
			id="section-growth"
			icon={Sprout}
			title={t.sections.growth.title}
			description={t.sections.growth.description}
		>
			<div className="grid grid-cols-2 gap-3">
				{GROWTH_STAGES.map((option) => {
					const isSelected = data.growthStage === option.value;
					return (
						<div key={option.value} className="flex flex-col">
							<div
								onClick={() => {
									triggerHaptic("light");
									onChange({ growthStage: option.value });
								}}
								onKeyDown={(e) => {
									if (e.key === "Enter" || e.key === " ") {
										e.preventDefault();
										onChange({ growthStage: option.value });
									}
								}}
								role="button"
								tabIndex={0}
								className={cn(
									"relative group cursor-pointer rounded-xl border-2 transition-all duration-200 overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
									isSelected
										? "border-primary bg-primary/5 shadow-md"
										: "border-border hover:border-primary/50 hover:shadow-sm",
								)}
							>
								{/* Image with gradient overlay */}
								<div className="aspect-[4/3] relative w-full bg-muted">
									<Image
										src={option.image}
										alt={option.label}
										fill
										className="object-cover"
									/>
									{/* Active overlay */}
									<div
										className={cn(
											"absolute inset-0 transition-opacity duration-200",
											isSelected
												? "bg-primary/10"
												: "opacity-0 group-hover:bg-black/5",
										)}
									/>

									{/* Check indicator */}
									{isSelected && (
										<div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1 shadow-sm animate-in zoom-in-50">
											<Check className="w-3 h-3" strokeWidth={3} />
										</div>
									)}
								</div>

								{/* Content */}
								<div className="p-3">
									<h4
										className={cn(
											"font-medium text-sm leading-tight mb-1",
											isSelected ? "text-primary" : "text-foreground",
										)}
									>
										{option.label}
									</h4>
									<p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
										{option.description}
									</p>
								</div>
							</div>

							{/* Date input for specific growth stages */}
							{option.hasDateInput && isSelected && (
								<DateInput
									value={
										option.value === "recentlyTransplanted"
											? data.transplantDate || ""
											: data.fallowStartDate || ""
									}
									onChange={(value) =>
										handleDateChange(
											option.value === "recentlyTransplanted"
												? "transplantDate"
												: "fallowStartDate",
											value,
										)
									}
									placeholder={option.dateInputLabel}
								/>
							)}
						</div>
					);
				})}
			</div>
		</SectionCard>
	);
}