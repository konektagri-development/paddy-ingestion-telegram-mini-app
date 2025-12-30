import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

interface SubmissionData {
	// User info
	telegramUserId: number;
	telegramUsername: string;
	submittedAt: string;

	// Form data
	farmNumber: string;
	dateOfVisit: string;
	gpsLatitude: string;
	gpsLongitude: string;
	rainfall2days: boolean | null;
	rainfallIntensity?: string;
	soilRoughness: string | null;
	growthStage: string | null;
	waterStatus: string | null;
	overallHealth: string | null;
	visibleProblems: string;
	fertilizerUsed: string | null;
	fertilizerTypes: string;
	herbicide: string | null;
	pesticide: string | null;
	stressEvents: string;
	photoCount: number;
}

const CSV_HEADERS = [
	"telegramUserId",
	"telegramUsername",
	"submittedAt",
	"farmNumber",
	"dateOfVisit",
	"gpsLatitude",
	"gpsLongitude",
	"rainfall2days",
	"rainfallIntensity",
	"soilRoughness",
	"growthStage",
	"waterStatus",
	"overallHealth",
	"visibleProblems",
	"fertilizerUsed",
	"fertilizerTypes",
	"herbicide",
	"pesticide",
	"stressEvents",
	"photoCount",
];

function escapeCSV(
	value: string | number | boolean | null | undefined,
): string {
	if (value === null || value === undefined) return "";
	const stringValue = String(value);
	// Escape quotes and wrap in quotes if contains comma, quote, or newline
	if (
		stringValue.includes(",") ||
		stringValue.includes('"') ||
		stringValue.includes("\n")
	) {
		return `"${stringValue.replace(/"/g, '""')}"`;
	}
	return stringValue;
}

export async function POST(request: Request) {
	try {
		const body = await request.json();

		// Prepare CSV row data
		const rowData: SubmissionData = {
			telegramUserId: body.telegramUserId || 0,
			telegramUsername: body.telegramUsername || "unknown",
			submittedAt: new Date().toISOString(),
			farmNumber: body.farmNumber || "",
			dateOfVisit: body.dateOfVisit || "",
			gpsLatitude: body.gpsLatitude || "",
			gpsLongitude: body.gpsLongitude || "",
			rainfall2days: body.rainfall2days,
			rainfallIntensity: body.rainfallIntensity || "",
			soilRoughness: body.soilRoughness || "",
			growthStage: body.growthStage || "",
			waterStatus: body.waterStatus || "",
			overallHealth: body.overallHealth || "",
			visibleProblems: JSON.stringify(body.visibleProblems || {}),
			fertilizerUsed: body.fertilizer?.used || "",
			fertilizerTypes: JSON.stringify(body.fertilizer?.types || {}),
			herbicide: body.herbicide || "",
			pesticide: body.pesticide || "",
			stressEvents: JSON.stringify(body.stressEvents || {}),
			photoCount: body.photos?.length || 0,
		};

		// Create CSV row
		const csvRow = CSV_HEADERS.map((header) =>
			escapeCSV(rowData[header as keyof SubmissionData]),
		).join(",");

		// Ensure data directory exists
		const dataDir = path.join(process.cwd(), "data");
		try {
			await fs.access(dataDir);
		} catch {
			await fs.mkdir(dataDir, { recursive: true });
		}

		// CSV file path
		const csvPath = path.join(dataDir, "submissions.csv");

		// Check if file exists, if not create with headers
		let fileExists = false;
		try {
			await fs.access(csvPath);
			fileExists = true;
		} catch {
			// File doesn't exist
		}

		if (!fileExists) {
			// Create file with headers
			await fs.writeFile(csvPath, `${CSV_HEADERS.join(",")}\n`);
		}

		// Append row to CSV
		await fs.appendFile(csvPath, `${csvRow}\n`);

		console.log("Submission saved:", {
			username: rowData.telegramUsername,
			farmNumber: rowData.farmNumber,
			submittedAt: rowData.submittedAt,
		});

		return NextResponse.json({
			success: true,
			message: "Submission saved successfully",
		});
	} catch (error) {
		console.error("Error saving submission:", error);
		return NextResponse.json(
			{ success: false, message: "Failed to save submission" },
			{ status: 500 },
		);
	}
}
