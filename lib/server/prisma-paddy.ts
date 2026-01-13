/**
 * Prisma Client singleton for the paddy database
 * Following Prisma best practices for Next.js:
 * https://www.prisma.io/docs/guides/nextjs
 */

import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
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
		console.warn("POSTGRES_PADDY_DATABASE_URL not configured");
		return null;
	}

	// Create connection pool with optimized settings
	const pool = new Pool({
		connectionString,
		max: dbConfig.poolSize,
		connectionTimeoutMillis: dbConfig.timeout,
		idleTimeoutMillis: 30000, // Close idle connections after 30s
	});

	const adapter = new PrismaPg(pool);

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
