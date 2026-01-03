"use client";

import { Check, FileText, Loader2, MapPin } from "lucide-react";
import { useEffect } from "react";
import { SectionCard } from "@/components/form/section-card";
import { triggerHaptic } from "@/components/telegram-provider";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useGeolocation } from "@/hooks/use-geolocation";
import type { FormData } from "@/lib/form-types";
import { useLanguage } from "@/lib/i18n/language-context";
import { cn } from "@/lib/utils";

interface BasicInfoSectionProps {
	data: FormData;
	onChange: (data: Partial<FormData>) => void;
}

export function BasicInfoSection({ data, onChange }: BasicInfoSectionProps) {
	const { t } = useLanguage();
	const { latitude, longitude, loading, error, getPosition } = useGeolocation();

	const hasLocation = !!(data.gpsLatitude && data.gpsLongitude);

	useEffect(() => {
		if (latitude && longitude) {
			onChange({ gpsLatitude: latitude, gpsLongitude: longitude });
			triggerHaptic("success");
		}
	}, [latitude, longitude, onChange]);

	return (
		<SectionCard
			id="section-basic-info"
			icon={FileText}
			title={t.sections.basicInfo.title}
			description={t.sections.basicInfo.description}
		>
			<div className="space-y-4">
				{/* GPS Location */}
				<div className="space-y-4">
					<label className="block text-sm font-medium text-foreground">
						{t.sections.basicInfo.fieldCoordinates}
					</label>

					{/* Location Button */}
					<Button
						onClick={getPosition}
						disabled={loading}
						variant={hasLocation ? "outline" : "default"}
						className={cn(
							"w-full rounded-xl font-medium gap-2 text-base",
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

					{/* Error Message */}
					{error && (
						<p className="text-sm text-destructive font-medium bg-destructive/10 p-2 rounded-lg">
							{error}
						</p>
					)}
				</div>

				{/* Rice Field Number */}
				<div className="space-y-4">
					<label className="block text-sm font-medium text-foreground">
						{t.sections.basicInfo.fieldNumber}
					</label>
					<Select
						value={data.farmNumber}
						onValueChange={(value) => onChange({ farmNumber: value })}
					>
						<SelectTrigger className="w-full h-12 rounded-xl text-base">
							<SelectValue
								placeholder={t.sections.basicInfo.fieldNumberPlaceholder}
							/>
						</SelectTrigger>
						<SelectContent>
							{Array.from({ length: 20 }, (_, i) => i + 1).map((num) => (
								<SelectItem key={num} value={num.toString()}>
									{num}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</div>
		</SectionCard>
	);
}
