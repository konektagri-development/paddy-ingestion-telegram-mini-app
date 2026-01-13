/**
 * Offline Storage Utility
 * Uses IndexedDB to store form submissions when offline
 */

const DB_NAME = "rice-field-app";
const DB_VERSION = 1;
const STORE_NAME = "pending-submissions";

// Cleanup settings
const MAX_AGE_DAYS = 30;
const MAX_SUBMISSIONS = 50;

interface PendingSubmission {
	id: string;
	timestamp: number;
	formData: OfflineFormData;
	retryCount: number;
}

export interface OfflineFormData {
	[key: string]: unknown;
	// Photos stored as base64 for offline sync
	photos?: Array<{
		name: string;
		type: string;
		base64: string;
	}>;
}

// Open IndexedDB connection
function openDB(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);

		request.onerror = () => {
			console.error("[OfflineStorage] Failed to open database");
			reject(request.error);
		};

		request.onsuccess = () => {
			resolve(request.result);
		};

		request.onupgradeneeded = (event) => {
			const db = (event.target as IDBOpenDBRequest).result;

			// Create object store for pending submissions
			if (!db.objectStoreNames.contains(STORE_NAME)) {
				const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
				store.createIndex("timestamp", "timestamp", { unique: false });
			}
		};
	});
}

// Generate unique ID
function generateId(): string {
	return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// Save form submission to IndexedDB
export async function saveOfflineSubmission(
	formData: OfflineFormData,
): Promise<string> {
	const db = await openDB();

	return new Promise((resolve, reject) => {
		const transaction = db.transaction(STORE_NAME, "readwrite");
		const store = transaction.objectStore(STORE_NAME);

		const submission: PendingSubmission = {
			id: generateId(),
			timestamp: Date.now(),
			formData,
			retryCount: 0,
		};

		const request = store.add(submission);

		request.onsuccess = () => {
			resolve(submission.id);
		};

		request.onerror = () => {
			console.error("[OfflineStorage] Failed to save submission");
			reject(request.error);
		};

		transaction.oncomplete = () => {
			db.close();
		};
	});
}

// Get all pending submissions
export async function getPendingSubmissions(): Promise<PendingSubmission[]> {
	const db = await openDB();

	return new Promise((resolve, reject) => {
		const transaction = db.transaction(STORE_NAME, "readonly");
		const store = transaction.objectStore(STORE_NAME);
		const request = store.getAll();

		request.onsuccess = () => {
			resolve(request.result);
		};

		request.onerror = () => {
			reject(request.error);
		};

		transaction.oncomplete = () => {
			db.close();
		};
	});
}

// Remove a submission after successful sync
export async function removeSubmission(id: string): Promise<void> {
	const db = await openDB();

	return new Promise((resolve, reject) => {
		const transaction = db.transaction(STORE_NAME, "readwrite");
		const store = transaction.objectStore(STORE_NAME);
		const request = store.delete(id);

		request.onsuccess = () => {
			resolve();
		};

		request.onerror = () => {
			reject(request.error);
		};

		transaction.oncomplete = () => {
			db.close();
		};
	});
}

// Update retry count for a submission
export async function updateRetryCount(
	id: string,
	retryCount: number,
): Promise<void> {
	const db = await openDB();

	return new Promise((resolve, reject) => {
		const transaction = db.transaction(STORE_NAME, "readwrite");
		const store = transaction.objectStore(STORE_NAME);
		const getRequest = store.get(id);

		getRequest.onsuccess = () => {
			const submission = getRequest.result;
			if (submission) {
				submission.retryCount = retryCount;
				store.put(submission);
			}
			resolve();
		};

		getRequest.onerror = () => {
			reject(getRequest.error);
		};

		transaction.oncomplete = () => {
			db.close();
		};
	});
}

// Get count of pending submissions
export async function getPendingCount(): Promise<number> {
	const db = await openDB();

	return new Promise((resolve, reject) => {
		const transaction = db.transaction(STORE_NAME, "readonly");
		const store = transaction.objectStore(STORE_NAME);
		const request = store.count();

		request.onsuccess = () => {
			resolve(request.result);
		};

		request.onerror = () => {
			reject(request.error);
		};

		transaction.oncomplete = () => {
			db.close();
		};
	});
}

// Check if browser is online
export function isOnline(): boolean {
	return typeof navigator !== "undefined" ? navigator.onLine : true;
}

// Register for background sync
export async function registerBackgroundSync(): Promise<void> {
	if ("serviceWorker" in navigator && "SyncManager" in window) {
		try {
			const registration = await navigator.serviceWorker.ready;
			await (
				registration as unknown as {
					sync: { register: (tag: string) => Promise<void> };
				}
			).sync.register("sync-form-submissions");
		} catch (error) {
			console.error(
				"[OfflineStorage] Background sync registration failed:",
				error,
			);
		}
	}
}

/**
 * Cleanup old submissions:
 * - Delete submissions older than MAX_AGE_DAYS (30 days)
 * - Keep only MAX_SUBMISSIONS (50) most recent entries
 * Should be called on app startup
 */
export async function cleanupOldSubmissions(): Promise<number> {
	const db = await openDB();
	let deletedCount = 0;

	return new Promise((resolve, reject) => {
		const transaction = db.transaction(STORE_NAME, "readwrite");
		const store = transaction.objectStore(STORE_NAME);
		const index = store.index("timestamp");
		const request = index.getAll();

		request.onsuccess = async () => {
			const submissions: PendingSubmission[] = request.result;

			// Calculate cutoff timestamp (30 days ago)
			const cutoffTime = Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

			// Sort by timestamp (newest first)
			submissions.sort((a, b) => b.timestamp - a.timestamp);

			const toDelete: string[] = [];

			submissions.forEach((submission, idx) => {
				// Delete if older than 30 days
				if (submission.timestamp < cutoffTime) {
					toDelete.push(submission.id);
				}
				// Delete if beyond the max limit of 50
				else if (idx >= MAX_SUBMISSIONS) {
					toDelete.push(submission.id);
				}
			});

			// Delete identified submissions
			for (const id of toDelete) {
				store.delete(id);
				deletedCount++;
			}

			if (deletedCount > 0) {
				console.log(
					`[OfflineStorage] Cleaned up ${deletedCount} old submissions`,
				);
			}
		};

		request.onerror = () => {
			reject(request.error);
		};

		transaction.oncomplete = () => {
			db.close();
			resolve(deletedCount);
		};
	});
}
