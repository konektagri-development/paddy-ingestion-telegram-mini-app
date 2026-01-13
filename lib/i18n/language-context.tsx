"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { type Language, translations } from "@/lib/i18n/translations";

type LanguageContextType = {
	language: Language | null;
	setLanguage: (lang: Language) => void;
	t: typeof translations.en;
};

const LanguageContext = createContext<LanguageContextType | undefined>(
	undefined,
);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
	const [language, setLanguageState] = useState<Language | null>(null);
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		const savedLang = localStorage.getItem("app-language") as Language;
		if (savedLang && (savedLang === "en" || savedLang === "km")) {
			setLanguageState(savedLang);
		}
		setMounted(true);
	}, []);

	const setLanguage = (lang: Language) => {
		setLanguageState(lang);
		localStorage.setItem("app-language", lang);
	};

	const value = {
		language,
		setLanguage,
		t: language ? translations[language] : translations.en, // Default to EN for types/safety, but logic will hide app if null
	};

	if (!mounted) {
		return null;
	}

	return (
		<LanguageContext.Provider value={value}>
			{children}
		</LanguageContext.Provider>
	);
}

export function useLanguage() {
	const context = useContext(LanguageContext);
	if (context === undefined) {
		throw new Error("useLanguage must be used within a LanguageProvider");
	}
	return context;
}
