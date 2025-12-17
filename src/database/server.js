import Music from '../models/Music.js';
import Guild from '../models/Guild.js';

export default class ServerData {
  constructor() {
    this.Music = Music;
    this.Guild = Guild;

    // LRU Cache with 5 minute TTL for frequently accessed data
    this.cache = new Map();
    this.cacheTTL = 5 * 60 * 1000; // 5 minutes
    this.maxCacheSize = 500; // Prevent memory bloat

    // Clear expired cache entries every minute
    setInterval(() => this.clearExpiredCache(), 60000);
  }

  clearExpiredCache() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.cacheTTL) {
        this.cache.delete(key);
      }
    }
  }

  getCached(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > this.cacheTTL) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  setCache(key, data) {
    // Implement simple LRU by removing oldest if size limit reached
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  invalidateCache(pattern) {
    for (const key of this.cache.keys()) {
      if (key.startsWith(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  async get(guildId) {
    let data = await this.Music.findOne({ guildId, type: 'guild' });

    if (!data) {
      data = await this.Music.create({
        guildId,
        type: 'guild',
        prefix: null
      });
    }
    return data;
  }

  async setPrefix(guildId, prefix) {
    const guild = await this.Guild.getGuild(guildId);
    guild.prefix = prefix;
    await guild.save();

    // Invalidate cache
    this.cache.delete(`prefix:${guildId}`);
  }

  async getPrefix(guildId) {
    const cacheKey = `prefix:${guildId}`;
    const cached = this.getCached(cacheKey);
    if (cached !== null) return cached;

    const guild = await this.Guild.getGuild(guildId);
    const prefix = guild?.prefix || process.env.DEFAULT_PREFIX || '!';

    this.setCache(cacheKey, prefix);
    return prefix;
  }

  async set_247(guildId, textId, voiceId) {
    await this.Music.updateOne(
      { guildId, type: 'stay' },
      { $set: { textId, voiceId } },
      { upsert: true }
    );
  }

  async delete_247(guildId) {
    await this.Music.deleteOne({ guildId, type: 'stay' });
  }

  async get_247(guildId) {
    if (guildId) {
      const data = await this.Music.findOne({ guildId, type: 'stay' });
      return data || false;
    } else {
      const data = await this.Music.find({ type: 'stay' });
      return data.length > 0 ? data : false;
    }
  }

  async setDj(guildId, mode) {
    await this.Music.updateOne(
      { guildId, type: 'dj' },
      { $set: { mode: Boolean(mode) } },
      { upsert: true }
    );

    // Invalidate cache
    this.cache.delete(`dj:${guildId}`);
  }

  async getDj(guildId) {
    const cacheKey = `dj:${guildId}`;
    const cached = this.getCached(cacheKey);
    if (cached !== null) return cached;

    const data = await this.Music.findOne({ guildId, type: 'dj' });
    const result = data || false;

    this.setCache(cacheKey, result);
    return result;
  }

  async getRoles(guildId) {
    const data = await this.Music.find({ guildId, type: 'role' });
    return data.length > 0 ? data : false;
  }

  async addRole(guildId, roleId) {
    const existing = await this.Music.findOne({ guildId, roleId, type: 'role' });

    if (!existing) {
      await this.Music.create({ guildId, roleId, type: 'role' });
    }
  }

  async removeRole(guildId, roleId) {
    await this.Music.deleteOne({ guildId, roleId, type: 'role' });
  }

  async clearRoles(guildId) {
    await this.Music.deleteMany({ guildId, type: 'role' });
  }

  async getBotChannel(guildId) {
    const data = await this.Music.findOne({ guildId, type: 'botchannel' });
    return data || false;
  }

  async setBotChannel(guildId, textId) {
    await this.Music.updateOne(
      { guildId, type: 'botchannel' },
      { $set: { textId } },
      { upsert: true }
    );
  }

  async getSetup(guildId) {
    const data = await this.Music.findOne({ guildId, type: 'setup' });
    return data || false;
  }

  async setSetup(guildId, textId, messageId) {
    await this.Music.updateOne(
      { guildId, type: 'setup' },
      { $set: { textId, messageId } },
      { upsert: true }
    );
  }

  async deleteSetup(guildId) {
    await this.Music.deleteOne({ guildId, type: 'setup' });
  }

  async getUser(userId) {
    const data = await this.Music.findOne({ userId, type: 'user' });

    if (!data) {
      await this.Music.create({ userId, type: 'user' });
      return false;
    }
    return data;
  }

  async getPLaylist(userId, name) {
    const data = await this.Music.findOne({
      userId,
      type: 'playlist',
      'playlist.name': name
    });
    return data || false;
  }

  async createPlaylist(userId, name) {
    const existing = await this.Music.findOne({
      userId,
      type: 'playlist',
      'playlist.name': name
    });

    if (existing) {
      throw new Error('Playlist already exists');
    }

    await this.Music.create({
      userId,
      type: 'playlist',
      playlist: {
        name,
        songs: []
      }
    });
  }

  async deletePlaylist(userId, name) {
    const result = await this.Music.deleteOne({
      userId,
      type: 'playlist',
      'playlist.name': name
    });

    if (result.deletedCount === 0) {
      throw new Error('Playlist does not exist');
    }
  }

  async addSong(userId, name, song) {
    const result = await this.Music.updateOne(
      {
        userId,
        type: 'playlist',
        'playlist.name': name
      },
      { $push: { 'playlist.songs': song } }
    );

    if (result.matchedCount === 0) {
      throw new Error('Playlist does not exist');
    }
  }

  async removeSong(userId, name, song) {
    const result = await this.Music.updateOne(
      {
        userId,
        type: 'playlist',
        'playlist.name': name
      },
      { $pull: { 'playlist.songs': song } }
    );

    if (result.matchedCount === 0) {
      throw new Error('Playlist does not exist');
    }
  }

  async getPremium(userId) {
    const data = await this.Music.findOne({ userId, type: 'premium' });
    return data || false;
  }

  async setPremium(userId, guildId) {
    await this.Music.updateOne(
      { userId, type: 'premium' },
      { $set: { guildId } },
      { upsert: true }
    );
  }

  async deletePremium(userId) {
    await this.Music.deleteOne({ userId, type: 'premium' });
  }
}