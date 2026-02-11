import { NextResponse } from "next/server";
import { isGcsAvailable } from "@/lib/server/gcs";
import { isGoogleDriveAvailable } from "@/lib/server/google-drive";
import { prismaGeometry } from "@/lib/server/prisma-geometry";
import { prismaPaddy } from "@/lib/server/prisma-paddy";
import { logger } from "@/lib/server/utils/logger";

interface HealthStatus {
	status: "healthy" | "degraded" | "unhealthy";
	timestamp: string;
	services: {
		database: {
			paddy: boolean;
			geometry: boolean;
		};
		storage: {
			gcs: boolean;
			googleDrive: boolean;
		};
	};
	details?: {
		[key: string]: string;
	};
}

/**
 * Check database connectivity
 */
async function checkDatabaseHealth(): Promise<{
	paddy: boolean;
	geometry: boolean;
}> {
	const results = {
		paddy: false,
		geometry: false,
	};

	// Check Paddy database
	if (prismaPaddy) {
		try {
			await prismaPaddy.$queryRaw`SELECT 1`;
			results.paddy = true;
		} catch (error) {
			logger.error("Paddy database health check failed", error);
		}
	}

	// Check Geometry database
	if (prismaGeometry) {
		try {
			await prismaGeometry.$queryRaw`SELECT 1`;
			results.geometry = true;
		} catch (error) {
			logger.error("Geometry database health check failed", error);
		}
	}

	return results;
}

/**
 * Health check endpoint
 * GET /api/health
 */
export async function GET() {
	try {
		const dbHealth = await checkDatabaseHealth();
		const gcsAvailable = isGcsAvailable();
		const driveAvailable = isGoogleDriveAvailable();

		// Determine overall status
		const criticalServicesHealthy = dbHealth.paddy && dbHealth.geometry;
		const allServicesHealthy =
			criticalServicesHealthy &&
			(gcsAvailable || !process.env.GCS_BUCKET) &&
			(driveAvailable || !process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID);

		let status: HealthStatus["status"];
		if (!criticalServicesHealthy) {
			status = "unhealthy";
		} else if (!allServicesHealthy) {
			status = "degraded";
		} else {
			status = "healthy";
		}

		const health: HealthStatus = {
			status,
			timestamp: new Date().toISOString(),
			services: {
				database: dbHealth,
				storage: {
					gcs: gcsAvailable,
					googleDrive: driveAvailable,
				},
			},
		};

		// Add details for degraded/unhealthy status
		if (status !== "healthy") {
			health.details = {};
			if (!dbHealth.paddy) health.details.paddy = "Database unavailable";
			if (!dbHealth.geometry) health.details.geometry = "Database unavailable";
			if (!gcsAvailable && process.env.GCS_BUCKET)
				health.details.gcs = "Storage not configured";
			if (!driveAvailable && process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID)
				health.details.googleDrive = "Drive not configured";
		}

		const statusCode =
			status === "healthy" ? 200 : status === "degraded" ? 200 : 503;

		return NextResponse.json(health, { status: statusCode });
	} catch (error) {
		logger.error("Health check failed", error);
		return NextResponse.json(
			{
				status: "unhealthy" as const,
				timestamp: new Date().toISOString(),
				services: {
					database: { paddy: false, geometry: false },
					storage: { gcs: false, googleDrive: false },
				},
				details: { error: "Health check failed" },
			},
			{ status: 503 },
		);
	}
}
