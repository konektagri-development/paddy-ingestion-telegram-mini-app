"use client";

import { AlertOctagon, Check } from "lucide-react";
import { SectionCard } from "@/components/form/section-card";
import { triggerHaptic } from "@/components/telegram-provider";
import { ConditionalInput } from "@/components/ui/conditional-input";
import type { FormData, StressEvents } from "@/lib/form-types";
import { useLanguage } from "@/lib/i18n/language-context";
import { cn } from "@/lib/utils";

interface StressSectionProps {
	data: FormData;
	onChange: (data: Partial<FormData>) => void;
}

export function StressSection({ data, onChange }: StressSectionProps) {
	const { t } = useLanguage();

	const STRESS_OPTIONS = [
		{ key: "flood", label: t.sections.stress.flood },
		{ key: "drought", label: t.sections.stress.drought },
		{ key: "other", label: t.common.other },
		{ key: "none", label: t.sections.problems.none },
	] as const;

	const handleStressToggle = (key: keyof StressEvents) => {
		triggerHaptic("light");

		if (key === "none") {
			onChange({
				stressEvents: {
					...data.stressEvents,
					flood: false,
					drought: false,
					none: !data.stressEvents.none,
					other: false,
					otherDescription: "",
				},
			});
		} else {
			onChange({
				stressEvents: {
					...data.stressEvents,
					none: false,
					[key]: !data.stressEvents[key],
				},
			});
		}
	};

	const handleOtherDescription = (value: string) => {
		onChange({
			stressEvents: {
				...data.stressEvents,
				otherDescription: value,
			},
		});
	};

	return (
		<SectionCard
			icon={AlertOctagon}
			title={t.sections.stress.title}
			description={t.sections.stress.description}
		>
			<div className="space-y-2">
				{STRESS_OPTIONS.map((option) => {
					const isSelected =
						data.stressEvents[option.key as keyof StressEvents];

					return (
						<div key={option.key}>
							<button
								type="button"
								onClick={() =>
									handleStressToggle(option.key as keyof StressEvents)
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

							{option.key === "other" && (
								<ConditionalInput
									show={!!isSelected}
									value={data.stressEvents.otherDescription || ""}
									onChange={handleOtherDescription}
									placeholder={t.sections.stress.describePlaceholder}
								/>
							)}
						</div>
					);
				})}
			</div>
		</SectionCard>
	);
}
