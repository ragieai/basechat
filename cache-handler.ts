import { createClient } from "redis";

interface CacheEntry {
  value: any;
  lastModified: number;
  tags: string[];
}

const CACHE_KEY_PREFIX = "basechat:";
const TAG_INDEX_PREFIX = "basechat:tags:";

/**
 * Builds a tenant-user tag for cache invalidation purposes
 */
export function buildTenantUserTag(userId: string, slug: string): string {
  return `tenant:${slug}:user:${userId}`;
}

/**
 * Builds a tenant tag for cache invalidation purposes
 */
export function buildTenantTag(slug: string): string {
  return `tenant:${slug}`;
}

/**
 * Builds tags array with tenant-wide and user-specific tags
 */
export function buildTags(userId: string, slug: string): string[] {
  return [
    buildTenantUserTag(userId, slug), // User-specific
    buildTenantTag(slug), // Tenant-wide
  ];
}

export default class CacheHandler {
  private redisClient: any | null = null;
  private isConnected: boolean = false;
  private connectionPromise: Promise<boolean> | null = null;

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
        console.error("Redis client error:", err);
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
      console.error("Failed to create Redis client:", error);
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
        await this.redisClient.connect();
        this.isConnected = true;
        return true;
      } catch (error) {
        console.error("Failed to connect to Redis:", error);
        this.isConnected = false;
        return false;
      } finally {
        this.connectionPromise = null;
      }
    })();

    return this.connectionPromise;
  }

  /**
   * Gets the Redis key for a tag index
   */
  private getTagIndexKey(tag: string): string {
    return `${TAG_INDEX_PREFIX}${tag}`;
  }

  /**
   * Get a value from cache by key
   */
  async get(key: string): Promise<CacheEntry | undefined> {
    const prefixedKey = `${CACHE_KEY_PREFIX}${key}`;
    try {
      const connected = await this.ensureConnected();
      if (!connected) {
        console.warn("Redis unavailable in get()");
        return undefined;
      }

      const data = await this.redisClient.get(prefixedKey);
      if (!data) {
        return undefined;
      }
      console.log("CACHE HIT for key:", prefixedKey);

      const parsed: CacheEntry = JSON.parse(data);
      return parsed;
    } catch (error) {
      console.warn("Error getting cache key:", error);
      return undefined;
    }
  }

  /**
   * Set a value in cache with tags
   */
  async set(key: string, data: any, ctx: any): Promise<void> {
    const prefixedKey = `${CACHE_KEY_PREFIX}${key}`;
    try {
      const connected = await this.ensureConnected();
      if (!connected) {
        console.warn("Redis unavailable in set()");
        return undefined;
      }

      // Create the cache entry
      const cacheEntry: CacheEntry = {
        value: data,
        lastModified: Date.now(),
        tags: ctx.tags,
      };
      console.log("CACHE SET for key:", prefixedKey);

      // Serialize the entry
      const serialized = JSON.stringify(cacheEntry);

      // Store the cache entry
      await this.redisClient.setEx(prefixedKey, data.revalidate, serialized);

      // Update tag indices - add this cache key to each tag's set
      // Using a pipeline for efficiency (though not strictly atomic)
      const multi = this.redisClient.multi();

      for (const tag of ctx.tags) {
        const tagIndexKey = this.getTagIndexKey(tag);
        multi.sAdd(tagIndexKey, prefixedKey);
        multi.expire(tagIndexKey, data.revalidate);
      }

      await multi.exec();
    } catch (error) {
      console.warn("Error setting cache key:", error);
      return undefined;
    }
  }

  /**
   * Revalidate (invalidate) cache entries by tag(s)
   */
  async revalidateTag(tags: string | string[]): Promise<void> {
    try {
      const connected = await this.ensureConnected();
      if (!connected) {
        console.warn("Redis unavailable in revalidateTag()");
        return undefined;
      }

      const tagArray = Array.isArray(tags) ? tags : [tags];

      for (const tag of tagArray) {
        const tagIndexKey = this.getTagIndexKey(tag);

        // Get all cache keys associated with this tag
        const cacheKeys = await this.redisClient.sMembers(tagIndexKey);

        if (cacheKeys.length === 0) {
          continue;
        }

        // Delete all cache entries and the tag index
        const multi = this.redisClient.multi();

        for (const cacheKey of cacheKeys) {
          multi.del(cacheKey);
        }

        // Delete the tag index itself
        multi.del(tagIndexKey);

        await multi.exec();
      }
    } catch (error) {
      console.warn("Error revalidating tags:", error);
      return undefined;
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
