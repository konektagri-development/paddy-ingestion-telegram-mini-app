"use client";

import { Camera } from "lucide-react";
import { SectionCard } from "@/components/form/section-card";
import { PhotoUpload } from "@/components/ui/photo-upload";
import type { FormData } from "@/lib/form-types";
import { useLanguage } from "@/lib/i18n/language-context";

interface PhotoSectionProps {
	data: FormData;
	onChange: (data: Partial<FormData>) => void;
}

export function PhotoSection({ data, onChange }: PhotoSectionProps) {
	const { t } = useLanguage();

	return (
		<SectionCard
			id="section-photos"
			icon={Camera}
			title={t.sections.photos.title}
			description={t.sections.photos.description}
		>
			<PhotoUpload
				photos={data.photos}
				onPhotosChange={(photos) => onChange({ photos })}
				maxPhotos={10}
			/>
		</SectionCard>
	);
}
