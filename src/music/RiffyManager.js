import { Riffy } from 'riffy';
import logger from '../utils/logger.js';

/**
 * RiffyManager - Manages Riffy client for NodeLink music playback
 * Riffy is chosen over Shoukaku for better plugin compatibility:
 * - Native support for lavaSrc (Spotify, Apple Music, Deezer)
 * - Native support for lavaSearch (enhanced search functionality)
 * - Better event handling and error recovery
 * - Cleaner API and better documentation
 * - Active development and plugin ecosystem
 */
export default class RiffyManager {
  constructor(client) {
    this.client = client;
    this.nodes = [{
      name: process.env.NODELINK_NAME || 'NodeLink',
      host: process.env.NODELINK_HOST || 'localhost',
      port: parseInt(process.env.NODELINK_PORT) || 2333,
      password: process.env.NODELINK_PASSWORD || 'youshallnotpass',
      secure: process.env.NODELINK_SECURE === 'true' || false
    }];

    // Initialize Riffy with Discord.js v14/v15 compatibility
    this.riffy = new Riffy(client, this.nodes, {
      send: (payload) => {
        const guild = client.guilds.cache.get(payload.d.guild_id);
        if (guild) guild.shard.send(payload);
      },
      defaultSearchPlatform: 'ytmsearch', // YouTube Music as default
      restVersion: 'v4', // NodeLink REST API version
      // Plugin support configuration
      plugins: {
        lavaSrc: true, // Enable lavaSrc plugin support
        lavaSearch: true // Enable lavaSearch plugin support
      },
      // Auto-resume after disconnect
      autoResume: true,
      // Reconnection settings
      reconnectTries: 5,
      reconnectInterval: 5000
    });

    this.setupEventListeners();
    logger.info('[RiffyManager] Riffy initialized with NodeLink nodes');
  }

  setupEventListeners() {
    // Node events
    this.riffy.on('nodeConnect', (node) => {
      logger.info(`[RiffyManager] ✅ Node "${node.name}" connected successfully`);
      logger.info(`[RiffyManager] Node stats: ${JSON.stringify(node.stats)}`);
    });

    this.riffy.on('nodeDisconnect', (node, reason) => {
      logger.warn(`[RiffyManager] ❌ Node "${node.name}" disconnected. Reason: ${reason?.message || 'Unknown'}`);
    });

    this.riffy.on('nodeError', (node, error) => {
      logger.error(`[RiffyManager] 🔴 Node "${node.name}" error:`, error);
    });

    this.riffy.on('nodeReconnect', (node) => {
      logger.info(`[RiffyManager] 🔄 Node "${node.name}" reconnecting...`);
    });

    // Track events
    this.riffy.on('trackStart', (player, track) => {
      logger.info(`[RiffyManager] 🎵 Now playing: "${track.info.title}" in guild ${player.guildId}`);
      this.handleTrackStart(player, track);
    });

    this.riffy.on('trackEnd', (player, track) => {
      logger.info(`[RiffyManager] Track ended: "${track.info.title}" in guild ${player.guildId}`);
      this.handleTrackEnd(player, track);
    });

    this.riffy.on('trackError', (player, track, error) => {
      logger.error(`[RiffyManager] 🔴 Track error for "${track.info.title}" in guild ${player.guildId}:`, error);
      this.handleTrackError(player, track, error);
    });

    this.riffy.on('trackStuck', (player, track, thresholdMs) => {
      logger.warn(`[RiffyManager] ⚠️ Track stuck: "${track.info.title}" (${thresholdMs}ms) in guild ${player.guildId}`);
      player.stopTrack();
    });

    // Player events
    this.riffy.on('playerCreate', (player) => {
      logger.info(`[RiffyManager] Player created for guild ${player.guildId}`);
    });

    this.riffy.on('playerDestroy', (player) => {
      logger.info(`[RiffyManager] Player destroyed for guild ${player.guildId}`);
    });

    // Queue events
    this.riffy.on('queueEnd', (player) => {
      logger.info(`[RiffyManager] Queue ended for guild ${player.guildId}`);
      this.handleQueueEnd(player);
    });

    logger.info('[RiffyManager] Event listeners configured');
  }

  async handleTrackStart(player, track) {
    const guild = this.client.guilds.cache.get(player.guildId);
    if (!guild) return;

    const channel = guild.channels.cache.get(player.textChannel);
    if (!channel) return;

    // Import the player embed creator
    const { createNowPlayingEmbed, createPlayerButtons } = await import('./utils/PlayerEmbeds.js');

    try {
      const embed = await createNowPlayingEmbed(track, player, this.client);
      const buttons = createPlayerButtons(player);

      // Send or update the now playing message
      if (player.nowPlayingMessage) {
        await player.nowPlayingMessage.edit({ embeds: [embed], components: [buttons] });
      } else {
        const message = await channel.send({ embeds: [embed], components: [buttons] });
        player.nowPlayingMessage = message;
      }
    } catch (error) {
      logger.error('[RiffyManager] Error sending now playing message:', error);
    }
  }

  async handleTrackEnd(player, track) {
    // Handled by queueEnd event if queue is empty
    // Otherwise Riffy automatically plays next track
  }

  async handleTrackError(player, track, error) {
    const guild = this.client.guilds.cache.get(player.guildId);
    if (!guild) return;

    const channel = guild.channels.cache.get(player.textChannel);
    if (!channel) return;

    try {
      await channel.send(`❌ An error occurred while playing **${track.info.title}**: ${error.message || 'Unknown error'}`);

      // Try to play next track if available
      if (player.queue.length > 0) {
        player.stopTrack();
      }
    } catch (err) {
      logger.error('[RiffyManager] Error sending error message:', err);
    }
  }

  async handleQueueEnd(player) {
    const guild = this.client.guilds.cache.get(player.guildId);
    if (!guild) return;

    const channel = guild.channels.cache.get(player.textChannel);
    if (!channel) return;

    try {
      await channel.send('✅ Queue has ended. Thanks for listening!');

      // Destroy player after a delay
      setTimeout(() => {
        if (player && player.queue.length === 0) {
          player.destroy();
        }
      }, 30000); // 30 seconds
    } catch (error) {
      logger.error('[RiffyManager] Error sending queue end message:', error);
    }
  }

  /**
   * Get the best available node
   */
  getNode() {
    const nodes = Array.from(this.riffy.nodeMap.values());
    // Check if node is connected using the connected property
    const connectedNodes = nodes.filter(n => n.connected === true);

    if (connectedNodes.length === 0) {
      logger.warn('[RiffyManager] No connected nodes available');
      logger.warn('[RiffyManager] Total nodes:', nodes.length, 'Node states:', nodes.map(n => ({ name: n.name, connected: n.connected, isConnected: n.isConnected })));
      return null;
    }

    // Return node with least players
    return connectedNodes.sort((a, b) => a.stats.players - b.stats.players)[0];
  }

  /**
   * Create or get existing player
   */
  createPlayer(guildId, voiceChannelId, textChannelId) {
    let player = this.riffy.players.get(guildId);

    if (!player) {
      player = this.riffy.createConnection({
        guildId: guildId,
        voiceChannel: voiceChannelId,
        textChannel: textChannelId,
        deaf: true,
        mute: false
      });

      logger.info(`[RiffyManager] Created new player for guild ${guildId}`);
    }

    return player;
  }

  /**
   * Get player for a guild
   */
  getPlayer(guildId) {
    return this.riffy.players.get(guildId);
  }

  /**
   * Search for tracks using lavaSearch plugin
   */
  async search(query, platform = 'ytmsearch') {
    const node = this.getNode();
    if (!node) {
      throw new Error('No available nodes for search');
    }

    // Platform prefixes for different sources
    const platformPrefixes = {
      youtube: 'ytsearch',
      youtubemusic: 'ytmsearch',
      spotify: 'spsearch',
      soundcloud: 'scsearch',
      applemusic: 'amsearch',
      deezer: 'dzsearch',
      yandex: 'ymsearch'
    };

    // Add platform prefix if not a URL
    let searchQuery = query;
    if (!query.match(/^https?:\/\//)) {
      const prefix = platformPrefixes[platform.toLowerCase()] || platform;
      searchQuery = `${prefix}:${query}`;
    }

    logger.info(`[RiffyManager] Searching: ${searchQuery}`);

    try {
      const result = await node.rest.resolve(searchQuery);
      logger.info(`[RiffyManager] Search result: ${result.loadType}, tracks: ${result.tracks?.length || 0}`);
      return result;
    } catch (error) {
      logger.error('[RiffyManager] Search error:', error);
      throw error;
    }
  }

  /**
   * Advanced search using lavaSearch plugin
   */
  async advancedSearch(query, platforms = ['youtube', 'spotify', 'soundcloud']) {
    const node = this.getNode();
    if (!node) {
      throw new Error('No available nodes for search');
    }

    // lavaSearch plugin provides better multi-platform search
    const results = [];

    for (const platform of platforms) {
      try {
        const result = await this.search(query, platform);
        if (result.tracks && result.tracks.length > 0) {
          results.push({
            platform,
            tracks: result.tracks
          });
        }
      } catch (error) {
        logger.warn(`[RiffyManager] Search failed for ${platform}:`, error.message);
      }
    }

    return results;
  }

  /**
   * Destroy all players
   */
  destroyAll() {
    this.riffy.players.forEach(player => player.destroy());
    logger.info('[RiffyManager] Destroyed all players');
  }
}
