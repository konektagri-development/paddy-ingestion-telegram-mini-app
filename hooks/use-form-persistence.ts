"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FormData } from "@/lib/form-types";
import { initialFormData } from "@/lib/form-types";

const STORAGE_KEY = "agrikredit-form-draft";
const DEBOUNCE_MS = 500;

/**
 * Hook to persist form data in localStorage
 * Automatically saves on changes and restores on mount
 */
export function useFormPersistence() {
	const [formData, setFormData] = useState<FormData>(initialFormData);
	const [isLoaded, setIsLoaded] = useState(false);
	const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

	// Load saved form data on mount
	useEffect(() => {
		try {
			const saved = localStorage.getItem(STORAGE_KEY);
			if (saved) {
				const parsed = JSON.parse(saved) as FormData;
				setFormData(parsed);
				console.log("[FormPersistence] Restored form data from localStorage");
			}
		} catch (error) {
			console.error("[FormPersistence] Failed to load saved data:", error);
		}
		setIsLoaded(true);
	}, []);

	// Save form data to localStorage (debounced)
	const saveToStorage = useCallback((data: FormData) => {
		// Clear existing timeout
		if (saveTimeoutRef.current) {
			clearTimeout(saveTimeoutRef.current);
		}

		// Debounce saves to prevent excessive writes
		saveTimeoutRef.current = setTimeout(() => {
			try {
				// Don't save photos (too large for localStorage)
				const dataToSave = {
					...data,
					photos: [], // Photos are handled separately
				};
				localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
				console.log("[FormPersistence] Saved form data to localStorage");
			} catch (error) {
				console.error("[FormPersistence] Failed to save data:", error);
			}
		}, DEBOUNCE_MS);
	}, []);

	// Update form data and trigger save
	const updateFormData = useCallback(
		(updates: Partial<FormData>) => {
			setFormData((prev) => {
				const newData = { ...prev, ...updates };
				saveToStorage(newData);
				return newData;
			});
		},
		[saveToStorage],
	);

	// Clear saved form data (call after successful submission)
	const clearSavedData = useCallback(() => {
		try {
			localStorage.removeItem(STORAGE_KEY);
			setFormData(initialFormData);
			console.log("[FormPersistence] Cleared saved form data");
		} catch (error) {
			console.error("[FormPersistence] Failed to clear data:", error);
		}
	}, []);

	// Cleanup timeout on unmount
	useEffect(() => {
		return () => {
			if (saveTimeoutRef.current) {
				clearTimeout(saveTimeoutRef.current);
			}
		};
	}, []);

	return {
		formData,
		updateFormData,
		clearSavedData,
		isLoaded,
	};
}
