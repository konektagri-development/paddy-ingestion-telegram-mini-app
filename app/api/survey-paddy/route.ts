import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
	type AuthResult,
	parseRequestBody,
	processSurveySubmission,
} from "@/lib/server/survey-paddy/submission-handler";
import { validateTelegramWebAppData } from "@/lib/server/telegram-auth";

/**
 * Verify Telegram init data from header
 */
function verifyTelegramAuth(initDataRaw: string | null): AuthResult {
	const result = validateTelegramWebAppData(initDataRaw);

	if (result.valid) {
		if (result.user) {
			return {
				valid: true,
				userId: String(result.user.id),
				username: result.user.username,
				firstName: result.user.first_name,
				lastName: result.user.last_name,
				provider: "telegram",
			};
		}
		// In development bypass, valid might be true but user undefined
		return { valid: true, provider: "telegram" };
	}

	return { valid: false, provider: "telegram" };
}

export async function POST(request: NextRequest) {
	// Generate unique request ID for tracing
	const requestId = randomUUID();

	try {
		// Verify Telegram authentication
		const initDataRaw = request.headers.get("X-Telegram-Init-Data");
		const authResult = verifyTelegramAuth(initDataRaw);

		if (!authResult.valid) {
			console.warn("[API] Unauthorized request", { requestId });
			return NextResponse.json(
				{ success: false, message: "Unauthorized", requestId },
				{ status: 401 },
			);
		}

		// Parse request body
		const { body, photos } = await parseRequestBody(request);

		// Process submission using shared handler
		const result = await processSurveySubmission(authResult, body, photos);

		console.log("[API] Survey submitted", {
			requestId,
			success: result.success,
			locationCode: result.locationCode,
			photosUploaded: result.photosUploaded,
		});

		return NextResponse.json(
			{
				success: result.success,
				message: result.message,
				requestId,
				...(result.locationCode && { locationCode: result.locationCode }),
				...(result.photosUploaded !== undefined && {
					photosUploaded: result.photosUploaded,
				}),
				...(result.status && { status: result.status }),
				...(result.errors && { errors: result.errors }),
			},
			{ status: result.httpStatus },
		);
	} catch (error) {
		console.error("[API] Error processing paddy farm survey", {
			requestId,
			error: error instanceof Error ? error.message : String(error),
		});
		return NextResponse.json(
			{
				success: false,
				message: "Failed to save submission",
				requestId,
			},
			{ status: 500 },
		);
	}
}
