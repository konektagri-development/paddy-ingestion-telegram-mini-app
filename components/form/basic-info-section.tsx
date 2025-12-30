"use client";

import {
	Check,
	CloudRain,
	FileText,
	Layers,
	Loader2,
	MapPin,
} from "lucide-react";
import { useEffect } from "react";
import { triggerHaptic } from "@/components/telegram-provider";
import { Button } from "@/components/ui/button";
import { CheckboxGroup } from "@/components/ui/checkbox-group";
import { Input } from "@/components/ui/input";
import { useGeolocation } from "@/hooks/use-geolocation";
import type { FormData } from "@/lib/form-types";
import { useLanguage } from "@/lib/i18n/language-context";
import { cn } from "@/lib/utils";

interface StepBasicInfoProps {
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

export function BasicInfoSection({ data, onChange }: StepBasicInfoProps) {
	const { t } = useLanguage();
	const { latitude, longitude, loading, error, getPosition } = useGeolocation();

	const RAINFALL_OPTIONS = [
		{ value: "heavy", label: t.sections.rainfall.heavy },
		{ value: "moderate", label: t.sections.rainfall.moderate },
		{ value: "low", label: t.sections.rainfall.low },
	];

	const SOIL_ROUGHNESS_OPTIONS = [
		{ value: "smooth", label: t.sections.soil.smooth },
		{ value: "medium", label: t.sections.soil.medium },
		{ value: "rough", label: t.sections.soil.rough },
	];

	const hasLocation = !!(data.gpsLatitude && data.gpsLongitude);

	useEffect(() => {
		if (latitude && longitude) {
			onChange({ gpsLatitude: latitude, gpsLongitude: longitude });
			triggerHaptic("success");
		}
	}, [latitude, longitude, onChange]);

	return (
		<div className="space-y-4">
			{/* Rice Field Information */}
			<SectionCard
				id="section-basic-info"
				icon={FileText}
				title={t.sections.basicInfo.title}
				description={t.sections.basicInfo.description}
			>
				<div className="space-y-4">
					{/* GPS Location */}
					<div className="space-y-2">
						<label className="block text-sm font-medium text-foreground">
							{t.sections.basicInfo.fieldCoordinates}
						</label>

						{/* Location Button */}
						<Button
							onClick={getPosition}
							disabled={loading}
							variant={hasLocation ? "outline" : "default"}
							className={cn(
								"w-full h-12 rounded-xl font-medium gap-2",
								hasLocation &&
									"bg-green-50 border-2 border-green-500 text-green-700 hover:bg-green-100",
							)}
						>
							{loading ? (
								<>
									<Loader2 className="w-5 h-5 animate-spin" />
									{t.sections.basicInfo.sharingLocation}
								</>
							) : hasLocation ? (
								<>
									<Check className="w-5 h-5" />
									{t.sections.basicInfo.locationShared}
								</>
							) : (
								<>
									<MapPin className="w-5 h-5" />
									{t.sections.basicInfo.shareLocation}
								</>
							)}
						</Button>

						{/* Location Display (read-only) */}
						{hasLocation && (
							<div className="bg-muted/50 rounded-lg p-2.5 flex items-center justify-between text-sm">
								<span className="text-muted-foreground">
									{t.sections.basicInfo.coordinates}
								</span>
								<span className="font-mono text-xs text-foreground">
									{data.gpsLatitude}, {data.gpsLongitude}
								</span>
							</div>
						)}

						{/* Error Message */}
						{error && <p className="text-sm text-destructive">{error}</p>}
					</div>

					{/* Rice Field Number */}
					<div className="space-y-2">
						<label className="block text-sm font-medium text-foreground">
							{t.sections.basicInfo.fieldNumber}
						</label>
						<Input
							type="number"
							value={data.farmNumber}
							onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
								onChange({ farmNumber: e.target.value })
							}
							placeholder={t.sections.basicInfo.fieldNumberPlaceholder}
						/>
					</div>
				</div>
			</SectionCard>

			{/* Rainfall Conditions */}
			<SectionCard
				id="section-rainfall"
				icon={CloudRain}
				title={t.sections.rainfall.title}
				description={t.sections.rainfall.description}
			>
				<div className="space-y-4">
					<div className="space-y-2">
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
					</div>

					{/* Conditional: Rainfall Intensity */}
					<div
						className={cn(
							"overflow-hidden transition-all duration-300",
							data.rainfall2days ? "max-h-96 opacity-100" : "max-h-0 opacity-0",
						)}
					>
						<div className="space-y-2 pt-2">
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
					</div>
				</div>
			</SectionCard>

			{/* Soil Conditions */}
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
		</div>
	);
}
