/**
 * Shared API Response Types
 * Provides consistent typing for all API endpoints
 */

/**
 * Base API response structure
 */
export interface ApiResponse<T = unknown> {
	success: boolean;
	message?: string;
	data?: T;
	errors?: string[];
}

/**
 * Survey submission response with location and photo info
 */
export interface SurveySubmissionResponse extends ApiResponse {
	locationCode?: string;
	photosUploaded?: number;
	status?: string;
}

/**
 * Authentication response with token
 */
export interface AuthResponse extends ApiResponse {
	token?: string;
	expiresIn?: number;
}

/**
 * Health check response
 */
export interface HealthCheckResponse extends ApiResponse {
	database?: "connected" | "disconnected";
	storage?: "connected" | "disconnected";
	timestamp?: string;
}

/**
 * Sync status for cron jobs
 */
export interface SyncResponse extends ApiResponse {
	synced?: number;
	failed?: number;
	pending?: number;
}
