"use client";

import { Droplets, Sprout } from "lucide-react";
import { CheckboxGroup } from "@/components/ui/checkbox-group";
import type { FormData } from "@/lib/form-types";
import { useLanguage } from "@/lib/i18n/language-context";

interface StepGrowthWaterProps {
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

export function GrowthWaterSection({ data, onChange }: StepGrowthWaterProps) {
	const { t } = useLanguage();

	const GROWTH_STAGES = [
		{
			value: "landPrep",
			label: t.sections.growth.landPrep.label,
			description: t.sections.growth.landPrep.description,
		},
		{
			value: "recentlyTransplanted",
			label: t.sections.growth.recentlyTransplanted.label,
			description: t.sections.growth.recentlyTransplanted.description,
		},
		{
			value: "tilleringOnset",
			label: t.sections.growth.tilleringOnset.label,
			description: t.sections.growth.tilleringOnset.description,
		},
		{
			value: "flowering",
			label: t.sections.growth.flowering.label,
			description: t.sections.growth.flowering.description,
		},
		{
			value: "ripening",
			label: t.sections.growth.ripening.label,
			description: t.sections.growth.ripening.description,
		},
		{
			value: "harvestReady",
			label: t.sections.growth.harvestReady.label,
			description: t.sections.growth.harvestReady.description,
		},
		{
			value: "fallow",
			label: t.sections.growth.fallow.label,
			description: t.sections.growth.fallow.description,
		},
	];

	const WATER_STATUS_OPTIONS = [
		{
			value: "alwaysFlooded",
			label: t.sections.water.alwaysFlooded.label,
			description: t.sections.water.alwaysFlooded.description,
		},
		{
			value: "mostlyWet",
			label: t.sections.water.mostlyWet.label,
			description: t.sections.water.mostlyWet.description,
		},
		{
			value: "frequentlyDry",
			label: t.sections.water.frequentlyDry.label,
			description: t.sections.water.frequentlyDry.description,
		},
		{
			value: "veryDry",
			label: t.sections.water.veryDry.label,
			description: t.sections.water.veryDry.description,
		},
	];

	return (
		<div className="space-y-4">
			{/* Growth Stage */}
			<SectionCard
				id="section-growth"
				icon={Sprout}
				title={t.sections.growth.title}
				description={t.sections.growth.description}
			>
				<CheckboxGroup
					name="growthStage"
					options={GROWTH_STAGES}
					value={data.growthStage}
					onChange={(val) =>
						onChange({ growthStage: val as FormData["growthStage"] })
					}
				/>
			</SectionCard>

			{/* Water Status */}
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
		</div>
	);
}
