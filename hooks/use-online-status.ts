"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
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

			for (const submission of pending) {
				try {
					const apiUrl =
						process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v3";

					// Extract init data for authentication (stored with offline data)
					const initDataRaw = submission.formData._initDataRaw as
						| string
						| undefined;

					// Prepare form data without the internal _initDataRaw field
					const { _initDataRaw, ...formDataToSend } = submission.formData;

					// Build headers with authentication if available
					const headers: Record<string, string> = {
						"Content-Type": "application/json",
					};
					if (initDataRaw) {
						headers["X-Telegram-Init-Data"] = initDataRaw;
					}

					const response = await fetch(`${apiUrl}/paddy-farm-survey`, {
						method: "POST",
						headers,
						body: JSON.stringify(formDataToSend),
					});

					if (response.ok) {
						await removeSubmission(submission.id);
					} else if (response.status === 401) {
						// Auth error - remove from queue, retrying won't help
						await removeSubmission(submission.id);
					}
					// Other errors (500, 503, etc.) - keep in queue for retry
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

		window.addEventListener("online", handleOnline);
		window.addEventListener("offline", handleOffline);

		// Listen for service worker sync messages
		if ("serviceWorker" in navigator) {
			navigator.serviceWorker.addEventListener("message", (event) => {
				if (event.data?.type === "SYNC_PENDING_SUBMISSIONS") {
					syncPendingSubmissions();
				}
			});
		}

		return () => {
			window.removeEventListener("online", handleOnline);
			window.removeEventListener("offline", handleOffline);
		};
	}, [syncPendingSubmissions]);

	// Load pending count on mount and auto-sync if online
	useEffect(() => {
		const init = async () => {
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
