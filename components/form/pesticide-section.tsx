"use client";

import { Bug } from "lucide-react";
import { SectionCard } from "@/components/form/section-card";
import { CheckboxGroup } from "@/components/ui/checkbox-group";
import type { FormData } from "@/lib/form-types";
import { useLanguage } from "@/lib/i18n/language-context";

interface PesticideSectionProps {
	data: FormData;
	onChange: (data: Partial<FormData>) => void;
}

export function PesticideSection({ data, onChange }: PesticideSectionProps) {
	const { t } = useLanguage();

	const YES_NO_REMEMBER_OPTIONS = [
		{ value: "yes", label: t.common.yes },
		{ value: "no", label: t.common.no },
		{ value: "dontRemember", label: t.common.dontRemember },
	];

	return (
		<SectionCard
			id="section-pesticide"
			icon={Bug}
			title={t.sections.treatments.pesticideTitle}
			description={t.sections.treatments.pesticideDescription}
		>
			<CheckboxGroup
				name="pesticide"
				options={YES_NO_REMEMBER_OPTIONS}
				value={data.pesticide.used}
				onChange={(val) =>
					onChange({
						pesticide: { used: val as FormData["pesticide"]["used"] },
					})
				}
			/>
		</SectionCard>
	);
}
