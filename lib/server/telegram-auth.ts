import { createHmac } from "node:crypto";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";

interface TelegramUser {
	id: number;
	first_name: string;
	last_name?: string;
	username?: string;
	language_code?: string;
	is_premium?: boolean;
	allows_write_to_pm?: boolean;
}

interface AuthResult {
	valid: boolean;
	user?: TelegramUser;
	error?: string;
}

/**
 * Validates the Telegram Mini App init data using HMAC-SHA256
 * @param initDataRaw The raw init data string (e.g., "query_id=...&user=...&auth_date=...&hash=...")
 * @returns Object indicating validity and parsed user data
 */
export function validateTelegramWebAppData(
	initDataRaw: string | null,
): AuthResult {
	// In development, valid if configured to bypass
	if (
		process.env.NODE_ENV === "development" &&
		process.env.BYPASS_TELEGRAM_AUTH === "true"
	) {
		try {
			if (initDataRaw) {
				const params = new URLSearchParams(initDataRaw);
				const userStr = params.get("user");
				if (userStr) {
					return { valid: true, user: JSON.parse(userStr) };
				}
			}
			// Even if parsing fails or no initData, allow in dev
			return { valid: true };
		} catch {
			return { valid: true };
		}
	}

	if (!initDataRaw) {
		return { valid: false, error: "No init data provided" };
	}

	if (!BOT_TOKEN) {
		console.warn("TELEGRAM_BOT_TOKEN not configured");
		// In development without token, we might want to fail or allow based on policy
		// For safety, fail unless explicitly bypassed above
		return { valid: false, error: "Server configuration error" };
	}

	try {
		const params = new URLSearchParams(initDataRaw);
		const hash = params.get("hash");

		if (!hash) {
			return { valid: false, error: "No hash provided" };
		}

		// Check auth_date to prevent replay attacks (allow 24h window)
		const authDate = Number.parseInt(params.get("auth_date") || "0", 10);
		const now = Math.floor(Date.now() / 1000);
		const allowedTimeWindow = 86400; // 24 hours

		if (now - authDate > allowedTimeWindow) {
			return { valid: false, error: "Auth date expired" };
		}

		// Construct data check string
		const dataCheckArr: string[] = [];
		for (const [key, value] of params.entries()) {
			if (key !== "hash") {
				dataCheckArr.push(`${key}=${value}`);
			}
		}

		// Sort alphabetically
		dataCheckArr.sort();

		const dataCheckString = dataCheckArr.join("\n");

		// Compute HMAC
		// 1. Create secret key: HMAC-SHA256(botToken, "WebAppData")
		const secretKey = createHmac("sha256", "WebAppData")
			.update(BOT_TOKEN)
			.digest();

		// 2. Create hash: HMAC-SHA256(secretKey, dataCheckString)
		const calculatedHash = createHmac("sha256", secretKey)
			.update(dataCheckString)
			.digest("hex");

		// Use timing-safe comparison to prevent timing attacks
		const hashBuffer = Buffer.from(hash, "hex");
		const calculatedBuffer = Buffer.from(calculatedHash, "hex");

		// Ensure both buffers are the same length before comparison
		if (
			hashBuffer.length === calculatedBuffer.length &&
			require("node:crypto").timingSafeEqual(hashBuffer, calculatedBuffer)
		) {
			const userStr = params.get("user");
			let user: TelegramUser | undefined;
			if (userStr) {
				user = JSON.parse(userStr);
			}
			return { valid: true, user };
		}

		return { valid: false, error: "Invalid signature" };
	} catch (error) {
		console.error("Error validating Telegram data:", error);
		return { valid: false, error: "Validation error" };
	}
}
