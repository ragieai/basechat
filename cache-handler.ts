import { createClient } from "redis";

interface CacheValue {
  value: any;
  lastModified: number;
  tags: string[];
  expiresAt: number;
}

interface CacheContext {
  tags: string[];
  revalidate?: number; // seconds
}

interface CacheHandlerOptions {
  [key: string]: any;
}

class CacheHandler {
  private redis: any;
  private options: CacheHandlerOptions;
  private isConnected: boolean = false;
  private prefix: string = "basechat:";

  constructor(options: CacheHandlerOptions) {
    this.options = options;
    this.redis = createClient({
      url: process.env.REDIS_URL || "redis://localhost:6379",
      socket: {
        connectTimeout: 5000,
      },
    });

    // Handle Redis connection events
    this.redis.on("error", (err: any) => {
      console.error("Redis Client Error:", err);
    });

    this.redis.on("connect", () => {
      this.isConnected = true;
    });

    this.redis.on("disconnect", () => {
      console.log("Redis Client Disconnected");
      this.isConnected = false;
    });

    // Connect to Redis
    this.connect();
  }

  private async connect() {
    try {
      await this.redis.connect();
    } catch (error) {
      console.error("Failed to connect to Redis:", error);
      this.isConnected = false;
    }
  }

  private async ensureConnection() {
    if (!this.isConnected) {
      await this.connect();
    }
  }

  async get(key: string): Promise<any> {
    try {
      await this.ensureConnection();

      const prefixedKey = `${this.prefix}${key}`;
      const cached = await this.redis.get(prefixedKey);
      if (!cached) {
        return null;
      }

      const parsed: CacheValue = JSON.parse(cached);

      // Check if cache has expired
      if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
        await this.redis.del(prefixedKey);
        return null;
      }

      return parsed.value;
    } catch (error) {
      console.error("Redis GET error:", error);
      return null;
    }
  }

  async set(key: string, data: any, ctx: CacheContext): Promise<void> {
    try {
      await this.ensureConnection();

      const now = Date.now();
      const expiresAt = ctx.revalidate ? now + ctx.revalidate * 1000 : null;

      const cacheValue: CacheValue = {
        value: data,
        lastModified: now,
        tags: ctx.tags || [],
        expiresAt: expiresAt || 0,
      };

      const prefixedKey = `${this.prefix}${key}`;
      // Store the cache value
      await this.redis.set(prefixedKey, JSON.stringify(cacheValue));

      // Store tag-to-key mappings for efficient tag-based invalidation
      if (ctx.tags && ctx.tags.length > 0) {
        const pipeline = this.redis.multi();

        for (const tag of ctx.tags) {
          pipeline.sAdd(`${this.prefix}tag:${tag}`, prefixedKey);
        }

        await pipeline.exec();
      }
    } catch (error) {
      console.error("Redis SET error:", error);
    }
  }

  async revalidateTag(tags: string | string[]): Promise<void> {
    try {
      await this.ensureConnection();

      const tagArray = Array.isArray(tags) ? tags : [tags];

      const pipeline = this.redis.multi();

      for (const tag of tagArray) {
        const prefixedTag = `${this.prefix}tag:${tag}`;
        const keys = await this.redis.sMembers(prefixedTag);

        if (keys.length > 0) {
          for (const key of keys) {
            pipeline.del(key);
          }
          pipeline.del(prefixedTag);
        }
      }

      await pipeline.exec();

      console.log(`Revalidated tags: ${tagArray.join(", ")}`);
    } catch (error) {
      console.error("Redis revalidateTag error:", error);
    }
  }

  // If you want to have temporary in memory cache for a single request that is reset
  // before the next request you can leverage this method
  resetRequestCache(): void {
    // This method is called for each request to reset any temporary in-memory cache
    // Since we're using Redis, we don't need to do anything here
  }

  async disconnect(): Promise<void> {
    try {
      if (this.isConnected) {
        await this.redis.disconnect();
      }
    } catch (error) {
      console.error("Error disconnecting from Redis:", error);
    }
  }
}

// Singleton instance for application use
const redisCache = new CacheHandler({});

// Cache function similar to unstable_cache
export function redisCacheWrapper<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  keyParts: string[],
  options: {
    revalidate?: number;
    tags?: string[];
  } = {},
) {
  return async (...args: T): Promise<R> => {
    // Create cache key from function name and arguments
    const cacheKey = `${keyParts.join("-")}-${JSON.stringify(args)}`;

    // Try to get from cache first
    const cached = await redisCache.get(cacheKey);
    if (cached !== null) {
      return cached;
    }

    // Execute function and cache result
    const result = await fn(...args);
    await redisCache.set(cacheKey, result, {
      tags: options.tags || [],
      revalidate: options.revalidate,
    });

    return result;
  };
}

export { redisCache };
export default CacheHandler;
