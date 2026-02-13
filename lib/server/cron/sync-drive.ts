import { config } from "@/lib/server/config";
import { prismaPaddy } from "@/lib/server/prisma-paddy";
import { processBatchDriveSync } from "@/lib/server/survey-paddy/service";

export type DriveSyncSummary = {
	success: number;
	failed: number;
	total: number;
};

function resolveBatchSize(batchSize?: number): number {
	const fallback = config.sync.batchSize;
	if (typeof batchSize !== "number") return fallback;
	if (!Number.isFinite(batchSize) || batchSize <= 0) return fallback;
	return Math.floor(batchSize);
}

export async function syncPendingDriveRecords(options?: {
	batchSize?: number;
}): Promise<DriveSyncSummary> {
	if (!prismaPaddy) {
		throw new Error("Database not available");
	}

	const batchSize = resolveBatchSize(options?.batchSize);
	const pendingRecords = await prismaPaddy.paddySurvey.findMany({
		where: {
			syncStatus: "pending",
		},
		take: batchSize,
		orderBy: { createdAt: "asc" },
		select: { id: true },
	});

	const total = pendingRecords.length;
	if (total === 0) {
		return { success: 0, failed: 0, total: 0 };
	}

	const paddyIds = pendingRecords.map((record) => record.id);
	const results = await processBatchDriveSync(paddyIds);

	return { ...results, total };
}
