"use client";

import { useCallback, useState } from "react";

interface GeolocationState {
	latitude: string;
	longitude: string;
	loading: boolean;
	error: string | null;
}

export function useGeolocation() {
	const [state, setState] = useState<GeolocationState>({
		latitude: "",
		longitude: "",
		loading: false,
		error: null,
	});

	const getPosition = useCallback(() => {
		if (!navigator.geolocation) {
			setState((prev) => ({
				...prev,
				error: "Geolocation is not supported by your browser",
			}));
			return;
		}

		setState((prev) => ({ ...prev, loading: true, error: null }));

		navigator.geolocation.getCurrentPosition(
			(position) => {
				setState({
					latitude: position.coords.latitude.toFixed(6),
					longitude: position.coords.longitude.toFixed(6),
					loading: false,
					error: null,
				});
			},
			(error) => {
				let errorMessage = "Unable to retrieve location";
				switch (error.code) {
					case error.PERMISSION_DENIED:
						errorMessage = "Location permission denied";
						break;
					case error.POSITION_UNAVAILABLE:
						errorMessage = "Location information unavailable";
						break;
					case error.TIMEOUT:
						errorMessage = "Location request timed out";
						break;
				}
				setState((prev) => ({
					...prev,
					loading: false,
					error: errorMessage,
				}));
			},
			{
				enableHighAccuracy: true,
				timeout: 10000,
				maximumAge: 0,
			},
		);
	}, []);

	return {
		...state,
		getPosition,
	};
}
