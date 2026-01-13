import { locationConfig } from "@/lib/server/config";
import { prismaGeometry } from "@/lib/server/prisma-geometry";
import { LRUCache } from "@/lib/server/utils/cache";
import { createLogger } from "@/lib/server/utils/logger";

const logger = createLogger("AdministrativeDivisions");

// LRU cache for location lookups (lat,lng -> LocationInfo)
const locationCache = new LRUCache<string, LocationInfo>(
	locationConfig.cacheSize,
);

export interface LocationInfo {
	locationCode: string;
	provinceName: string;
	districtName: string;
	communeName: string;
}

/**
 * Khmer ordinal number suffixes and their numeric equivalents
 */
const KHMER_NUMBERS: Record<string, string> = {
	"Ti Muoy": "1",
	"Ti Pir": "2",
	"Ti Bei": "3",
	"Ti Buon": "4",
	"Ti Pram": "5",
	"Ti Pram Muoy": "6",
	"Ti Pram Pir": "7",
	"Ti Pram Bei": "8",
	"Ti Pram Buon": "9",
	"Ti Dop": "10",
};

/**
 * Get location code from GPS coordinates using PostGIS.
 * Generates and saves localCode if not present in database.
 * Throws error if no location found.
 */
export async function getLocationCode(
	latitude: number,
	longitude: number,
): Promise<LocationInfo> {
	if (!prismaGeometry) {
		throw new Error("Geometry database not configured");
	}

	// Round coordinates to 6 decimal places for cache key (~0.1m precision)
	const roundedLat = Math.round(latitude * 1000000) / 1000000;
	const roundedLng = Math.round(longitude * 1000000) / 1000000;
	const cacheKey = `${roundedLat},${roundedLng}`;

	// Check cache first
	const cached = locationCache.get(cacheKey);
	if (cached) {
		logger.debug("Location found in cache", {
			latitude,
			longitude,
			locationCode: cached.locationCode,
		});
		return cached;
	}

	logger.debug("Location cache miss, querying database", {
		latitude,
		longitude,
	});

	// Find commune containing the point (includes district and province via joins)
	const result = await prismaGeometry.$queryRaw<
		Array<{
			province_id: string;
			province_code: string | null;
			province_name: string;
			district_id: string;
			district_code: string | null;
			district_name: string;
			commune_id: string;
			commune_code: string | null;
			commune_name: string;
		}>
	>`
		SELECT 
			p.id AS province_id,
			p."localCode" AS province_code,
			p."nameEn" AS province_name,
			d.id AS district_id,
			d."localCode" AS district_code,
			d."nameEn" AS district_name,
			c.id AS commune_id,
			c."localCode" AS commune_code,
			c."nameEn" AS commune_name
		FROM geometry.commune c
		JOIN geometry.district d ON c."districtId" = d.id
		JOIN geometry.province p ON d."provinceId" = p.id
		WHERE ST_Contains(c.geoboundary, ST_SetSRID(ST_Point(${longitude}, ${latitude}), 4326))
		LIMIT 1
	`;

	if (result.length === 0) {
		logger.warn("No administrative division found for coordinates", {
			latitude,
			longitude,
		});
		throw new Error(
			`No administrative division found containing coordinates (${latitude}, ${longitude})`,
		);
	}

	const row = result[0];

	// Ensure all codes exist (generate and save if missing)
	const provinceCode = await ensureProvinceCode(
		row.province_id,
		row.province_code,
		row.province_name,
	);
	const districtCode = await ensureDistrictCode(
		row.district_id,
		row.district_code,
		row.district_name,
	);
	const communeCode = await ensureCommuneCode(
		row.commune_id,
		row.commune_code,
		row.commune_name,
	);

	const locationCode = `${provinceCode}-${districtCode}-${communeCode}`;

	const locationInfo: LocationInfo = {
		locationCode,
		provinceName: row.province_name,
		districtName: row.district_name,
		communeName: row.commune_name,
	};

	// Cache the result
	locationCache.set(cacheKey, locationInfo);
	logger.info("Location lookup completed", {
		latitude,
		longitude,
		locationCode,
	});

	return locationInfo;
}

// ==================== ENSURE CODE EXISTS ====================

async function ensureProvinceCode(
	id: string,
	existingCode: string | null,
	name: string,
): Promise<string> {
	if (existingCode) return existingCode;

	const existingCodes = await getExistingProvinceCodes();
	const code = generateUniqueCode(name, existingCodes);

	// Save to database
	if (!prismaGeometry) throw new Error("Geometry database not available");
	await prismaGeometry.$executeRaw`
		UPDATE geometry.province SET "localCode" = ${code} WHERE id = ${id}::uuid
	`;

	logger.info("Generated localCode for province", { code, name });
	return code;
}

async function ensureDistrictCode(
	id: string,
	existingCode: string | null,
	name: string,
): Promise<string> {
	if (existingCode) return existingCode;

	const existingCodes = await getExistingDistrictCodes();
	const code = generateUniqueCode(name, existingCodes);

	// Save to database
	if (!prismaGeometry) throw new Error("Geometry database not available");
	await prismaGeometry.$executeRaw`
		UPDATE geometry.district SET "localCode" = ${code} WHERE id = ${id}::uuid
	`;

	logger.info("Generated localCode for district", { code, name });
	return code;
}

async function ensureCommuneCode(
	id: string,
	existingCode: string | null,
	name: string,
): Promise<string> {
	if (existingCode) return existingCode;

	const existingCodes = await getExistingCommuneCodes();
	const code = generateUniqueCode(name, existingCodes);

	// Save to database
	if (!prismaGeometry) throw new Error("Geometry database not available");
	await prismaGeometry.$executeRaw`
		UPDATE geometry.commune SET "localCode" = ${code} WHERE id = ${id}::uuid
	`;

	logger.info("Generated localCode for commune", { code, name });
	return code;
}

// ==================== GET EXISTING CODES ====================

async function getExistingProvinceCodes(): Promise<Set<string>> {
	if (!prismaGeometry) return new Set();
	const provinces = await prismaGeometry.$queryRaw<
		Array<{ localCode: string | null }>
	>`
		SELECT "localCode" FROM geometry.province WHERE "localCode" IS NOT NULL
	`;
	return new Set(provinces.map((p) => p.localCode).filter(Boolean) as string[]);
}

async function getExistingDistrictCodes(): Promise<Set<string>> {
	if (!prismaGeometry) return new Set();
	const districts = await prismaGeometry.$queryRaw<
		Array<{ localCode: string | null }>
	>`
		SELECT "localCode" FROM geometry.district WHERE "localCode" IS NOT NULL
	`;
	return new Set(districts.map((d) => d.localCode).filter(Boolean) as string[]);
}

async function getExistingCommuneCodes(): Promise<Set<string>> {
	if (!prismaGeometry) return new Set();
	const communes = await prismaGeometry.$queryRaw<
		Array<{ localCode: string | null }>
	>`
		SELECT "localCode" FROM geometry.commune WHERE "localCode" IS NOT NULL
	`;
	return new Set(communes.map((c) => c.localCode).filter(Boolean) as string[]);
}

// ==================== CODE GENERATION ====================

/**
 * Generate a unique 3-letter code from the name.
 */
function generateUniqueCode(name: string, existingCodes: Set<string>): string {
	const baseCode = generateBaseCode(name);

	if (!existingCodes.has(baseCode)) {
		return baseCode;
	}

	// Handle collision with numeric suffix
	for (let suffix = 2; suffix <= 9; suffix++) {
		const candidateCode = `${baseCode.substring(0, 2)}${suffix}`;
		if (!existingCodes.has(candidateCode)) {
			return candidateCode;
		}
	}

	// Fallback: try different letter combinations
	const words = name.replace(/[^a-zA-Z\s]/g, "").split(/\s+/);
	for (let i = 0; i < words.length; i++) {
		for (let j = 0; j < words.length; j++) {
			if (i !== j && words[i] && words[j]) {
				const wordI = words[i] as string;
				const wordJ = words[j] as string;
				const candidate =
					`${wordI[0]}${wordJ[0]}${wordI[1] || "X"}`.toUpperCase();
				if (candidate.length === 3 && !existingCodes.has(candidate)) {
					return candidate;
				}
			}
		}
	}

	// Last resort: use hash-based code
	const hashCode = hashString(name);
	return hashCode.substring(0, 3).toUpperCase();
}

/**
 * Generate a base 3-letter code from name, handling Khmer number suffixes.
 */
function generateBaseCode(name: string): string {
	const vowels = new Set(["a", "e", "i", "o", "u"]);

	// Check for Khmer number suffixes first
	let suffix = "";
	let baseName = name;

	// Check longer suffixes first
	const sortedSuffixes = Object.keys(KHMER_NUMBERS).sort(
		(a, b) => b.length - a.length,
	);
	for (const khmerNum of sortedSuffixes) {
		if (name.endsWith(khmerNum)) {
			suffix = KHMER_NUMBERS[khmerNum];
			baseName = name.slice(0, -khmerNum.length).trim();
			break;
		}
	}

	// Clean name: remove common suffixes and non-alpha characters
	const cleanName = baseName
		.replace(/\s+(province|district|commune|sangkat)$/i, "")
		.replace(/[^a-zA-Z\s]/g, "")
		.trim();

	const words = cleanName.split(/\s+/).filter((w) => w.length > 0);

	if (words.length === 0) {
		return suffix ? `XX${suffix}` : "XXX";
	}

	// If we have a Khmer number suffix, generate initials + number
	if (suffix) {
		// Take first letter of each word (up to 2 letters) + number suffix
		if (words.length >= 2) {
			const letter1 = (words[0] as string)[0]?.toUpperCase() ?? "X";
			const letter2 = (words[1] as string)[0]?.toUpperCase() ?? "X";
			return `${letter1}${letter2}${suffix}`;
		}
		// Single word + number
		const word = words[0] as string;
		const letters: string[] = [];
		letters.push(word[0]?.toUpperCase() ?? "X");
		for (let i = 1; i < word.length && letters.length < 2; i++) {
			const char = word[i];
			if (char && !vowels.has(char.toLowerCase())) {
				letters.push(char.toUpperCase());
			}
		}
		while (letters.length < 2) {
			letters.push("X");
		}
		return `${letters.join("")}${suffix}`;
	}

	// Short name (3 letters or less): use all letters
	if (cleanName.replace(/\s/g, "").length <= 3) {
		return cleanName.replace(/\s/g, "").toUpperCase().padEnd(3, "X");
	}

	// Single word: extract consonants
	if (words.length === 1) {
		const word = words[0] as string;
		const letters: string[] = [];

		letters.push(word[0]?.toUpperCase() ?? "X");

		for (let i = 1; i < word.length && letters.length < 3; i++) {
			const char = word[i];
			if (char && !vowels.has(char.toLowerCase())) {
				letters.push(char.toUpperCase());
			}
		}

		for (let i = 1; i < word.length && letters.length < 3; i++) {
			const char = word[i];
			if (char && vowels.has(char.toLowerCase())) {
				letters.push(char.toUpperCase());
			}
		}

		while (letters.length < 3) {
			letters.push("X");
		}

		return letters.slice(0, 3).join("");
	}

	// For 3+ words: use first letter of first 3 words (e.g., "Boeng Keng Kang" → "BKK")
	if (words.length >= 3) {
		const letter1 = (words[0] as string)[0]?.toUpperCase() ?? "X";
		const letter2 = (words[1] as string)[0]?.toUpperCase() ?? "X";
		const letter3 = (words[2] as string)[0]?.toUpperCase() ?? "X";
		return `${letter1}${letter2}${letter3}`;
	}

	// 2 words: 1st letter of word1 + 1st letter of word2 + last consonant of word2
	const firstWord = words[0] as string;
	const lastWord = words[1] as string;

	const letter1 = firstWord[0]?.toUpperCase() ?? "X";
	const letter2 = lastWord[0]?.toUpperCase() ?? "X";

	let letter3 = "X";
	for (let i = lastWord.length - 1; i >= 1; i--) {
		const char = lastWord[i];
		if (char && !vowels.has(char.toLowerCase())) {
			letter3 = char.toUpperCase();
			break;
		}
	}

	if (letter3 === "X") {
		for (let i = 1; i < lastWord.length; i++) {
			const char = lastWord[i];
			if (char && !vowels.has(char.toLowerCase())) {
				letter3 = char.toUpperCase();
				break;
			}
		}
	}

	if (letter3 === "X" && lastWord.length > 1) {
		letter3 = lastWord[lastWord.length - 1]?.toUpperCase() ?? "X";
	}

	return `${letter1}${letter2}${letter3}`;
}

/**
 * Simple hash function for fallback code generation.
 */
function hashString(str: string): string {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		const char = str.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash;
	}
	return Math.abs(hash).toString(36).toUpperCase();
}
