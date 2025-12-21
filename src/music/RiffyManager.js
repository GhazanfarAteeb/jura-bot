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

    logger.info('[RiffyManager] Riffy initialized');
  }
}
