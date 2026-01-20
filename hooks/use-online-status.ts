"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
	cleanupOldSubmissions,
	getPendingCount,
	getPendingSubmissions,
	registerBackgroundSync,
	removeSubmission,
	saveOfflineSubmission,
} from "@/lib/offline-storage";

export function useOnlineStatus() {
	const [isOnline, setIsOnline] = useState(true);
	const [pendingCount, setPendingCount] = useState(0);
	const [isSyncing, setIsSyncing] = useState(false);
	const isSyncingRef = useRef(false);

	const loadPendingCount = useCallback(async () => {
		try {
			const count = await getPendingCount();
			setPendingCount(count);
		} catch (error) {
			console.error("[useOnlineStatus] Failed to get pending count:", error);
		}
	}, []);

	// Sync all pending submissions
	const syncPendingSubmissions = useCallback(async () => {
		if (!navigator.onLine || isSyncingRef.current) return;

		isSyncingRef.current = true;
		setIsSyncing(true);

		try {
			const pending = await getPendingSubmissions();
			console.log(
				"[useOnlineStatus] Found",
				pending.length,
				"pending submissions",
			);

			for (const submission of pending) {
				try {
					// Extract init data for authentication (stored with offline data)
					const initDataRaw = submission.formData._initDataRaw as
						| string
						| undefined;

					// Extract photos from stored data - ensure proper type
					const storedPhotos =
						(submission.formData.photos as Array<{
							name: string;
							type: string;
							base64: string;
						}>) || [];

					console.log(
						"[useOnlineStatus] Syncing submission with",
						storedPhotos.length,
						"stored photos",
					);

					// Prepare form data - remove internal fields
					const { _initDataRaw, photos, ...textFields } = submission.formData;

					// Build FormData with photos
					const formDataToSend = new FormData();

					// Add text fields
					for (const [key, value] of Object.entries(textFields)) {
						if (typeof value === "string") {
							formDataToSend.append(key, value);
						}
					}

					// Convert base64 photos back to files
					let photoCount = 0;
					for (const photo of storedPhotos) {
						try {
							// Convert base64 data URL to blob
							const response = await fetch(photo.base64);
							const blob = await response.blob();
							const file = new File([blob], photo.name, { type: photo.type });
							formDataToSend.append("photos", file, photo.name);
							photoCount++;
							console.log("[useOnlineStatus] Converted photo:", photo.name);
						} catch (photoError) {
							console.warn(
								"[useOnlineStatus] Failed to convert photo:",
								photo.name,
								photoError,
							);
						}
					}
					console.log(
						"[useOnlineStatus] Successfully converted",
						photoCount,
						"photos",
					);

					// Build headers
					const headers: Record<string, string> = {};
					if (initDataRaw) {
						headers["X-Telegram-Init-Data"] = initDataRaw;
					}

					const response = await fetch("/api/survey-paddy", {
						method: "POST",
						headers,
						body: formDataToSend,
					});

					if (response.ok) {
						await removeSubmission(submission.id);
						console.log(
							"[useOnlineStatus] Synced submission successfully with",
							photoCount,
							"photos",
						);
					} else if (response.status === 401) {
						// Auth error - remove from queue, retrying won't help
						await removeSubmission(submission.id);
						console.log(
							"[useOnlineStatus] Removed submission due to auth error (401)",
						);
					} else if (response.status === 413) {
						// Payload too large - remove from queue, data is too big to upload
						await removeSubmission(submission.id);
						console.log(
							"[useOnlineStatus] Removed submission due to payload too large (413)",
						);
					} else if (response.status >= 500) {
						// Server error (500, 502, 503, etc.) - remove from queue
						// These are usually database/backend issues that retrying won't fix
						await removeSubmission(submission.id);
						console.log(
							`[useOnlineStatus] Removed submission due to server error (${response.status})`,
						);
					}
					// Other 4xx errors - keep in queue, might be temporary
				} catch (error) {
					console.error(
						"[useOnlineStatus] Failed to sync submission:",
						submission.id,
						error,
					);
				}
			}

			await loadPendingCount();
		} finally {
			isSyncingRef.current = false;
			setIsSyncing(false);
		}
	}, [loadPendingCount]);

	// Update online status
	useEffect(() => {
		if (typeof window === "undefined") return;

		setIsOnline(navigator.onLine);

		const handleOnline = () => {
			setIsOnline(true);
			// Trigger sync when coming back online
			syncPendingSubmissions();
		};

		const handleOffline = () => {
			setIsOnline(false);
		};

		// Handler for service worker sync messages
		const handleSwMessage = (event: MessageEvent) => {
			if (event.data?.type === "SYNC_PENDING_SUBMISSIONS") {
				syncPendingSubmissions();
			}
		};

		window.addEventListener("online", handleOnline);
		window.addEventListener("offline", handleOffline);

		// Listen for service worker sync messages
		if ("serviceWorker" in navigator) {
			navigator.serviceWorker.addEventListener("message", handleSwMessage);
		}

		return () => {
			window.removeEventListener("online", handleOnline);
			window.removeEventListener("offline", handleOffline);
			// Clean up service worker listener to prevent memory leak
			if ("serviceWorker" in navigator) {
				navigator.serviceWorker.removeEventListener("message", handleSwMessage);
			}
		};
	}, [syncPendingSubmissions]);

	// Load pending count on mount, cleanup old submissions, and auto-sync if online
	useEffect(() => {
		const init = async () => {
			// Cleanup old submissions (older than 30 days or beyond 50 limit)
			await cleanupOldSubmissions().catch(() => {});
			await loadPendingCount();
			// Auto-sync if online and there are pending submissions
			if (navigator.onLine) {
				syncPendingSubmissions();
			}
		};
		init();
	}, [loadPendingCount, syncPendingSubmissions]);

	// Save submission for offline sync
	const saveForOffline = useCallback(
		async (formData: Record<string, unknown>) => {
			try {
				await saveOfflineSubmission(formData);
				await loadPendingCount();
				await registerBackgroundSync();
				return true;
			} catch (error) {
				console.error("[useOnlineStatus] Failed to save offline:", error);
				return false;
			}
		},
		[loadPendingCount],
	);

	return {
		isOnline,
		pendingCount,
		isSyncing,
		saveForOffline,
		syncPendingSubmissions,
	};
}
