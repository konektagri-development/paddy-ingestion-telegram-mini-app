import { after, NextRequest, NextResponse } from "next/server";
import { createPaddyFarmSurveySchema } from "@/lib/server/survey-paddy/schema";
import {
	performSubmissionSave,
	prepareSubmissionContext,
} from "@/lib/server/survey-paddy/service";

import { validateTelegramWebAppData } from "@/lib/server/telegram-auth";

/**
 * Verify Telegram init data from header
 */
function verifyTelegramAuth(initDataRaw: string | null): {
	valid: boolean;
	userId?: string;
	username?: string;
	firstName?: string;
	lastName?: string;
} {
	const result = validateTelegramWebAppData(initDataRaw);

	if (result.valid) {
		if (result.user) {
			return {
				valid: true,
				userId: String(result.user.id),
				username: result.user.username,
				firstName: result.user.first_name,
				lastName: result.user.last_name,
			};
		}
		// In development bypass, valid might be true but user undefined
		return { valid: true };
	}

	return { valid: false };
}

export async function POST(request: NextRequest) {
	try {
		// Verify Telegram authentication
		const initDataRaw = request.headers.get("X-Telegram-Init-Data");
		const authResult = verifyTelegramAuth(initDataRaw);

		if (!authResult.valid) {
			return NextResponse.json(
				{ success: false, message: "Unauthorized" },
				{ status: 401 },
			);
		}

		// Parse request body - support both FormData and JSON
		const contentType = request.headers.get("content-type") || "";
		const body: Record<string, string> = {};
		const photos: Array<{
			buffer: Buffer;
			originalname: string;
			mimetype: string;
		}> = [];

		if (contentType.includes("multipart/form-data")) {
			// Parse multipart form data (from live form submission or offline sync)
			const formData = await request.formData();

			for (const [key, value] of formData.entries()) {
				if (key === "photos" && value instanceof File) {
					const arrayBuffer = await value.arrayBuffer();
					photos.push({
						buffer: Buffer.from(arrayBuffer),
						originalname: value.name,
						mimetype: value.type,
					});
				} else if (typeof value === "string") {
					body[key] = value;
				}
			}
		} else {
			// Parse JSON body
			const jsonBody = await request.json();
			for (const [key, value] of Object.entries(jsonBody)) {
				if (typeof value === "string") {
					body[key] = value;
				}
			}
		}

		// Validate with Zod schema
		const parseResult = createPaddyFarmSurveySchema.safeParse(body);

		if (!parseResult.success) {
			return NextResponse.json(
				{
					success: false,
					message: "Validation failed",
					errors: parseResult.error.issues.map((issue) => ({
						path: issue.path.join("."),
						message: issue.message,
					})),
				},
				{ status: 400 },
			);
		}

		const dto = parseResult.data;

		// Process the submission asynchronously
		// 1. Prepare context (Fast, DB reads only) to get Location Code
		const context = await prepareSubmissionContext(authResult, dto);

		// 2. Schedule slow work (Uploads + DB Save) for after response
		after(async () => {
			await performSubmissionSave(context, dto, photos);
		});

		return NextResponse.json({
			success: true,
			message: "Submission received (processing in background)",
			locationCode: context.locationInfo.locationCode,
			photosUploaded: photos.length,
			status: "queued",
		});
	} catch (error) {
		console.error("Error processing paddy farm survey:", error);
		return NextResponse.json(
			{
				success: false,
				message: "Failed to save submission",
			},
			{ status: 500 },
		);
	}
}
