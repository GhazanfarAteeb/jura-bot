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
      defaultSearchPlatform: 'ytmsearch',
      restVersion: 'v4'
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
    this.riffy.on('trackStart', (player, track) => {
      logger.info(`[RiffyManager] 🎵 Now playing: "${track.info.title}" in guild ${player.guildId}`);
      this.handleTrackStart(player, track);
    });

    this.riffy.on('trackEnd', (player) => {
      logger.info(`[RiffyManager] Track ended in guild ${player.guildId}`);
      this.handleTrackEnd(player);
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
    logger.info(`[RiffyManager] 📥 handleTrackStart called for guild ${player.guildId}`);
    logger.info(`[RiffyManager] Track details: ${JSON.stringify({ title: track.info.title, author: track.info.author, duration: track.info.length })}`);
    logger.info(`[RiffyManager] Player state: playing=${player.playing}, paused=${player.paused}, queue length=${player.queue.length}`);

    const guild = this.client.guilds.cache.get(player.guildId);
    if (!guild) {
      logger.warn(`[RiffyManager] ⚠️ Guild ${player.guildId} not found in cache`);
      return;
    }

    const channel = guild.channels.cache.get(player.textChannel);
    if (!channel) {
      logger.warn(`[RiffyManager] ⚠️ Text channel ${player.textChannel} not found in guild ${player.guildId}`);
      return;
    }

    logger.info(`[RiffyManager] 📨 Sending now playing message to channel ${channel.name}`);

    // Import the player embed creator
    const { createNowPlayingEmbed, createPlayerButtons } = await import('./utils/PlayerEmbeds.js');

    try {
      const embed = await createNowPlayingEmbed(track, player, this.client);
      const buttons = createPlayerButtons(player);

      // Send or update the now playing message
      if (player.nowPlayingMessage) {
        logger.info(`[RiffyManager] 🔄 Updating existing now playing message`);
        await player.nowPlayingMessage.edit({ embeds: [embed], components: [buttons] });
      } else {
        logger.info(`[RiffyManager] ✉️ Sending new now playing message`);
        const message = await channel.send({ embeds: [embed], components: [buttons] });
        player.nowPlayingMessage = message;
        logger.info(`[RiffyManager] Now playing message ID: ${message.id}`);
      }
      logger.info(`[RiffyManager] ✅ Now playing message sent successfully`);
    } catch (error) {
      logger.error('[RiffyManager] ❌ Error sending now playing message:', error);
    }
  }

  async handleTrackEnd(player) {
    logger.info(`[RiffyManager] 🔚 handleTrackEnd called for guild ${player.guildId}`);
    logger.info(`[RiffyManager] Queue length: ${player.queue.length}`);
    logger.info(`[RiffyManager] Player state: playing=${player.playing}, paused=${player.paused}`);

    // Handled by queueEnd event if queue is empty
    // Otherwise Riffy automatically plays next track
    if (player.queue.length > 0) {
      logger.info(`[RiffyManager] ⏭️ Next track available in queue`);
    } else {
      logger.info(`[RiffyManager] 📭 Queue is empty, queueEnd event will handle cleanup`);
    }
  }

  async handleTrackError(player, track, payload) {
    logger.error(`[RiffyManager] ❌ handleTrackError called for guild ${player.guildId}`);
    logger.error(`[RiffyManager] Failed track: ${track.info.title}`);
    logger.error(`[RiffyManager] Error payload:`, payload);
    logger.info(`[RiffyManager] Queue length: ${player.queue.length}`);

    const guild = this.client.guilds.cache.get(player.guildId);
    if (!guild) {
      logger.warn(`[RiffyManager] ⚠️ Guild ${player.guildId} not found, cannot send error message`);
      return;
    }

    const channel = guild.channels.cache.get(player.textChannel);
    if (!channel) {
      logger.warn(`[RiffyManager] ⚠️ Text channel not found, cannot send error message`);
      return;
    }

    try {
      const errorData = payload.exception || payload.error || {};
      const errorMessage = errorData.message || 'Unknown error';

      logger.error(`[RiffyManager] Error message: ${errorMessage}`);

      // Check if it's a YouTube streaming error
      if (errorMessage.includes('Failed to get a working track URL')) {
        logger.warn(`[RiffyManager] 🎥 YouTube streaming error detected`);
        await channel.send(`❌ **${track.info.title}** is unavailable (YouTube streaming issue). Skipping to next track...`);
      } else {
        logger.warn(`[RiffyManager] 🔴 Generic playback error`);
        await channel.send(`❌ An error occurred while playing **${track.info.title}**: ${errorMessage}`);
      }

      // Auto-skip to next track if available
      if (player.queue.length > 0) {
        logger.info(`[RiffyManager] ⏭️ Auto-skipping to next track (${player.queue.length} tracks remaining)`);
        player.stop();
      } else {
        logger.info(`[RiffyManager] 📭 No more tracks in queue, scheduling player destruction`);
        // No more tracks, destroy player
        setTimeout(() => {
          if (player && player.queue.length === 0) {
            logger.info(`[RiffyManager] 🗑️ Destroying player after error (no tracks in queue)`);
            player.destroy();
          }
        }, 5000);
      }
    } catch (err) {
      logger.error('[RiffyManager] ❌ Error in handleTrackError:', err);
    }
  }

  async handleQueueEnd(player) {
    logger.info(`[RiffyManager] 🏁 handleQueueEnd called for guild ${player.guildId}`);
    logger.info(`[RiffyManager] Final player state: playing=${player.playing}, paused=${player.paused}`);

    const guild = this.client.guilds.cache.get(player.guildId);
    if (!guild) {
      logger.warn(`[RiffyManager] ⚠️ Guild ${player.guildId} not found`);
      return;
    }

    const channel = guild.channels.cache.get(player.textChannel);
    if (!channel) {
      logger.warn(`[RiffyManager] ⚠️ Text channel not found`);
      return;
    }

    try {
      logger.info(`[RiffyManager] 📨 Sending queue end message to channel`);
      await channel.send('✅ Queue has ended. Thanks for listening!');

      logger.info(`[RiffyManager] ⏲️ Scheduling player destruction in 30 seconds`);
      // Destroy player after a delay
      setTimeout(() => {
        if (player && player.queue.length === 0) {
          logger.info(`[RiffyManager] 🗑️ Destroying player for guild ${player.guildId} (queue empty)`);
          player.destroy();
        } else {
          logger.info(`[RiffyManager] ⏸️ Player destruction cancelled (queue has ${player?.queue.length || 0} tracks)`);
        }
      }, 30000); // 30 seconds
    } catch (error) {
      logger.error('[RiffyManager] ❌ Error in handleQueueEnd:', error);
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
    logger.info(`[RiffyManager] 🎮 createPlayer called for guild ${guildId}`);
    logger.info(`[RiffyManager] Voice channel: ${voiceChannelId}, Text channel: ${textChannelId}`);

    let player = this.riffy.players.get(guildId);

    if (!player) {
      logger.info(`[RiffyManager] 🆕 No existing player found, creating new connection`);

      player = this.riffy.createConnection({
        guildId: guildId,
        voiceChannel: voiceChannelId,
        textChannel: textChannelId,
        deaf: true,
        mute: false
      });

      logger.info(`[RiffyManager] ✅ Created new player for guild ${guildId}`);
      logger.info(`[RiffyManager] Player node: ${player.node?.name || 'unknown'}`);
    } else {
      logger.info(`[RiffyManager] ♻️ Reusing existing player for guild ${guildId}`);
      logger.info(`[RiffyManager] Existing player state: playing=${player.playing}, paused=${player.paused}, queue=${player.queue.length}`);
    }

    return player;
  }

  /**
   * Get player for a guild
   */
  getPlayer(guildId) {
    logger.info(`[RiffyManager] 🔍 getPlayer called for guild ${guildId}`);
    const player = this.riffy.players.get(guildId);

    if (player) {
      logger.info(`[RiffyManager] ✅ Player found - State: playing=${player.playing}, paused=${player.paused}, queue=${player.queue.length}`);
    } else {
      logger.info(`[RiffyManager] ❌ No player found for guild ${guildId}`);
    }

    return player;
  }

  /**
   * Search for tracks using lavaSearch plugin
   */
  async search(query, platform = 'ytmsearch') {
    logger.info(`[RiffyManager] 🔍 search called with query: "${query}", platform: ${platform}`);

    const node = this.getNode();
    if (!node) {
      logger.error(`[RiffyManager] ❌ No available nodes for search`);
      throw new Error('No available nodes for search');
    }

    logger.info(`[RiffyManager] Using node: ${node.name}`);

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
    const isUrl = query.match(/^https?:\/\//);

    if (!isUrl) {
      const prefix = platformPrefixes[platform.toLowerCase()] || platform;
      searchQuery = `${prefix}:${query}`;
      logger.info(`[RiffyManager] Applied search prefix: ${prefix}`);
    } else {
      logger.info(`[RiffyManager] Query is a URL, no prefix applied`);
    }

    logger.info(`[RiffyManager] 🔎 Searching: ${searchQuery}`);

    try {
      const startTime = Date.now();
      // Use riffy.resolve() instead of node.rest.resolve()
      const result = await this.riffy.resolve({ query: searchQuery, requester: this.client.user });
      const duration = Date.now() - startTime;

      logger.info(`[RiffyManager] ✅ Search completed in ${duration}ms`);
      logger.info(`[RiffyManager] Load type: ${result.loadType}, tracks: ${result.tracks?.length || 0}`);

      if (result.loadType === 'playlist') {
        logger.info(`[RiffyManager] 📜 Playlist found: ${result.playlistInfo?.name || 'Unknown'}`);
      }

      return result;
    } catch (error) {
      logger.error('[RiffyManager] ❌ Search error:', error);
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
