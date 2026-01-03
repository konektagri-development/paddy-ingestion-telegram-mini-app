"use client";

import { Beaker } from "lucide-react";
import { SectionCard } from "@/components/form/section-card";
import { CheckboxGroup } from "@/components/ui/checkbox-group";
import type { FormData } from "@/lib/form-types";
import { useLanguage } from "@/lib/i18n/language-context";

interface HerbicideSectionProps {
	data: FormData;
	onChange: (data: Partial<FormData>) => void;
}

export function HerbicideSection({ data, onChange }: HerbicideSectionProps) {
	const { t } = useLanguage();

	const YES_NO_REMEMBER_OPTIONS = [
		{ value: "yes", label: t.common.yes },
		{ value: "no", label: t.common.no },
		{ value: "dontRemember", label: t.common.dontRemember },
	];

	return (
		<SectionCard
			id="section-herbicide"
			icon={Beaker}
			title={t.sections.treatments.herbicideTitle}
			description={t.sections.treatments.herbicideDescription}
		>
			<CheckboxGroup
				name="herbicide"
				options={YES_NO_REMEMBER_OPTIONS}
				value={data.herbicide.used}
				onChange={(val) =>
					onChange({
						herbicide: { used: val as FormData["herbicide"]["used"] },
					})
				}
			/>
		</SectionCard>
	);
}
