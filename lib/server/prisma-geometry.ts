/**
 * Prisma Client singleton for the geometry database
 * Following Prisma best practices for Next.js:
 * https://www.prisma.io/docs/guides/nextjs
 *
 * This creates a single Prisma Client instance and attaches it to the global object
 * to prevent creating multiple instances during Next.js hot reloading in development.
 */

import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { dbConfig } from "@/lib/server/config";
import { PrismaClient } from "../../prisma-geometry-database/geometry-database-client-types/client";

// Global type declaration for the Prisma client
const globalForPrisma = global as unknown as {
	prismaGeometry: PrismaClient | undefined;
};

/**
 * Get the Prisma client instance for the geometry database.
 * Returns null if POSTGRES_GEOMETRY_DATABASE_URL is not configured.
 */
function createPrismaClient(): PrismaClient | null {
	const connectionString = process.env.POSTGRES_GEOMETRY_DATABASE_URL;
	if (!connectionString) {
		console.warn("POSTGRES_GEOMETRY_DATABASE_URL not configured");
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
const prismaGeometry = globalForPrisma.prismaGeometry ?? createPrismaClient();

// In development, attach to global to prevent hot-reload issues
if (process.env.NODE_ENV !== "production" && prismaGeometry) {
	globalForPrisma.prismaGeometry = prismaGeometry;
}

export { prismaGeometry };
