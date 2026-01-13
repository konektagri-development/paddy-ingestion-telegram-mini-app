"use client";

import { PaddyVisitForm } from "@/components/form/paddy-visit-form";
import { LanguageSelector } from "@/components/language-selector";
import { useLanguage } from "@/lib/i18n/language-context";

export default function Home() {
	const { language } = useLanguage();

	if (!language) {
		return <LanguageSelector />;
	}

	return <PaddyVisitForm />;
}
