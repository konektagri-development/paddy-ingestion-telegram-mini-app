"use client";

import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useState,
} from "react";

type Platform = "telegram" | "web" | "unknown";

interface PlatformContextType {
	platform: Platform;
	isTelegram: boolean;
	isWeb: boolean;
	isLoading: boolean;
}

const PlatformContext = createContext<PlatformContextType>({
	platform: "unknown",
	isTelegram: false,
	isWeb: false,
	isLoading: true,
});

export function usePlatform() {
	const context = useContext(PlatformContext);
	if (!context) {
		throw new Error("usePlatform must be used within a TelegramProvider");
	}
	return context;
}

interface TelegramProviderProps {
	children: ReactNode;
}

export function TelegramProvider({ children }: TelegramProviderProps) {
	const [platform, setPlatform] = useState<Platform>("unknown");
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		// Initialize Telegram Mini App
		const initTelegram = async () => {
			try {
				// Check if running in Telegram WebApp context
				// Method 1: Check for Telegram WebApp object
				const hasTelegramWebApp =
					typeof window !== "undefined" &&
					window.Telegram?.WebApp !== undefined;

				// Method 2: Check URL parameters for Telegram-specific params
				const urlParams = new URLSearchParams(window.location.search);
				const hasTelegramParams =
					urlParams.has("tgWebAppData") ||
					urlParams.has("tgWebAppStartParam") ||
					urlParams.has("tgWebAppPlatform");

				// Method 3: Check hash for Telegram data
				const hashParams = new URLSearchParams(
					window.location.hash.replace("#", ""),
				);
				const hasTelegramHash =
					hashParams.has("tgWebAppData") ||
					hashParams.has("tgWebAppStartParam");

				const isTelegramContext =
					hasTelegramWebApp || hasTelegramParams || hasTelegramHash;

				if (isTelegramContext) {
					// Dynamic import to avoid SSR issues
					const { init, backButton, viewport, themeParams } = await import(
						"@tma.js/sdk"
					);

					// Initialize the SDK
					init();

					// Expand viewport to full height
					if (viewport.mount.isAvailable()) {
						viewport.mount();
						viewport.expand();
					}

					// Setup back button behavior
					if (backButton.mount.isAvailable()) {
						backButton.mount();
					}

					// Apply Telegram theme colors to CSS variables
					if (themeParams.mount.isAvailable()) {
						themeParams.mount();
						const params = themeParams.state();

						if (params) {
							const root = document.documentElement;
							if (params.bgColor) {
								root.style.setProperty("--tg-bg-color", params.bgColor);
							}
							if (params.textColor) {
								root.style.setProperty("--tg-text-color", params.textColor);
							}
							if (params.buttonColor) {
								root.style.setProperty("--tg-button-color", params.buttonColor);
							}
							if (params.buttonTextColor) {
								root.style.setProperty(
									"--tg-button-text-color",
									params.buttonTextColor,
								);
							}
							if (params.secondaryBgColor) {
								root.style.setProperty(
									"--tg-secondary-bg-color",
									params.secondaryBgColor,
								);
							}
							if (params.hintColor) {
								root.style.setProperty("--tg-hint-color", params.hintColor);
							}
						}
					}

					setPlatform("telegram");
					console.log("Running in Telegram Mini App context");
				} else {
					setPlatform("web");
					console.log("Running in web browser context");
				}
			} catch {
				// Running outside Telegram - use fallback styling
				setPlatform("web");
				console.log("Running outside Telegram Mini App context");
			} finally {
				setIsLoading(false);
			}
		};

		initTelegram();
	}, []);

	const contextValue: PlatformContextType = {
		platform,
		isTelegram: platform === "telegram",
		isWeb: platform === "web",
		isLoading,
	};

	return (
		<PlatformContext.Provider value={contextValue}>
			{children}
		</PlatformContext.Provider>
	);
}

// Utility function for haptic feedback
export async function triggerHaptic(
	type:
		| "light"
		| "medium"
		| "heavy"
		| "success"
		| "error"
		| "warning" = "light",
) {
	try {
		const { hapticFeedback } = await import("@tma.js/sdk");

		if (hapticFeedback.impactOccurred.isAvailable()) {
			if (type === "success" || type === "error" || type === "warning") {
				hapticFeedback.notificationOccurred(type);
			} else {
				hapticFeedback.impactOccurred(type);
			}
		}
	} catch {
		// Haptic feedback not available
	}
}
