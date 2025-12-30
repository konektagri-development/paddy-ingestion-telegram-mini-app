"use client";

import { AlertTriangle, Check, Heart } from "lucide-react";
import { CheckboxGroup } from "@/components/ui/checkbox-group";
import { ConditionalInput } from "@/components/ui/conditional-input";
import type { FormData, VisibleProblems } from "@/lib/form-types";
import { useLanguage } from "@/lib/i18n/language-context";
import { cn } from "@/lib/utils";
import { triggerHaptic } from "../telegram-provider";

interface StepHealthProps {
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

export function HealthSection({ data, onChange }: StepHealthProps) {
	const { t } = useLanguage();

	const HEALTH_OPTIONS = [
		{
			value: "excellent",
			label: t.sections.health.excellent.label,
			description: t.sections.health.excellent.description,
		},
		{
			value: "good",
			label: t.sections.health.good.label,
			description: t.sections.health.good.description,
		},
		{
			value: "fair",
			label: t.sections.health.fair.label,
			description: t.sections.health.fair.description,
		},
		{
			value: "poor",
			label: t.sections.health.poor.label,
			description: t.sections.health.poor.description,
		},
	];

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
		<div className="space-y-4">
			{/* Overall Health */}
			<SectionCard
				id="section-health"
				icon={Heart}
				title={t.sections.health.title}
				description={t.sections.health.description}
			>
				<CheckboxGroup
					name="overallHealth"
					options={HEALTH_OPTIONS.map((opt) => ({
						value: opt.value,
						label: opt.label, // Use opt.label directly if HEALTH_OPTIONS are not translated yet; assuming they stay static for now or need similar refactor
						description: opt.description,
					}))}
					value={data.overallHealth}
					onChange={(val) =>
						onChange({ overallHealth: val as FormData["overallHealth"] })
					}
				/>
			</SectionCard>

			{/* Visible Problems */}
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
		</div>
	);
}
