import Music from '../models/Music.js';

export default class ServerData {
  constructor() {
    this.Music = Music;
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
    await this.Music.updateOne(
      { guildId, type: 'guild' },
      { $set: { prefix } },
      { upsert: true }
    );
  }

  async getPrefix(guildId) {
    const data = await this.Music.findOne({ guildId, type: 'guild' });
    
    if (!data || !data.prefix) {
      const defaultPrefix = process.env.DEFAULT_PREFIX || '!';
      await this.Music.updateOne(
        { guildId, type: 'guild' },
        { $set: { prefix: defaultPrefix } },
        { upsert: true }
      );
      return { prefix: defaultPrefix };
    }
    return { prefix: data.prefix };
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
  }

  async getDj(guildId) {
    const data = await this.Music.findOne({ guildId, type: 'dj' });
    return data || false;
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