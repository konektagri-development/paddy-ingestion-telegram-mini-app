import "dotenv/config";
import { startDriveSyncCron } from "../../lib/server/cron/sync-drive-scheduler";

const task = startDriveSyncCron();
if (!task) {
	process.exit(1);
}
