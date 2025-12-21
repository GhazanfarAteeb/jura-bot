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
      plugins: [], // Empty array for plugins (NodeLink has them built-in)
      // Auto-resume after disconnect
      autoResume: true,
      // Reconnection settings
      reconnectTries: 5,
      reconnectInterval: 5000
    });

    this.patchRiffyEventHandler();
    this.setupEventListeners();
    logger.info('[RiffyManager] Riffy initialized with NodeLink nodes');
  }

  /**
   * Patch Riffy's event handler to gracefully handle unknown events from NodeLink
   * NodeLink sends custom events that Riffy doesn't recognize:
   * - PlayerCreatedEvent
   * - VolumeChangedEvent  
   * - PlayerConnectedEvent
   * - PlayerDestroyedEvent
   * etc.
   */
  patchRiffyEventHandler() {
    // Get all players and patch their handleEvent method
    const patchPlayer = (player) => {
      if (player._eventHandlerPatched) return;

      const originalHandleEvent = player.handleEvent.bind(player);
      player.handleEvent = (data) => {
        // List of NodeLink events that should be safely ignored
        const ignoredEvents = [
          'PlayerCreatedEvent',
          'VolumeChangedEvent',
          'PlayerConnectedEvent',
          'PlayerDestroyedEvent',
          'PlayerPausedEvent',
          'PlayerResumedEvent'
        ];

        if (ignoredEvents.includes(data.type)) {
          logger.debug(`[RiffyManager] Ignoring NodeLink event: ${data.type}`);
          return;
        }

        try {
          originalHandleEvent(data);
        } catch (error) {
          // If the event is unknown, log it but don't crash
          if (error.message && error.message.includes('unknown event')) {
            logger.warn(`[RiffyManager] Unknown event from NodeLink: ${data.type}`);
          } else {
            throw error;
          }
        }
      };

      player._eventHandlerPatched = true;
    };

    // Patch existing players
    this.riffy.players.forEach(patchPlayer);

    // Patch the createConnection method to auto-patch new players
    const originalCreateConnection = this.riffy.createConnection.bind(this.riffy);
    this.riffy.createConnection = (options) => {
      const player = originalCreateConnection(options);
      patchPlayer(player);
      return player;
    };

    logger.info('[RiffyManager] Patched Riffy event handler for NodeLink compatibility');
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
    this.riffy.on('trackStart', (player, track, payload) => {
      logger.info(`[RiffyManager] 🎵 Now playing: "${track.info.title}" in guild ${player.guildId}`);
      this.handleTrackStart(player, track, payload);
    });

    this.riffy.on('trackEnd', (player, track, payload) => {
      logger.info(`[RiffyManager] Track ended: "${track.info.title}" in guild ${player.guildId}`);
      this.handleTrackEnd(player, track, payload);
    });

    this.riffy.on('trackError', (player, track, payload) => {
      logger.error(`[RiffyManager] 🔴 Track error for "${track.info.title}" in guild ${player.guildId}:`, payload);
      this.handleTrackError(player, track, payload);
    });

    this.riffy.on('trackStuck', (player, track, payload) => {
      logger.warn(`[RiffyManager] ⚠️ Track stuck: "${track.info.title}" (${payload.thresholdMs}ms) in guild ${player.guildId}`);
      player.stop();
    });

    // Player events
    this.riffy.on('playerCreate', (player) => {
      logger.info(`[RiffyManager] Player created for guild ${player.guildId}`);
    });

    this.riffy.on('playerDisconnect', (player) => {
      logger.info(`[RiffyManager] Player disconnected for guild ${player.guildId}`);
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

  async handleTrackError(player, track, payload) {
    const guild = this.client.guilds.cache.get(player.guildId);
    if (!guild) return;

    const channel = guild.channels.cache.get(player.textChannel);
    if (!channel) return;

    try {
      const errorData = payload.exception || payload.error || {};
      const errorMessage = errorData.message || 'Unknown error';

      // Check if it's a YouTube streaming error
      if (errorMessage.includes('Failed to get a working track URL')) {
        await channel.send(`❌ **${track.info.title}** is unavailable (YouTube streaming issue). Skipping to next track...`);
      } else {
        await channel.send(`❌ An error occurred while playing **${track.info.title}**: ${errorMessage}`);
      }

      // Auto-skip to next track if available
      if (player.queue.length > 0) {
        logger.info(`[RiffyManager] Auto-skipping to next track after error`);
        player.stop();
      } else {
        // No more tracks, destroy player
        setTimeout(() => {
          if (player && player.queue.length === 0) {
            player.destroy();
          }
        }, 5000);
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
      // Use riffy.resolve() instead of node.rest.resolve()
      const result = await this.riffy.resolve({ query: searchQuery, requester: this.client.user });
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
