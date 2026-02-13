import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { type Job, Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import type { CreatePaddyFarmSurveyDto } from "@/lib/server/survey-paddy/schema";
import {
	performSubmissionSave,
	type SubmissionContext,
} from "@/lib/server/survey-paddy/service";
import type { Photo } from "@/lib/server/survey-paddy/submission-handler";
import { createLogger } from "@/lib/server/utils/logger";

const logger = createLogger("SubmissionQueue");

const QUEUE_NAME = "survey-submissions";

const queueConcurrency = Number.parseInt(
	process.env.SURVEY_SUBMISSION_WORKER_CONCURRENCY ??
		process.env.SURVEY_SUBMISSION_QUEUE_CONCURRENCY ??
		"1",
	10,
);

type StoredPhoto = {
	path: string;
	originalname: string;
	mimetype: string;
};

type SubmissionJobData = {
	context: SerializedSubmissionContext;
	data: CreatePaddyFarmSurveyDto;
	photos: StoredPhoto[];
	tempDir: string;
};

type SerializedSubmissionContext = Omit<SubmissionContext, "dateOfVisit"> & {
	dateOfVisit: string;
};

type BullGlobals = {
	submissionQueue?: Queue<SubmissionJobData>;
	submissionWorker?: Worker<SubmissionJobData>;
	submissionConnection?: IORedis;
};

const globalForBull = global as unknown as BullGlobals;

function getRedisUrl(): string | null {
	return process.env.REDIS_URL ?? null;
}

function getRedisConnection(): IORedis | null {
	if (globalForBull.submissionConnection) {
		return globalForBull.submissionConnection;
	}

	const redisUrl = getRedisUrl();
	if (!redisUrl) {
		logger.warn("REDIS_URL not configured; submission queue disabled");
		return null;
	}

	globalForBull.submissionConnection = new IORedis(redisUrl, {
		maxRetriesPerRequest: null,
		enableReadyCheck: false,
	});

	return globalForBull.submissionConnection;
}

function getSubmissionQueue(): Queue<SubmissionJobData> | null {
	if (globalForBull.submissionQueue) return globalForBull.submissionQueue;

	const connection = getRedisConnection();
	if (!connection) return null;

	globalForBull.submissionQueue = new Queue<SubmissionJobData>(QUEUE_NAME, {
		connection,
		defaultJobOptions: {
			attempts: 3,
			backoff: { type: "exponential", delay: 2000 },
			removeOnComplete: 100,
			removeOnFail: 200,
		},
	});

	return globalForBull.submissionQueue;
}

async function persistPhotos(photos: Photo[]): Promise<{
	tempDir: string;
	stored: StoredPhoto[];
}> {
	const baseDir =
		process.env.SUBMISSION_QUEUE_TMP_DIR ??
		path.join("/tmp", "survey-submissions");
	await fs.mkdir(baseDir, { recursive: true });
	const tempDir = await fs.mkdtemp(path.join(baseDir, "job-"));

	const stored = await Promise.all(
		photos.map(async (photo, index) => {
			const ext = path.extname(photo.originalname) || ".bin";
			const fileName = `${index}-${Date.now()}${ext}`;
			const filePath = path.join(tempDir, fileName);
			await fs.writeFile(filePath, photo.buffer);
			return {
				path: filePath,
				originalname: photo.originalname,
				mimetype: photo.mimetype,
			};
		}),
	);

	return { tempDir, stored };
}

async function cleanupTempDir(tempDir: string): Promise<void> {
	await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
}

async function loadPhotos(storedPhotos: StoredPhoto[]): Promise<Photo[]> {
	return Promise.all(
		storedPhotos.map(async (photo) => {
			const buffer = await fs.readFile(photo.path);
			return {
				buffer,
				originalname: photo.originalname,
				mimetype: photo.mimetype,
			};
		}),
	);
}

function ensureWorker(): void {
	if (globalForBull.submissionWorker) return;

	const connection = getRedisConnection();
	if (!connection) return;

	const enabled = process.env.SURVEY_SUBMISSION_WORKER !== "false";
	if (!enabled) {
		logger.info(
			"Submission queue worker disabled via SURVEY_SUBMISSION_WORKER",
		);
		return;
	}

	globalForBull.submissionWorker = new Worker<SubmissionJobData>(
		QUEUE_NAME,
		async (job: Job<SubmissionJobData>) => {
			const { context, data, photos, tempDir } = job.data;
			const hydratedContext: SubmissionContext = {
				...context,
				dateOfVisit: new Date(context.dateOfVisit),
			};
			try {
				const loadedPhotos = await loadPhotos(photos);
				await performSubmissionSave(hydratedContext, data, loadedPhotos);
			} finally {
				await cleanupTempDir(tempDir);
			}
		},
		{
			connection,
			concurrency:
				Number.isFinite(queueConcurrency) && queueConcurrency > 0
					? queueConcurrency
					: 1,
		},
	);

	globalForBull.submissionWorker.on("failed", (job, error) => {
		logger.error("Submission job failed", error, {
			jobId: job?.id,
			fullFieldId: job?.data?.context?.fullFieldId,
		});
	});
}

ensureWorker();

export async function enqueueSubmissionSave(
	context: SubmissionContext,
	data: CreatePaddyFarmSurveyDto,
	photos: Photo[],
): Promise<string> {
	const jobId = randomUUID();
	const queue = getSubmissionQueue();

	if (!queue) {
		logger.warn("Submission queue unavailable; processing inline", {
			fullFieldId: context.fullFieldId,
		});
		performSubmissionSave(context, data, photos).catch((error) => {
			logger.error("Inline submission save failed", error, {
				fullFieldId: context.fullFieldId,
			});
		});
		return jobId;
	}

	let tempDir = "";
	try {
		const serializedContext: SerializedSubmissionContext = {
			...context,
			dateOfVisit: context.dateOfVisit.toISOString(),
		};
		const persisted = await persistPhotos(photos);
		tempDir = persisted.tempDir;

		const job = await queue.add("save-submission", {
			context: serializedContext,
			data,
			photos: persisted.stored,
			tempDir: persisted.tempDir,
		});

		return job.id ? String(job.id) : jobId;
	} catch (error) {
		if (tempDir) {
			await cleanupTempDir(tempDir);
		}
		logger.error("Failed to enqueue submission job", error, {
			fullFieldId: context.fullFieldId,
		});
		performSubmissionSave(context, data, photos).catch((innerError) => {
			logger.error("Fallback submission save failed", innerError, {
				fullFieldId: context.fullFieldId,
			});
		});
		return jobId;
	}
}

export async function getSubmissionQueueStats(): Promise<{
	size: number;
	pending: number;
}> {
	const queue = getSubmissionQueue();
	if (!queue) {
		return { size: 0, pending: 0 };
	}
	const [waiting, active] = await Promise.all([
		queue.getWaitingCount(),
		queue.getActiveCount(),
	]);
	return { size: waiting + active, pending: active };
}
