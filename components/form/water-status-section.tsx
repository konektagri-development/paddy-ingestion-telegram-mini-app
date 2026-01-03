"use client";

import { Droplets } from "lucide-react";
import { SectionCard } from "@/components/form/section-card";
import { CheckboxGroup } from "@/components/ui/checkbox-group";
import type { FormData } from "@/lib/form-types";
import { useLanguage } from "@/lib/i18n/language-context";

interface WaterStatusSectionProps {
	data: FormData;
	onChange: (data: Partial<FormData>) => void;
}

export function WaterStatusSection({
	data,
	onChange,
}: WaterStatusSectionProps) {
	const { t } = useLanguage();

	const WATER_STATUS_OPTIONS = [
		{
			value: "flooded",
			label: t.sections.water.alwaysFlooded.label,
			description: t.sections.water.alwaysFlooded.description,
		},
		{
			value: "saturated",
			label: t.sections.water.mostlyWet.label,
			description: t.sections.water.mostlyWet.description,
		},
		{
			value: "dry",
			label: t.sections.water.frequentlyDry.label,
			description: t.sections.water.frequentlyDry.description,
		},
		{
			value: "very_dry",
			label: t.sections.water.veryDry.label,
			description: t.sections.water.veryDry.description,
		},
	];

	return (
		<SectionCard
			id="section-water"
			icon={Droplets}
			title={t.sections.water.title}
			description={t.sections.water.description}
		>
			<CheckboxGroup
				name="waterStatus"
				options={WATER_STATUS_OPTIONS}
				value={data.waterStatus}
				onChange={(val) =>
					onChange({ waterStatus: val as FormData["waterStatus"] })
				}
			/>
		</SectionCard>
	);
}
