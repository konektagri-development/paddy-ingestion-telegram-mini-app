"use client";

import { CloudRain } from "lucide-react";
import { SectionCard } from "@/components/form/section-card";
import { CheckboxGroup } from "@/components/ui/checkbox-group";
import type { FormData } from "@/lib/form-types";
import { useLanguage } from "@/lib/i18n/language-context";

interface RainfallSectionProps {
	data: FormData;
	onChange: (data: Partial<FormData>) => void;
}

export function RainfallSection({ data, onChange }: RainfallSectionProps) {
	const { t } = useLanguage();

	const RAINFALL_OPTIONS = [
		{ value: "heavy", label: t.sections.rainfall.heavy },
		{ value: "moderate", label: t.sections.rainfall.moderate },
		{ value: "low", label: t.sections.rainfall.low },
	];

	return (
		<SectionCard
			id="section-rainfall"
			icon={CloudRain}
			title={t.sections.rainfall.title}
			description={t.sections.rainfall.description}
		>
			<div className="space-y-4">
				<CheckboxGroup
					name="rainfall"
					options={[
						{ value: "yes", label: t.common.yes },
						{ value: "no", label: t.common.no },
					]}
					value={
						data.rainfall2days === null
							? null
							: data.rainfall2days
								? "yes"
								: "no"
					}
					onChange={(val) =>
						onChange({
							rainfall2days: val === "yes",
							rainfallIntensity:
								val === "no" ? undefined : data.rainfallIntensity,
						})
					}
				/>

				{/* Conditional: Rainfall Intensity - only render when "yes" */}
				{data.rainfall2days && (
					<div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
						<label className="block text-sm font-medium text-foreground">
							{t.sections.rainfall.intensity}
						</label>
						<CheckboxGroup
							name="rainfallIntensity"
							options={RAINFALL_OPTIONS}
							value={data.rainfallIntensity || null}
							onChange={(val) =>
								onChange({
									rainfallIntensity: val as FormData["rainfallIntensity"],
								})
							}
						/>
					</div>
				)}
			</div>
		</SectionCard>
	);
}
