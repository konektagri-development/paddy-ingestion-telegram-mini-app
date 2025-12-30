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
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		const getTelegramUser = async () => {
			try {
				const { retrieveLaunchParams } = await import("@tma.js/sdk");

				const launchParams = retrieveLaunchParams();
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

	return { user, isLoading };
}
