/**
 * Simple LRU (Least Recently Used) Cache implementation
 * Used for caching location lookups and other frequently accessed data
 */

export class LRUCache<K, V> {
	private maxSize: number;
	private cache: Map<K, V>;

	constructor(maxSize: number) {
		this.maxSize = maxSize;
		this.cache = new Map();
	}

	/**
	 * Get value from cache
	 * Moves item to end (most recently used)
	 */
	get(key: K): V | undefined {
		const value = this.cache.get(key);
		if (value !== undefined) {
			// Move to end (most recently used)
			this.cache.delete(key);
			this.cache.set(key, value);
		}
		return value;
	}

	/**
	 * Set value in cache
	 * Evicts least recently used item if cache is full
	 */
	set(key: K, value: V): void {
		// Remove if exists (to update position)
		if (this.cache.has(key)) {
			this.cache.delete(key);
		}

		// Add to end
		this.cache.set(key, value);

		// Evict oldest if over capacity
		if (this.cache.size > this.maxSize) {
			const firstKey = this.cache.keys().next().value as K;
			if (firstKey !== undefined) {
				this.cache.delete(firstKey);
			}
		}
	}

	/**
	 * Check if key exists in cache
	 */
	has(key: K): boolean {
		return this.cache.has(key);
	}

	/**
	 * Clear all items from cache
	 */
	clear(): void {
		this.cache.clear();
	}

	/**
	 * Get current cache size
	 */
	get size(): number {
		return this.cache.size;
	}

	/**
	 * Delete specific key from cache
	 */
	delete(key: K): boolean {
		return this.cache.delete(key);
	}
}

/**
 * Cache with TTL (Time To Live) support
 */
export class TTLCache<K, V> {
	private maxSize: number;
	private ttlMs: number;
	private cache: Map<K, { value: V; expiresAt: number }>;

	constructor(maxSize: number, ttlMs: number) {
		this.maxSize = maxSize;
		this.ttlMs = ttlMs;
		this.cache = new Map();
	}

	/**
	 * Get value from cache if not expired
	 */
	get(key: K): V | undefined {
		const item = this.cache.get(key);
		if (!item) return undefined;

		// Check if expired
		if (Date.now() > item.expiresAt) {
			this.cache.delete(key);
			return undefined;
		}

		return item.value;
	}

	/**
	 * Set value in cache with TTL
	 */
	set(key: K, value: V): void {
		const expiresAt = Date.now() + this.ttlMs;
		this.cache.set(key, { value, expiresAt });

		// Evict oldest if over capacity
		if (this.cache.size > this.maxSize) {
			const firstKey = this.cache.keys().next().value as K;
			if (firstKey !== undefined) {
				this.cache.delete(firstKey);
			}
		}
	}

	/**
	 * Check if key exists and is not expired
	 */
	has(key: K): boolean {
		const item = this.cache.get(key);
		if (!item) return false;

		if (Date.now() > item.expiresAt) {
			this.cache.delete(key);
			return false;
		}

		return true;
	}

	/**
	 * Clear all items from cache
	 */
	clear(): void {
		this.cache.clear();
	}

	/**
	 * Get current cache size
	 */
	get size(): number {
		return this.cache.size;
	}

	/**
	 * Clean up expired entries
	 */
	cleanup(): void {
		const now = Date.now();
		for (const [key, item] of this.cache.entries()) {
			if (now > item.expiresAt) {
				this.cache.delete(key);
			}
		}
	}
}
