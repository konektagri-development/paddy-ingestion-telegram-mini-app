"use client";

/**
 * Telegram Mini App Authentication Utility
 *
 * This module provides utilities for authenticating API requests
 * using Telegram's init data validation mechanism.
 */

let cachedInitDataRaw: string | null = null;

/**
 * Retrieves the raw init data string from Telegram.
 * This string is signed by Telegram and can be validated on the backend
 * using the bot token to ensure requests originate from the Mini App.
 *
 * @returns The initDataRaw string or null if not available
 */
export async function getInitDataRaw(): Promise<string | null> {
	if (cachedInitDataRaw !== null) {
		return cachedInitDataRaw;
	}

	try {
		const { retrieveLaunchParams } = await import("@tma.js/sdk");
		const launchParams = retrieveLaunchParams();

		// Get the raw init data string (URL-encoded format)
		// This is the signed data that should be sent to the backend
		const rawData = launchParams.initDataRaw;
		if (rawData && typeof rawData === "string") {
			cachedInitDataRaw = rawData;
			return cachedInitDataRaw;
		}

		return null;
	} catch {
		// Running outside Telegram context
		console.log("Telegram init data not available - running outside Telegram");
		return null;
	}
}

/**
 * Creates headers object with Telegram authentication.
 * Use this when making fetch requests to your API.
 *
 * @param additionalHeaders - Optional additional headers to include
 * @returns Headers object with X-Telegram-Init-Data if available
 */
export async function getTelegramAuthHeaders(
	additionalHeaders?: Record<string, string>,
): Promise<Record<string, string>> {
	const initDataRaw = await getInitDataRaw();
	const headers: Record<string, string> = { ...additionalHeaders };

	if (initDataRaw) {
		headers["X-Telegram-Init-Data"] = initDataRaw;
	}

	return headers;
}

/**
 * Clears the cached init data.
 * Useful for testing or when the app needs to refresh auth state.
 */
export function clearInitDataCache(): void {
	cachedInitDataRaw = null;
}
