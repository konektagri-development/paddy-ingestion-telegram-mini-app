"use client";

import { AlertTriangle, Check } from "lucide-react";
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
		},
		{
			key: "brownSpots",
			label: t.sections.problems.brownSpots,
			hasInput: false,
		},
		{ key: "wilting", label: t.sections.problems.wilting, hasInput: false },
		{ key: "lodging", label: t.sections.problems.lodging, hasInput: false },
		{
			key: "pestDamage",
			label: t.sections.problems.pestDamage,
			hasInput: true,
			inputLabel: t.sections.problems.pestPlaceholder,
		},
		{
			key: "weedInfestation",
			label: t.sections.problems.weedInfestation,
			hasInput: false,
		},
		{
			key: "unevenGrowth",
			label: t.sections.problems.unevenGrowth,
			hasInput: false,
		},
		{
			key: "other",
			label: t.common.other,
			hasInput: true,
			inputLabel: t.sections.problems.otherPlaceholder,
		},
		{ key: "none", label: t.sections.problems.none, hasInput: false },
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
			<div className="space-y-2">
				{PROBLEM_OPTIONS.map((option) => {
					const isSelected =
						data.visibleProblems[option.key as keyof VisibleProblems];

					return (
						<div key={option.key}>
							<button
								type="button"
								onClick={() =>
									handleProblemToggle(option.key as keyof VisibleProblems)
								}
								className={cn(
									"flex items-center gap-3 w-full p-3 rounded-xl border transition-all text-left",
									isSelected
										? "border-primary bg-primary/5"
										: "border-border hover:border-primary/50 hover:bg-muted/50",
								)}
							>
								<div
									className={cn(
										"w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all",
										isSelected
											? "border-primary bg-primary"
											: "border-muted-foreground/30",
									)}
								>
									{isSelected && (
										<Check
											className="w-3 h-3 text-primary-foreground"
											strokeWidth={3}
										/>
									)}
								</div>
								<span
									className={cn(
										"font-medium text-sm",
										isSelected ? "text-primary" : "text-foreground",
									)}
								>
									{option.label}
								</span>
							</button>

							{option.hasInput && (
								<ConditionalInput
									show={!!isSelected}
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
