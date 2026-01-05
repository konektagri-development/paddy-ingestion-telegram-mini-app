"use client";

import { Check, Layers } from "lucide-react";
import Image from "next/image";
import { SectionCard } from "@/components/form/section-card";
import { triggerHaptic } from "@/components/telegram-provider";
import type { FormData } from "@/lib/form-types";
import { useLanguage } from "@/lib/i18n/language-context";
import { cn } from "@/lib/utils";

interface SoilSectionProps {
	data: FormData;
	onChange: (data: Partial<FormData>) => void;
}

export function SoilSection({ data, onChange }: SoilSectionProps) {
	const { t } = useLanguage();

	const SOIL_ROUGHNESS_OPTIONS = [
		{
			value: "smooth",
			label: t.sections.soil.smooth,
			image: "/images/soil/smooth.jpeg",
		},
		{
			value: "medium",
			label: t.sections.soil.medium,
			image: "/images/soil/medium.jpeg",
		},
		{
			value: "rough",
			label: t.sections.soil.rough,
			image: "/images/soil/rough.jpeg",
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
								onChange({
									soilRoughness: option.value as FormData["soilRoughness"],
								});
							}}
							onKeyDown={(e) => {
								if (e.key === "Enter" || e.key === " ") {
									e.preventDefault();
									onChange({
										soilRoughness: option.value as FormData["soilRoughness"],
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
