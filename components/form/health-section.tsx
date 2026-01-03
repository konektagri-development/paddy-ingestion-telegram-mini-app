"use client";

import { Heart } from "lucide-react";
import { SectionCard } from "@/components/form/section-card";
import { CheckboxGroup } from "@/components/ui/checkbox-group";
import type { FormData } from "@/lib/form-types";
import { useLanguage } from "@/lib/i18n/language-context";

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

	return (
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
					label: opt.label,
					description: opt.description,
				}))}
				value={data.overallHealth}
				onChange={(val) =>
					onChange({ overallHealth: val as FormData["overallHealth"] })
				}
			/>
		</SectionCard>
	);
}
