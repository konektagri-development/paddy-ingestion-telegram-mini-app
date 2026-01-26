import { NextRequest, NextResponse } from "next/server";
import { prismaPaddy } from "@/lib/server/prisma-paddy";
import { processBatchDriveSync } from "@/lib/server/survey-paddy/service";

/**
 * CRON Job: Sync pending submissions to Google Drive
 * Schedule: Daily at 00:00 (via vercel.json)
 *
 * Security: Requires Authorization header with CRON_SECRET
 */
export async function GET(request: NextRequest) {
	// Verify Cron Secret
	const authHeader = request.headers.get("authorization");
	if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
		return NextResponse.json(
			{ success: false, message: "Unauthorized" },
			{ status: 401 },
		);
	}

	if (!prismaPaddy) {
		return NextResponse.json(
			{ success: false, message: "Database not available" },
			{ status: 500 },
		);
	}

	try {
		// Find all pending records
		const pendingRecords = await prismaPaddy.paddy.findMany({
			where: {
				syncStatus: "pending",
			},
			take: 10,
			orderBy: { createdAt: "asc" }, // Process oldest first
			select: { id: true },
		});

		console.log(
			`[Cron] Found ${pendingRecords.length} pending records to sync`,
		);

		const paddyIds = pendingRecords.map((r) => r.id);
		const results = await processBatchDriveSync(paddyIds);

		console.log(
			`[Cron] Sync completed. Success: ${results.success}, Failed: ${results.failed}`,
		);

		return NextResponse.json({
			message: "Sync job completed",
			...results,
		});
	} catch (error) {
		console.error("[Cron] Job failed:", error);
		return NextResponse.json(
			{
				success: false,
				message: "Cron job failed",
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
