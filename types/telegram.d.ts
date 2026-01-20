// Type declarations for Telegram WebApp
interface TelegramWebApp {
	initData: string;
	initDataUnsafe: {
		user?: {
			id: number;
			first_name: string;
			last_name?: string;
			username?: string;
			language_code?: string;
		};
		start_param?: string;
	};
	version: string;
	platform: string;
	colorScheme: "light" | "dark";
	themeParams: {
		bg_color?: string;
		text_color?: string;
		hint_color?: string;
		link_color?: string;
		button_color?: string;
		button_text_color?: string;
		secondary_bg_color?: string;
	};
	isExpanded: boolean;
	viewportHeight: number;
	viewportStableHeight: number;
	ready: () => void;
	expand: () => void;
	close: () => void;
}

interface Telegram {
	WebApp: TelegramWebApp;
}

declare global {
	interface Window {
		Telegram?: Telegram;
	}
}

export {};
