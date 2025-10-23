import { createClient } from "redis";

interface CacheEntry {
  value: any;
  lastModified: number;
  tags: string[];
}

export default class CacheHandler {
  private redisClient: any | null = null;
  private isConnected: boolean = false;
  private connectionPromise: Promise<boolean> | null = null;
  private readonly TTL_SECONDS = 86400; // 24 hours
  private readonly CACHE_KEY_PREFIX = "basechat:cache:";
  private readonly TAG_INDEX_PREFIX = "basechat:tags:";

  constructor() {
    // lazily initialize Redis
    const redisUrl = process.env.REDIS_URL;

    if (!redisUrl) {
      console.warn("REDIS_URL environment variable not set. Cache will be disabled.");
      return;
    }

    try {
      this.redisClient = createClient({
        url: redisUrl,
        socket: {
          reconnectStrategy: (retries) => {
            // Fail fast - don't retry indefinitely
            if (retries > 3) {
              console.warn("Redis reconnection attempts exceeded, disabling cache");
              return false;
            }
            return Math.min(retries * 100, 3000);
          },
        },
      });

      // Set up error handler
      this.redisClient.on("error", (err: any) => {
        console.warn("Redis client error:", err);
        this.isConnected = false;
      });

      this.redisClient.on("connect", () => {
        console.log("Redis client connected");
        this.isConnected = true;
      });

      this.redisClient.on("disconnect", () => {
        console.log("Redis client disconnected");
        this.isConnected = false;
      });
    } catch (error) {
      console.warn("Failed to create Redis client:", error);
      this.redisClient = null;
    }
  }

  private async ensureConnected(): Promise<boolean> {
    if (!this.redisClient) {
      return false;
    }

    if (this.isConnected) {
      return true;
    }

    // If connection is already in progress, wait for it
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    // Start new connection attempt
    this.connectionPromise = (async () => {
      try {
        await this.redisClient!.connect();
        this.isConnected = true;
        return true;
      } catch (error) {
        console.warn("Failed to connect to Redis:", error);
        this.isConnected = false;
        return false;
      } finally {
        this.connectionPromise = null;
      }
    })();

    return this.connectionPromise;
  }

  /**
   * Builds a cache key from tenant and user IDs
   */
  // THIS IS USED IN getCachedAuthContext in lib/server/service.tsx
  private buildCacheKey(slug: string, userId: string): string {
    return `${this.CACHE_KEY_PREFIX}${slug}:${userId}`;
  }

  /**
   * Parses a cache key to extract tenant and user IDs
   * Returns null if key format is invalid
   */
  private parseCacheKey(key: string): { slug: string; userId: string } | null {
    if (!key.startsWith(this.CACHE_KEY_PREFIX)) {
      return null;
    }

    const parts = key.slice(this.CACHE_KEY_PREFIX.length).split(":");
    if (parts.length !== 2) {
      return null;
    }

    return {
      slug: parts[0],
      userId: parts[1],
    };
  }

  /**
   * Builds tags for a cache entry
   * Returns both user-specific and tenant-wide tags
   */
  private buildTags(slug: string, userId: string): string[] {
    return [
      `tenant:${slug}:user:${userId}`, // User-specific
      `tenant:${slug}`, // Tenant-wide
    ];
  }

  /**
   * Gets the Redis key for a tag index
   */
  private getTagIndexKey(tag: string): string {
    return `${this.TAG_INDEX_PREFIX}${tag}`;
  }

  /**
   * Get a value from cache by key
   */
  async get(key: string): Promise<CacheEntry | undefined> {
    try {
      const connected = await this.ensureConnected();
      if (!connected) {
        console.warn("Redis unavailable in get()");
        return undefined;
      }

      const data = await this.redisClient!.get(key);
      if (!data) {
        return undefined;
      }

      const parsed: CacheEntry = JSON.parse(data);
      return parsed;
    } catch (error) {
      console.warn("Error getting cache key:", error);
      return undefined;
    }
  }

  /**
   * Set a value in cache with tags
   *
   * This method expects the key to already contain tenant and user information.
   * If you're generating the key elsewhere, ensure it follows the format:
   * basechat:cache:{slug}:{userId}
   */
  async set(key: string, data: any): Promise<void> {
    try {
      const connected = await this.ensureConnected();
      if (!connected) {
        console.warn("Redis unavailable in set()");
        return;
      }

      // Parse the key to extract tenant and user IDs
      const parsed = this.parseCacheKey(key);
      if (!parsed) {
        console.warn(`Invalid cache key format: ${key}`);
        return;
      }

      const { slug, userId } = parsed;

      // Build tags for this entry
      const tags = this.buildTags(slug, userId);

      // Create the cache entry
      const cacheEntry: CacheEntry = {
        value: data,
        lastModified: Date.now(),
        tags,
      };

      // Serialize the entry
      const serialized = JSON.stringify(cacheEntry);

      // Store the cache entry with TTL
      await this.redisClient!.setEx(key, this.TTL_SECONDS, serialized);

      // Update tag indices - add this cache key to each tag's set
      // Using a pipeline for efficiency (though not strictly atomic)
      const multi = this.redisClient!.multi();

      for (const tag of tags) {
        const tagIndexKey = this.getTagIndexKey(tag);
        multi.sAdd(tagIndexKey, key);
        multi.expire(tagIndexKey, this.TTL_SECONDS);
      }

      await multi.exec();
    } catch (error) {
      console.warn("Error setting cache key:", error);
    }
  }

  /**
   * Revalidate (invalidate) cache entries by tag(s)
   *
   * This is called by Next.js when you use revalidateTag() in your app,
   * or you can call it directly through helper functions.
   */
  async revalidateTag(tags: string | string[]): Promise<void> {
    try {
      const connected = await this.ensureConnected();
      if (!connected) {
        console.warn("Redis unavailable in revalidateTag()");
        return;
      }

      const tagArray = Array.isArray(tags) ? tags : [tags];

      for (const tag of tagArray) {
        const tagIndexKey = this.getTagIndexKey(tag);

        // Get all cache keys associated with this tag
        const cacheKeys = await this.redisClient!.sMembers(tagIndexKey);

        if (cacheKeys.length === 0) {
          continue;
        }

        // Delete all cache entries and the tag index
        const multi = this.redisClient!.multi();

        for (const cacheKey of cacheKeys) {
          multi.del(cacheKey);

          // Also remove this cache key from all other tag indices it belongs to
          const parsedKey = this.parseCacheKey(cacheKey);
          if (parsedKey) {
            const allTags = this.buildTags(parsedKey.slug, parsedKey.userId);
            for (const otherTag of allTags) {
              if (otherTag !== tag) {
                multi.sRem(this.getTagIndexKey(otherTag), cacheKey);
              }
            }
          }
        }

        // Delete the tag index itself
        multi.del(tagIndexKey);

        await multi.exec();
      }
    } catch (error) {
      console.warn("Error revalidating tags:", error);
    }
  }

  /**
   * Reset per-request cache (not needed for Redis-backed cache)
   */
  resetRequestCache(): void {
    // No-op: we don't maintain per-request cache
  }

  /**
   * Gracefully disconnect from Redis
   */
  async disconnect(): Promise<void> {
    if (this.redisClient && this.isConnected) {
      try {
        await this.redisClient.quit();
        this.isConnected = false;
      } catch (error) {
        console.warn("Error disconnecting from Redis:", error);
      }
    }
  }
}
