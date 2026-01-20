import { after } from "next/server";
import { createPaddyFarmSurveySchema } from "@/lib/server/survey-paddy/schema";
import {
	performSubmissionSave,
	prepareSubmissionContext,
} from "@/lib/server/survey-paddy/service";

export type AuthResult = {
	valid: boolean;
	provider: "telegram" | "web";
	userId?: string;
	username?: string;
	firstName?: string;
	lastName?: string;
	phone?: string;
};

export type Photo = {
	buffer: Buffer;
	originalname: string;
	mimetype: string;
};

/**
 * Parse request body - supports both FormData and JSON
 */
export async function parseRequestBody(request: Request): Promise<{
	body: Record<string, string>;
	photos: Photo[];
}> {
	const contentType = request.headers.get("content-type") || "";
	const body: Record<string, string> = {};
	const photos: Photo[] = [];

	if (contentType.includes("multipart/form-data")) {
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
		const jsonBody = await request.json();
		for (const [key, value] of Object.entries(jsonBody)) {
			if (typeof value === "string") {
				body[key] = value;
			}
		}
	}

	return { body, photos };
}

/**
 * Validate and process survey submission
 * Shared logic for both Telegram and Web submissions
 */
export async function processSurveySubmission(
	authResult: AuthResult,
	body: Record<string, string>,
	photos: Photo[],
): Promise<{
	success: boolean;
	message: string;
	locationCode?: string;
	photosUploaded?: number;
	status?: string;
	errors?: Array<{ path: string; message: string }>;
	httpStatus: number;
}> {
	// Validate with Zod schema
	const parseResult = createPaddyFarmSurveySchema.safeParse(body);

	if (!parseResult.success) {
		return {
			success: false,
			message: "Validation failed",
			errors: parseResult.error.issues.map((issue) => ({
				path: issue.path.join("."),
				message: issue.message,
			})),
			httpStatus: 400,
		};
	}

	const dto = parseResult.data;

	// Process the submission asynchronously
	// 1. Prepare context (Fast, DB reads only) to get Location Code
	const context = await prepareSubmissionContext(authResult, dto);

	// 2. Schedule slow work (Uploads + DB Save) for after response
	after(async () => {
		await performSubmissionSave(context, dto, photos);
	});

	return {
		success: true,
		message: "Submission received (processing in background)",
		locationCode: context.locationInfo.locationCode,
		photosUploaded: photos.length,
		status: "queued",
		httpStatus: 200,
	};
}
