"use client";

import { type ReactNode, useEffect } from "react";

interface TelegramProviderProps {
	children: ReactNode;
}

export function TelegramProvider({ children }: TelegramProviderProps) {
	useEffect(() => {
		// Initialize Telegram Mini App
		const initTelegram = async () => {
			try {
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
			} catch {
				// Running outside Telegram - use fallback styling
				console.log("Running outside Telegram Mini App context");
			}
		};

		initTelegram();
	}, []);

	return <>{children}</>;
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
