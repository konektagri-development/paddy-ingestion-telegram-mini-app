// Shared form options hooks with translations
// This centralizes options that are used in multiple sections

import type { YesNoRemember } from "@/lib/form-types";
import { useLanguage } from "@/lib/i18n/language-context";

/**
 * Hook to get YES_NO_REMEMBER_OPTIONS with translated labels
 * Used by: fertilizer, herbicide, pesticide sections
 */
export function useYesNoRememberOptions(): Array<{
	value: YesNoRemember;
	label: string;
}> {
	const { t } = useLanguage();

	return [
		{ value: "yes", label: t.common.yes },
		{ value: "no", label: t.common.no },
		{ value: "dontRemember", label: t.common.dontRemember },
	];
}
