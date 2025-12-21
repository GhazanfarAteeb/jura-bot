import { Riffy } from 'riffy';
import logger from '../utils/logger.js';

/**
 * RiffyManager - Simple Riffy client initialization (reference bot style)
 * Events are handled in separate files in src/music/events/
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

    // Initialize Riffy - simple and clean like reference bot
    this.riffy = new Riffy(client, this.nodes, {
      send: (payload) => {
        const guild = client.guilds.cache.get(payload.d.guild_id);
        if (guild) guild.shard.send(payload);
      },
      defaultSearchPlatform: 'ytmsearch',
      restVersion: 'v4'
    });

    // Patch to ignore NodeLink custom events
    this.patchNodeLinkEvents();

    logger.info('[RiffyManager] Riffy initialized');
  }

  /**
   * Patch Riffy to ignore NodeLink's custom events
   * NodeLink sends events that vanilla Lavalink doesn't, which Riffy doesn't handle
   */
  patchNodeLinkEvents() {
    const ignoredEvents = [
      'PlayerCreatedEvent',
      'VolumeChangedEvent',
      'PlayerConnectedEvent',
      'PlayerDestroyedEvent',
      'PlayerPausedEvent',
      'PlayerResumedEvent'
    ];

    // Patch all existing players
    this.riffy.players.forEach(player => {
      if (!player._nodeLinkPatched) {
        const originalHandleEvent = player.handleEvent.bind(player);
        player.handleEvent = (data) => {
          if (ignoredEvents.includes(data.type)) return;
          try {
            originalHandleEvent(data);
          } catch (error) {
            if (!error.message?.includes('unknown event')) throw error;
          }
        };
        player._nodeLinkPatched = true;
      }
    });

    // Patch createConnection to auto-patch new players
    const originalCreate = this.riffy.createConnection.bind(this.riffy);
    this.riffy.createConnection = (options) => {
      const player = originalCreate(options);
      if (!player._nodeLinkPatched) {
        const originalHandleEvent = player.handleEvent.bind(player);
        player.handleEvent = (data) => {
          if (ignoredEvents.includes(data.type)) return;
          try {
            originalHandleEvent(data);
          } catch (error) {
            if (!error.message?.includes('unknown event')) throw error;
          }
        };
        player._nodeLinkPatched = true;
      }
      return player;
    };

    logger.info('[RiffyManager] NodeLink event patch applied');
  }
}
