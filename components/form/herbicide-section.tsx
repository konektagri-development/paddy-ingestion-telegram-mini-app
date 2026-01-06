"use client";

import { Beaker } from "lucide-react";
import { SectionCard } from "@/components/form/section-card";
import { CheckboxGroup } from "@/components/ui/checkbox-group";
import { useYesNoRememberOptions } from "@/lib/form-options";
import type { FormData, YesNoRemember } from "@/lib/form-types";
import { useLanguage } from "@/lib/i18n/language-context";

interface HerbicideSectionProps {
	data: FormData;
	onChange: (data: Partial<FormData>) => void;
}

export function HerbicideSection({ data, onChange }: HerbicideSectionProps) {
	const { t } = useLanguage();
	const yesNoRememberOptions = useYesNoRememberOptions();

	return (
		<SectionCard
			id="section-herbicide"
			icon={Beaker}
			title={t.sections.treatments.herbicideTitle}
			description={t.sections.treatments.herbicideDescription}
		>
			<CheckboxGroup
				name="herbicide"
				options={yesNoRememberOptions}
				value={data.herbicide.used}
				onChange={(val) =>
					onChange({
						herbicide: { used: val as YesNoRemember },
					})
				}
			/>
		</SectionCard>
	);
}
