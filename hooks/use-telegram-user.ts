"use client";

import { useEffect, useState } from "react";

export interface TelegramUser {
	id: number;
	firstName: string;
	lastName?: string;
	username?: string;
	languageCode?: string;
	isPremium?: boolean;
}

export function useTelegramUser() {
	const [user, setUser] = useState<TelegramUser | null>(null);
	const [initDataRaw, setInitDataRaw] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		const getTelegramUser = async () => {
			try {
				const { retrieveLaunchParams } = await import("@tma.js/sdk");

				const launchParams = retrieveLaunchParams();

				// In @tma.js/sdk, initDataRaw might be retrieved differently or missing
				// Let's try to get it from the window location hash directly as a fallback
				let rawData: string | undefined;

				const sdkRaw = launchParams.initDataRaw;
				if (typeof sdkRaw === "string" && sdkRaw.length > 0) {
					rawData = sdkRaw;
				}

				if (!rawData) {
					// Fallback 1: extract from URL hash
					const hash = window.location.hash.slice(1);
					const hashParams = new URLSearchParams(hash);
					const hashData = hashParams.get("tgWebAppData");
					if (hashData) rawData = hashData;

					// Fallback 2: extract from URL search (query params)
					if (!rawData) {
						const searchParams = new URLSearchParams(window.location.search);
						const searchData = searchParams.get("tgWebAppData");
						if (searchData) rawData = searchData;
					}
				}

				if (rawData) {
					setInitDataRaw(rawData);
				}

				const webAppData = launchParams.tgWebAppData;

				// tgWebAppData contains user info
				if (webAppData) {
					const tgUser = webAppData.user as {
						id: number;
						first_name: string;
						last_name?: string;
						username?: string;
						language_code?: string;
						is_premium?: boolean;
					};
					setUser({
						id: tgUser.id,
						firstName: tgUser.first_name,
						lastName: tgUser.last_name,
						username: tgUser.username,
						languageCode: tgUser.language_code,
						isPremium: tgUser.is_premium,
					});
				}
			} catch {
				// Fallback for testing outside Telegram
				setUser({
					id: 0,
					firstName: "Test",
					lastName: "User",
					username: "testuser",
				});
			} finally {
				setIsLoading(false);
			}
		};

		getTelegramUser();
	}, []);

	return { user, initDataRaw, isLoading };
}
