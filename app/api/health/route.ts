import { NextResponse } from "next/server";
import { isGoogleDriveAvailable } from "@/lib/server/google-drive";
import { isMinioAvailable } from "@/lib/server/minio";
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
			minio: boolean;
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
		const minioAvailable = isMinioAvailable();
		const driveAvailable = isGoogleDriveAvailable();

		// Determine overall status
		const criticalServicesHealthy = dbHealth.paddy && dbHealth.geometry;
		const allServicesHealthy =
			criticalServicesHealthy &&
			(minioAvailable || !process.env.MINIO_ACCESS_KEY) &&
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
					minio: minioAvailable,
					googleDrive: driveAvailable,
				},
			},
		};

		// Add details for degraded/unhealthy status
		if (status !== "healthy") {
			health.details = {};
			if (!dbHealth.paddy) health.details.paddy = "Database unavailable";
			if (!dbHealth.geometry) health.details.geometry = "Database unavailable";
			if (!minioAvailable && process.env.MINIO_ACCESS_KEY)
				health.details.minio = "Storage not configured";
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
					storage: { minio: false, googleDrive: false },
				},
				details: { error: "Health check failed" },
			},
			{ status: 503 },
		);
	}
}
