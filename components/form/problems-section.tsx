"use client";

import { AlertTriangle, Check } from "lucide-react";
import Image from "next/image";
import { SectionCard } from "@/components/form/section-card";
import { triggerHaptic } from "@/components/telegram-provider";
import { ConditionalInput } from "@/components/ui/conditional-input";
import type { FormData, VisibleProblems } from "@/lib/form-types";
import { useLanguage } from "@/lib/i18n/language-context";
import { cn } from "@/lib/utils";

interface ProblemsSectionProps {
	data: FormData;
	onChange: (data: Partial<FormData>) => void;
}

export function ProblemsSection({ data, onChange }: ProblemsSectionProps) {
	const { t } = useLanguage();

	const PROBLEM_OPTIONS = [
		{
			key: "yellowing",
			label: t.sections.problems.yellowing,
			hasInput: true,
			inputLabel: t.sections.problems.yellowingPlaceholder,
			image: "/images/problems/yellowing.jpeg",
		},
		{
			key: "brownSpots",
			label: t.sections.problems.brownSpots,
			hasInput: false,
			image: "/images/problems/brown_spots.jpeg",
		},
		{
			key: "wilting",
			label: t.sections.problems.wilting,
			hasInput: false,
			image: "/images/problems/wilting.jpeg",
		},
		{
			key: "lodging",
			label: t.sections.problems.lodging,
			hasInput: false,
			image: "/images/problems/lodging.jpeg",
		},
		{
			key: "pestDamage",
			label: t.sections.problems.pestDamage,
			hasInput: true,
			inputLabel: t.sections.problems.pestPlaceholder,
			image: "/images/problems/pest_damage.jpeg",
		},
		{
			key: "weedInfestation",
			label: t.sections.problems.weedInfestation,
			hasInput: false,
			image: "/images/problems/weed_infestation.jpeg",
		},
		{
			key: "unevenGrowth",
			label: t.sections.problems.unevenGrowth,
			hasInput: false,
			image: "/images/problems/uneven_growth.jpeg",
		},
		{
			key: "other",
			label: t.common.other,
			hasInput: true,
			inputLabel: t.sections.problems.otherPlaceholder,
			image: "/images/problems/other.jpeg",
		},
		{
			key: "none",
			label: t.sections.problems.none,
			hasInput: false,
			image: "/images/problems/none.jpeg",
		},
	] as const;

	const handleProblemToggle = (key: keyof VisibleProblems) => {
		triggerHaptic("light");

		if (key === "none") {
			onChange({
				visibleProblems: {
					...data.visibleProblems,
					none: !data.visibleProblems.none,
					yellowing: false,
					brownSpots: false,
					wilting: false,
					lodging: false,
					pestDamage: false,
					weedInfestation: false,
					unevenGrowth: false,
					other: false,
				},
			});
		} else {
			onChange({
				visibleProblems: {
					...data.visibleProblems,
					none: false,
					[key]: !data.visibleProblems[key],
				},
			});
		}
	};

	const handleInputChange = (field: string, value: string) => {
		onChange({
			visibleProblems: {
				...data.visibleProblems,
				[field]: value,
			},
		});
	};

	return (
		<SectionCard
			icon={AlertTriangle}
			title={t.sections.health.problemsTitle}
			description={t.sections.health.problemsDescription}
		>
			<div className="grid grid-cols-3 gap-3">
				{PROBLEM_OPTIONS.map((option) => {
					const isSelected =
						data.visibleProblems[option.key as keyof VisibleProblems];

					return (
						<div key={option.key} className="flex flex-col">
							<div
								onClick={() =>
									handleProblemToggle(option.key as keyof VisibleProblems)
								}
								onKeyDown={(e) => {
									if (e.key === "Enter" || e.key === " ") {
										e.preventDefault();
										handleProblemToggle(option.key as keyof VisibleProblems);
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
											"font-medium text-xs leading-tight",
											isSelected ? "text-primary" : "text-foreground",
										)}
									>
										{option.label}
									</h4>
								</div>
							</div>

							{option.hasInput && isSelected && (
								<ConditionalInput
									show={true}
									value={
										option.key === "yellowing"
											? data.visibleProblems.yellowingLocation || ""
											: option.key === "pestDamage"
												? data.visibleProblems.pestType || ""
												: data.visibleProblems.otherDescription || ""
									}
									onChange={(value) =>
										handleInputChange(
											option.key === "yellowing"
												? "yellowingLocation"
												: option.key === "pestDamage"
													? "pestType"
													: "otherDescription",
											value,
										)
									}
									placeholder={option.inputLabel}
								/>
							)}
						</div>
					);
				})}
			</div>
		</SectionCard>
	);
}
