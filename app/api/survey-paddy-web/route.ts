import { NextRequest, NextResponse } from "next/server";
import {
	type AuthResult,
	parseRequestBody,
	processSurveySubmission,
} from "@/lib/server/survey-paddy/submission-handler";

/**
 * Verify web auth token from header (no expiration)
 */
function verifyWebAuth(authHeader: string | null): AuthResult {
	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		return { valid: false, provider: "web" };
	}

	try {
		const token = authHeader.replace("Bearer ", "");
		const payload = JSON.parse(Buffer.from(token, "base64").toString());

		// Token is valid if it has surveyor info (no expiration check)
		if (payload.surveyorName && payload.phoneNumber) {
			return {
				valid: true,
				userId: payload.phoneNumber,
				username: payload.phoneNumber,
				firstName: payload.surveyorName,
				phone: payload.phoneNumber,
				provider: "web",
			};
		}

		return { valid: false, provider: "web" };
	} catch {
		return { valid: false, provider: "web" };
	}
}

export async function POST(request: NextRequest) {
	try {
		// Verify web authentication
		const authHeader = request.headers.get("Authorization");
		const authResult = verifyWebAuth(authHeader);

		if (!authResult.valid) {
			return NextResponse.json(
				{ success: false, message: "Unauthorized" },
				{ status: 401 },
			);
		}

		// Parse request body
		const { body, photos } = await parseRequestBody(request);

		// Process submission using shared handler
		const result = await processSurveySubmission(authResult, body, photos);

		return NextResponse.json(
			{
				success: result.success,
				message: result.message,
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
		console.error("Error processing web paddy farm survey:", error);
		return NextResponse.json(
			{
				success: false,
				message: "Failed to save submission",
			},
			{ status: 500 },
		);
	}
}
