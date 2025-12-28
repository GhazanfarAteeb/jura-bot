import Redis from 'ioredis';
import logger from './logger.js';

class RedisClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
  }

  /**
   * Initialize Redis connection
   */
  async connect() {
    const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

    this.client = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      enableReadyCheck: true,
      lazyConnect: true,
      reconnectOnError: (err) => {
        const targetErrors = ['READONLY', 'ECONNRESET', 'ECONNREFUSED'];
        return targetErrors.some(e => err.message.includes(e));
      }
    });

    // Event handlers
    this.client.on('connect', () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      logger.startup('Redis connected');
      console.log('✅ Redis connected');
    });

    this.client.on('error', (err) => {
      logger.error('Redis error', err);
      console.error('❌ Redis error:', err.message);
    });

    this.client.on('close', () => {
      this.isConnected = false;
      console.log('⚠️ Redis connection closed');
    });

    this.client.on('reconnecting', () => {
      this.reconnectAttempts++;
      console.log(`🔄 Redis reconnecting (attempt ${this.reconnectAttempts})`);
    });

    try {
      await this.client.connect();
      return true;
    } catch (error) {
      console.error('❌ Failed to connect to Redis:', error.message);
      logger.error('Redis connection failed', error);
      return false;
    }
  }

  /**
   * Check if Redis is available
   */
  isAvailable() {
    return this.isConnected && this.client;
  }

  // ============ CACHE OPERATIONS ============

  /**
   * Get cached data
   * @param {string} key - Cache key
   * @returns {Promise<any|null>} Parsed data or null
   */
  async get(key) {
    if (!this.isAvailable()) return null;
    try {
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Redis GET error:', error.message);
      return null;
    }
  }

  /**
   * Set cached data with TTL
   * @param {string} key - Cache key
   * @param {any} data - Data to cache
   * @param {number} ttlSeconds - Time to live in seconds (default: 30 minutes)
   */
  async set(key, data, ttlSeconds = 1800) {
    if (!this.isAvailable()) return false;
    try {
      await this.client.setex(key, ttlSeconds, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Redis SET error:', error.message);
      return false;
    }
  }

  /**
   * Delete a key
   * @param {string} key - Cache key
   */
  async del(key) {
    if (!this.isAvailable()) return false;
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error('Redis DEL error:', error.message);
      return false;
    }
  }

  /**
   * Delete keys matching a pattern
   * @param {string} pattern - Pattern to match (e.g., "guild:*")
   */
  async delPattern(pattern) {
    if (!this.isAvailable()) return false;
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
      return true;
    } catch (error) {
      console.error('Redis DEL pattern error:', error.message);
      return false;
    }
  }

  // ============ LOCK OPERATIONS ============

  /**
   * Acquire a lock (for preventing race conditions)
   * @param {string} key - Lock key
   * @param {number} ttlSeconds - Lock expiry time (default: 10 seconds)
   * @returns {Promise<boolean>} True if lock acquired
   */
  async acquireLock(key, ttlSeconds = 10) {
    if (!this.isAvailable()) return false;
    try {
      // SET key value NX EX seconds - only sets if key doesn't exist
      const result = await this.client.set(`lock:${key}`, '1', 'EX', ttlSeconds, 'NX');
      return result === 'OK';
    } catch (error) {
      console.error('Redis LOCK error:', error.message);
      return false;
    }
  }

  /**
   * Release a lock
   * @param {string} key - Lock key
   */
  async releaseLock(key) {
    if (!this.isAvailable()) return false;
    try {
      await this.client.del(`lock:${key}`);
      return true;
    } catch (error) {
      console.error('Redis UNLOCK error:', error.message);
      return false;
    }
  }

  /**
   * Check if lock exists
   * @param {string} key - Lock key
   */
  async isLocked(key) {
    if (!this.isAvailable()) return false;
    try {
      const result = await this.client.exists(`lock:${key}`);
      return result === 1;
    } catch (error) {
      return false;
    }
  }

  // ============ COOLDOWN OPERATIONS ============

  /**
   * Check if user is on cooldown
   * @param {string} userId - User ID
   * @param {string} commandName - Command name
   * @returns {Promise<number|null>} Remaining cooldown in seconds, or null if not on cooldown
   */
  async getCooldown(userId, commandName) {
    if (!this.isAvailable()) return null;
    try {
      const key = `cooldown:${commandName}:${userId}`;
      const ttl = await this.client.ttl(key);
      return ttl > 0 ? ttl : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Set user cooldown
   * @param {string} userId - User ID
   * @param {string} commandName - Command name
   * @param {number} seconds - Cooldown duration in seconds
   */
  async setCooldown(userId, commandName, seconds) {
    if (!this.isAvailable()) return false;
    try {
      const key = `cooldown:${commandName}:${userId}`;
      await this.client.setex(key, seconds, Date.now().toString());
      return true;
    } catch (error) {
      return false;
    }
  }

  // ============ GUILD CACHE OPERATIONS ============

  /**
   * Get guild config from cache
   * @param {string} guildId - Guild ID
   */
  async getGuildConfig(guildId) {
    return this.get(`guild:${guildId}`);
  }

  /**
   * Set guild config in cache
   * @param {string} guildId - Guild ID
   * @param {object} config - Guild configuration
   * @param {number} ttlSeconds - TTL in seconds (default: 30 minutes)
   */
  async setGuildConfig(guildId, config, ttlSeconds = 1800) {
    return this.set(`guild:${guildId}`, config, ttlSeconds);
  }

  /**
   * Invalidate guild cache
   * @param {string} guildId - Guild ID
   */
  async invalidateGuildConfig(guildId) {
    return this.del(`guild:${guildId}`);
  }

  // ============ UTILITY ============

  /**
   * Ping Redis
   */
  async ping() {
    if (!this.isAvailable()) return null;
    try {
      const start = Date.now();
      await this.client.ping();
      return Date.now() - start;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get Redis info
   */
  async getStats() {
    if (!this.isAvailable()) return null;
    try {
      const info = await this.client.info('memory');
      const dbSize = await this.client.dbsize();
      return { info, dbSize };
    } catch (error) {
      return null;
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
      console.log('Redis disconnected');
    }
  }
}

// Export singleton instance
const redis = new RedisClient();
export default redis;
