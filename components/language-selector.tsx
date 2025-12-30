"use client";

import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n/language-context";

export function LanguageSelector({ onSelect }: { onSelect?: () => void }) {
	const { setLanguage } = useLanguage();

	const handleSelect = (lang: "en" | "km") => {
		setLanguage(lang);
		if (onSelect) {
			onSelect();
		}
	};

	return (
		<div className="min-h-screen bg-muted/30 flex items-center justify-center p-6">
			<div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center space-y-8">
				<div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
					<Globe className="w-10 h-10 text-primary" strokeWidth={1.5} />
				</div>

				<div>
					<h2 className="text-xl font-bold text-foreground mb-2">
						Select Language
					</h2>
					<p className="text-muted-foreground text-sm">
						Please choose your preferred language
					</p>
				</div>

				<div className="space-y-3">
					<Button
						onClick={() => handleSelect("en")}
						variant="outline"
						className="w-full h-14 text-base font-medium rounded-xl border-2 hover:border-primary hover:bg-primary/5 hover:text-primary transition-all"
					>
						English 🇬🇧
					</Button>
					<Button
						onClick={() => handleSelect("km")}
						variant="outline"
						className="w-full h-14 text-base font-medium rounded-xl border-2 hover:border-primary hover:bg-primary/5 hover:text-primary transition-all font-sans"
					>
						ខ្មែរ 🇰🇭
					</Button>
				</div>
			</div>
		</div>
	);
}
