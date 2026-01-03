"use client";

import { Check, Sprout } from "lucide-react";
import Image from "next/image";
import { SectionCard } from "@/components/form/section-card";
import { triggerHaptic } from "@/components/telegram-provider";
import type { FormData } from "@/lib/form-types";
import { useLanguage } from "@/lib/i18n/language-context";
import { cn } from "@/lib/utils";

interface GrowthStageSectionProps {
	data: FormData;
	onChange: (data: Partial<FormData>) => void;
}

export function GrowthStageSection({
	data,
	onChange,
}: GrowthStageSectionProps) {
	const { t } = useLanguage();

	const GROWTH_STAGES = [
		{
			value: "land_preparation",
			label: t.sections.growth.landPrep.label,
			description: t.sections.growth.landPrep.description,
			image: "/images/growth/land_prep.jpeg",
		},
		{
			value: "seedling",
			label: t.sections.growth.recentlyTransplanted.label,
			description: t.sections.growth.recentlyTransplanted.description,
			image: "/images/growth/seedling.jpeg",
		},
		{
			value: "tillering",
			label: t.sections.growth.tilleringOnset.label,
			description: t.sections.growth.tilleringOnset.description,
			image: "/images/growth/tillering.jpeg",
		},
		{
			value: "flowering",
			label: t.sections.growth.flowering.label,
			description: t.sections.growth.flowering.description,
			image: "/images/growth/flowering.jpeg",
		},
		{
			value: "ripening",
			label: t.sections.growth.ripening.label,
			description: t.sections.growth.ripening.description,
			image: "/images/growth/ripening.jpeg",
		},
		{
			value: "harvest_ready",
			label: t.sections.growth.harvestReady.label,
			description: t.sections.growth.harvestReady.description,
			image: "/images/growth/harvest.jpeg",
		},
		{
			value: "fallow",
			label: t.sections.growth.fallow.label,
			description: t.sections.growth.fallow.description,
			image: "/images/growth/fallow.jpeg",
		},
	];

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
						<div
							key={option.value}
							onClick={() => {
								triggerHaptic("light");
								onChange({
									growthStage: option.value as FormData["growthStage"],
								});
							}}
							onKeyDown={(e) => {
								if (e.key === "Enter" || e.key === " ") {
									e.preventDefault();
									onChange({
										growthStage: option.value as FormData["growthStage"],
									});
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
					);
				})}
			</div>
		</SectionCard>
	);
}
