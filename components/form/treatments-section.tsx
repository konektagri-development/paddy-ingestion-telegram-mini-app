"use client";

import { Beaker, Bug, Check, Leaf } from "lucide-react";
import { CheckboxGroup } from "@/components/ui/checkbox-group";
import { ConditionalInput } from "@/components/ui/conditional-input";
import type { FormData } from "@/lib/form-types";
import { useLanguage } from "@/lib/i18n/language-context";
import { cn } from "@/lib/utils";
import { triggerHaptic } from "../telegram-provider";

interface StepInputsProps {
	data: FormData;
	onChange: (data: Partial<FormData>) => void;
}

function SectionCard({
	icon: Icon,
	title,
	description,
	children,
	id,
}: {
	icon: React.ElementType;
	title: string;
	description: string;
	children: React.ReactNode;
	id?: string;
}) {
	return (
		<div
			id={id}
			className="bg-white rounded-2xl shadow-sm border border-border/50 overflow-hidden transition-all"
		>
			<div className="p-4 border-b border-border/50">
				<div className="flex items-center gap-3">
					<div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
						<Icon className="w-5 h-5 text-primary" />
					</div>
					<div>
						<h3 className="font-semibold text-foreground">
							{title} <span className="text-destructive">*</span>
						</h3>
						<p className="text-sm text-muted-foreground">{description}</p>
					</div>
				</div>
			</div>
			<div className="p-4">{children}</div>
		</div>
	);
}

export function TreatmentsSection({ data, onChange }: StepInputsProps) {
	const { t } = useLanguage();

	const YES_NO_REMEMBER_OPTIONS = [
		{ value: "yes", label: t.common.yes },
		{ value: "no", label: t.common.no },
		{ value: "dontRemember", label: t.common.dontRemember },
	];

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
				used: val as FormData["fertilizer"]["used"],
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
		<div className="space-y-4">
			{/* Fertilizer */}
			<SectionCard
				id="section-fertilizer"
				icon={Leaf}
				title={t.sections.treatments.fertilizerTitle}
				description={t.sections.treatments.fertilizerDescription}
			>
				<div className="space-y-4">
					<CheckboxGroup
						name="fertilizerUsed"
						options={YES_NO_REMEMBER_OPTIONS}
						value={data.fertilizer.used}
						onChange={(val) => handleFertilizerUsedChange(val as string)}
					/>

					{/* Conditional: Fertilizer Types */}
					<div
						className={cn(
							"overflow-hidden transition-all duration-300",
							data.fertilizer.used === "yes"
								? "max-h-96 opacity-100"
								: "max-h-0 opacity-0",
						)}
					>
						<div className="pt-2 space-y-2">
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
					</div>
				</div>
			</SectionCard>

			{/* Herbicide */}
			<SectionCard
				id="section-herbicide"
				icon={Beaker}
				title={t.sections.treatments.herbicideTitle}
				description={t.sections.treatments.herbicideDescription}
			>
				<CheckboxGroup
					name="herbicide"
					options={YES_NO_REMEMBER_OPTIONS}
					value={data.herbicide}
					onChange={(val) =>
						onChange({ herbicide: val as FormData["herbicide"] })
					}
				/>
			</SectionCard>

			{/* Pesticide */}
			<SectionCard
				id="section-pesticide"
				icon={Bug}
				title={t.sections.treatments.pesticideTitle}
				description={t.sections.treatments.pesticideDescription}
			>
				<CheckboxGroup
					name="pesticide"
					options={YES_NO_REMEMBER_OPTIONS}
					value={data.pesticide}
					onChange={(val) =>
						onChange({ pesticide: val as FormData["pesticide"] })
					}
				/>
			</SectionCard>
		</div>
	);
}
