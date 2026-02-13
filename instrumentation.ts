export async function register() {
	if (process.env.NEXT_RUNTIME === "nodejs") {
		const { startDriveSyncCron } = await import(
			"@/lib/server/cron/sync-drive-scheduler"
		);
		startDriveSyncCron();
	}
}
