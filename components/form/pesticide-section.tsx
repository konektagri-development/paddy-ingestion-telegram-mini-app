"use client";

import { Bug } from "lucide-react";
import { SectionCard } from "@/components/form/section-card";
import { CheckboxGroup } from "@/components/ui/checkbox-group";
import { useYesNoRememberOptions } from "@/lib/form-options";
import type { FormData, YesNoRemember } from "@/lib/form-types";
import { useLanguage } from "@/lib/i18n/language-context";

interface PesticideSectionProps {
	data: FormData;
	onChange: (data: Partial<FormData>) => void;
}

export function PesticideSection({ data, onChange }: PesticideSectionProps) {
	const { t } = useLanguage();
	const yesNoRememberOptions = useYesNoRememberOptions();

	return (
		<SectionCard
			id="section-pesticide"
			icon={Bug}
			title={t.sections.treatments.pesticideTitle}
			description={t.sections.treatments.pesticideDescription}
		>
			<CheckboxGroup
				name="pesticide"
				options={yesNoRememberOptions}
				value={data.pesticide.used}
				onChange={(val) =>
					onChange({
						pesticide: { used: val as YesNoRemember },
					})
				}
			/>
		</SectionCard>
	);
}
