"use client";

import { Check, Layers } from "lucide-react";
import Image from "next/image";
import { SectionCard } from "@/components/form/section-card";
import { triggerHaptic } from "@/components/telegram-provider";
import type { FormData, SoilRoughness } from "@/lib/form-types";
import { useLanguage } from "@/lib/i18n/language-context";
import { cn } from "@/lib/utils";

interface SoilSectionProps {
	data: FormData;
	onChange: (data: Partial<FormData>) => void;
}

// Type-safe mapping of soil roughness values to images
const SOIL_IMAGES: Record<SoilRoughness, string> = {
	smooth: "/images/soil/smooth.jpeg",
	medium: "/images/soil/medium.jpeg",
	rough: "/images/soil/rough.jpeg",
};

export function SoilSection({ data, onChange }: SoilSectionProps) {
	const { t } = useLanguage();

	// Using SoilRoughness type ensures values match the FormData type
	const SOIL_ROUGHNESS_OPTIONS: Array<{
		value: SoilRoughness;
		label: string;
		image: string;
	}> = [
		{
			value: "smooth",
			label: t.sections.soil.smooth,
			image: SOIL_IMAGES.smooth,
		},
		{
			value: "medium",
			label: t.sections.soil.medium,
			image: SOIL_IMAGES.medium,
		},
		{
			value: "rough",
			label: t.sections.soil.rough,
			image: SOIL_IMAGES.rough,
		},
	];

	return (
		<SectionCard
			id="section-soil"
			icon={Layers}
			title={t.sections.soil.title}
			description={t.sections.soil.description}
		>
			<div className="grid grid-cols-3 gap-3">
				{SOIL_ROUGHNESS_OPTIONS.map((option) => {
					const isSelected = data.soilRoughness === option.value;
					return (
						<div
							key={option.value}
							onClick={() => {
								triggerHaptic("light");
								onChange({ soilRoughness: option.value });
							}}
							onKeyDown={(e) => {
								if (e.key === "Enter" || e.key === " ") {
									e.preventDefault();
									onChange({ soilRoughness: option.value });
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
							{/* Image */}
							<div className="aspect-square relative w-full bg-muted">
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
							<div className="p-2 text-center">
								<h4
									className={cn(
										"font-medium text-sm leading-tight",
										isSelected ? "text-primary" : "text-foreground",
									)}
								>
									{option.label}
								</h4>
							</div>
						</div>
					);
				})}
			</div>
		</SectionCard>
	);
}
