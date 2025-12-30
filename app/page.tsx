"use client";

import { FarmVisitForm } from "@/components/form/farm-visit-form";
import { LanguageSelector } from "@/components/language-selector";
import { useLanguage } from "@/lib/i18n/language-context";

export default function Home() {
	const { language } = useLanguage();

	if (!language) {
		return <LanguageSelector />;
	}

	return <FarmVisitForm />;
}
