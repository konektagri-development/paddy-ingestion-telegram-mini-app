/**
 * Prisma Client singleton for the paddy database
 * Following Prisma best practices for Next.js:
 * https://www.prisma.io/docs/guides/nextjs
 *
 * Configured for Vercel serverless with SSL support
 */

import { PrismaPg } from "@prisma/adapter-pg";
import { dbConfig } from "@/lib/server/config";
import { PrismaClient } from "../../prisma-paddy-database/paddy-database-client-types/client";

// Global type declaration for the Prisma client
const globalForPrisma = global as unknown as {
	prismaPaddy: PrismaClient | undefined;
};

/**
 * Get the Prisma client instance for the paddy database.
 * Returns null if POSTGRES_PADDY_DATABASE_URL is not configured.
 */
function createPrismaClient(): PrismaClient | null {
	const connectionString = process.env.POSTGRES_PADDY_DATABASE_URL;
	if (!connectionString) {
		console.warn("[Prisma Paddy] POSTGRES_PADDY_DATABASE_URL not configured");
		return null;
	}

	// Log connection attempt (without exposing credentials)
	try {
		const url = new URL(connectionString);
		console.log(`[Prisma Paddy] Connecting to ${url.host}${url.pathname}`);
	} catch {
		console.error("[Prisma Paddy] Invalid connection string format");
		return null;
	}

	// Create adapter with PoolConfig - Prisma will manage the pool internally
	// This ensures the query compiler uses the correct connection string
	// Only enable SSL if explicitly required (via sslmode in URL or DB_SSL env)
	const useSSL =
		connectionString.includes("sslmode=") || process.env.DB_SSL === "true";

	const adapter = new PrismaPg({
		connectionString,
		max: dbConfig.poolSize,
		connectionTimeoutMillis: dbConfig.timeout,
		idleTimeoutMillis: 30000,
		ssl: useSSL ? { rejectUnauthorized: false } : undefined,
	});

	// Enable query logging in development
	const prisma = new PrismaClient({
		adapter,
		log:
			process.env.NODE_ENV === "development"
				? ["query", "error", "warn"]
				: ["error"],
	});

	return prisma;
}

// Create or reuse the singleton instance
const prismaPaddy = globalForPrisma.prismaPaddy ?? createPrismaClient();

// In development, attach to global to prevent hot-reload issues
if (process.env.NODE_ENV !== "production" && prismaPaddy) {
	globalForPrisma.prismaPaddy = prismaPaddy;
}

export { prismaPaddy };
