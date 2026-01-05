"use client";

import { Check, Heart } from "lucide-react";
import Image from "next/image";
import { SectionCard } from "@/components/form/section-card";
import { triggerHaptic } from "@/components/telegram-provider";
import type { FormData } from "@/lib/form-types";
import { useLanguage } from "@/lib/i18n/language-context";
import { cn } from "@/lib/utils";

interface HealthSectionProps {
	data: FormData;
	onChange: (data: Partial<FormData>) => void;
}

export function HealthSection({ data, onChange }: HealthSectionProps) {
	const { t } = useLanguage();

	const HEALTH_OPTIONS = [
		{
			value: "excellent",
			label: t.sections.health.excellent.label,
			description: t.sections.health.excellent.description,
			image: "/images/health/excellent.jpeg",
		},
		{
			value: "good",
			label: t.sections.health.good.label,
			description: t.sections.health.good.description,
			image: "/images/health/good.jpeg",
		},
		{
			value: "fair",
			label: t.sections.health.fair.label,
			description: t.sections.health.fair.description,
			image: "/images/health/fair.jpeg",
		},
		{
			value: "poor",
			label: t.sections.health.poor.label,
			description: t.sections.health.poor.description,
			image: "/images/health/poor.jpeg",
		},
	];

	return (
		<SectionCard
			id="section-health"
			icon={Heart}
			title={t.sections.health.title}
			description={t.sections.health.description}
		>
			<div className="grid grid-cols-2 gap-3">
				{HEALTH_OPTIONS.map((option) => {
					const isSelected = data.overallHealth === option.value;
					return (
						<div
							key={option.value}
							onClick={() => {
								triggerHaptic("light");
								onChange({
									overallHealth: option.value as FormData["overallHealth"],
								});
							}}
							onKeyDown={(e) => {
								if (e.key === "Enter" || e.key === " ") {
									e.preventDefault();
									onChange({
										overallHealth: option.value as FormData["overallHealth"],
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
