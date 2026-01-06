"use client";

import { Check, Leaf } from "lucide-react";
import { SectionCard } from "@/components/form/section-card";
import { triggerHaptic } from "@/components/telegram-provider";
import { CheckboxGroup } from "@/components/ui/checkbox-group";
import { ConditionalInput } from "@/components/ui/conditional-input";
import { useYesNoRememberOptions } from "@/lib/form-options";
import type { FormData, YesNoRemember } from "@/lib/form-types";
import { useLanguage } from "@/lib/i18n/language-context";
import { cn } from "@/lib/utils";

interface FertilizerSectionProps {
	data: FormData;
	onChange: (data: Partial<FormData>) => void;
}

export function FertilizerSection({ data, onChange }: FertilizerSectionProps) {
	const { t } = useLanguage();
	const yesNoRememberOptions = useYesNoRememberOptions();

	const FERTILIZER_TYPES = [
		{ key: "urea", label: t.sections.treatments.urea },
		{ key: "npk", label: t.sections.treatments.npk },
		{ key: "organic", label: t.sections.treatments.organic },
		{ key: "other", label: t.common.other },
	] as const;

	const handleFertilizerUsedChange = (val: string) => {
		onChange({
			fertilizer: {
				...data.fertilizer,
				used: val as YesNoRemember,
				types: val === "yes" ? data.fertilizer.types : undefined,
			},
		});
	};

	const handleFertilizerTypeToggle = (key: string) => {
		triggerHaptic("light");
		const currentTypes = data.fertilizer.types || {
			urea: false,
			npk: false,
			organic: false,
			other: false,
			otherType: "",
		};

		onChange({
			fertilizer: {
				...data.fertilizer,
				types: {
					...currentTypes,
					[key]: !currentTypes[key as keyof typeof currentTypes],
				},
			},
		});
	};

	const handleFertilizerOtherType = (value: string) => {
		const currentTypes = data.fertilizer.types ?? {
			urea: false,
			npk: false,
			organic: false,
			other: false,
			otherType: "",
		};
		onChange({
			fertilizer: {
				...data.fertilizer,
				types: {
					...currentTypes,
					otherType: value,
				},
			},
		});
	};

	return (
		<SectionCard
			id="section-fertilizer"
			icon={Leaf}
			title={t.sections.treatments.fertilizerTitle}
			description={t.sections.treatments.fertilizerDescription}
		>
			<div className="space-y-4">
				<CheckboxGroup
					name="fertilizerUsed"
					options={yesNoRememberOptions}
					value={data.fertilizer.used}
					onChange={(val) => handleFertilizerUsedChange(val as string)}
				/>

				{/* Conditional: Fertilizer Types - only render when "yes" */}
				{data.fertilizer.used === "yes" && (
					<div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
						<span className="block text-sm font-medium text-foreground">
							{t.sections.treatments.typeUsed}
						</span>
						<div className="space-y-2">
							{FERTILIZER_TYPES.map((type) => {
								const isSelected =
									data.fertilizer.types?.[
										type.key as keyof typeof data.fertilizer.types
									];

								return (
									<div key={type.key}>
										<button
											type="button"
											onClick={() => handleFertilizerTypeToggle(type.key)}
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
												{type.label}
											</span>
										</button>

										{type.key === "other" && (
											<ConditionalInput
												show={!!isSelected}
												value={data.fertilizer.types?.otherType || ""}
												onChange={handleFertilizerOtherType}
												placeholder={
													t.sections.treatments.fertilizerPlaceholder
												}
											/>
										)}
									</div>
								);
							})}
						</div>
					</div>
				)}
			</div>
		</SectionCard>
	);
}
