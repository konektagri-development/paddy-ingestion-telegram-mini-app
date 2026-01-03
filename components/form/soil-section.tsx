"use client";

import { Layers } from "lucide-react";
import { SectionCard } from "@/components/form/section-card";
import { CheckboxGroup } from "@/components/ui/checkbox-group";
import type { FormData } from "@/lib/form-types";
import { useLanguage } from "@/lib/i18n/language-context";

interface SoilSectionProps {
	data: FormData;
	onChange: (data: Partial<FormData>) => void;
}

export function SoilSection({ data, onChange }: SoilSectionProps) {
	const { t } = useLanguage();

	const SOIL_ROUGHNESS_OPTIONS = [
		{ value: "smooth", label: t.sections.soil.smooth },
		{ value: "medium", label: t.sections.soil.medium },
		{ value: "rough", label: t.sections.soil.rough },
	];

	return (
		<SectionCard
			id="section-soil"
			icon={Layers}
			title={t.sections.soil.title}
			description={t.sections.soil.description}
		>
			<div className="space-y-2">
				<CheckboxGroup
					name="soilRoughness"
					options={SOIL_ROUGHNESS_OPTIONS}
					value={data.soilRoughness}
					onChange={(val) =>
						onChange({ soilRoughness: val as FormData["soilRoughness"] })
					}
				/>
			</div>
		</SectionCard>
	);
}
