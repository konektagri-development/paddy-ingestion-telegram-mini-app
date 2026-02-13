import cron, { type ScheduledTask } from "node-cron";
import { syncPendingDriveRecords } from "./sync-drive";

/**
 * Global variable to track cron task across HMR in development
 */
const globalForCron = global as unknown as {
	driveSyncTask?: ScheduledTask;
};

export type DriveSyncCronOptions = {
	schedule?: string;
	timezone?: string;
	runOnStart?: boolean;
	batchSize?: number;
	enabled?: boolean;
};

const DEFAULT_SCHEDULE = "0 12 * * *";

function parseBatchSize(value?: string): number | undefined {
	if (!value) return undefined;
	const parsed = Number.parseInt(value, 10);
	if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
	return parsed;
}

export function startDriveSyncCron(
	options: DriveSyncCronOptions = {},
): ScheduledTask | null {
	if (globalForCron.driveSyncTask) {
		console.log("[Cron] sync-drive job already scheduled, skipping");
		return globalForCron.driveSyncTask;
	}
	const schedule =
		options.schedule ?? process.env.CRON_SCHEDULE ?? DEFAULT_SCHEDULE;
	const timezone = options.timezone ?? process.env.CRON_TIMEZONE;
	const runOnStart =
		options.runOnStart ?? process.env.CRON_RUN_ON_START === "true";
	const enabled = options.enabled ?? process.env.CRON_ENABLED !== "false";

	const batchSize =
		typeof options.batchSize === "number"
			? options.batchSize
			: parseBatchSize(process.env.SYNC_BATCH_SIZE);

	if (!enabled) {
		console.log("[Cron] sync-drive is disabled");
		return null;
	}

	if (!cron.validate(schedule)) {
		console.error(`[Cron] Invalid schedule: ${schedule}`);
		return null;
	}

	let isRunning = false;

	const runSync = async (): Promise<void> => {
		if (isRunning) {
			console.log("[Cron] Previous sync still running, skipping this tick");
			return;
		}

		isRunning = true;
		try {
			const results = await syncPendingDriveRecords({ batchSize });
			console.log(`[Cron] Found ${results.total} pending records to sync`);
			console.log(
				`[Cron] Sync completed. Success: ${results.success}, Failed: ${results.failed}`,
			);
		} catch (error) {
			console.error("[Cron] Job failed:", error);
		} finally {
			isRunning = false;
		}
	};

	console.log(
		`[Cron] Scheduled sync-drive job: ${schedule}${timezone ? ` (${timezone})` : ""}`,
	);

	if (runOnStart) {
		console.log("[Cron] Running sync job on start");
		void runSync();
	}

	const task = cron.schedule(
		schedule,
		() => {
			void runSync();
		},
		timezone ? { timezone } : undefined,
	);

	globalForCron.driveSyncTask = task;
	return task;
}
