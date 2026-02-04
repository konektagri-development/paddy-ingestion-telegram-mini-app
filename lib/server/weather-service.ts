/**
 * Weather Service
 * Fetches current weather data using the Open-Meteo API (free, no API key required)
 */

export interface WeatherData {
	temperature: number; // Temperature in Celsius
	humidity: number; // Relative humidity percentage
	precipitation: number; // Precipitation in mm
}

/**
 * Fetches current weather data for a given location
 * Uses Open-Meteo API which is free and doesn't require an API key
 *
 * @param lat - Latitude as string
 * @param lon - Longitude as string
 * @returns Weather data or null if fetch fails
 */
export async function getWeatherAtLocation(
	lat: string,
	lon: string,
): Promise<WeatherData | null> {
	try {
		const response = await fetch(
			`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation`,
			{
				method: "GET",
				headers: {
					Accept: "application/json",
				},
			},
		);

		if (!response.ok) {
			console.warn(
				"[WeatherService] Failed to fetch weather data:",
				response.status,
			);
			return null;
		}

		const data = await response.json();

		return {
			temperature: data.current.temperature_2m,
			humidity: data.current.relative_humidity_2m,
			precipitation: data.current.precipitation,
		};
	} catch (error) {
		console.warn("[WeatherService] Error fetching weather data:", error);
		return null;
	}
}
