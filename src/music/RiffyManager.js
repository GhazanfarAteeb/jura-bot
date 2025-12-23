/**
 * Riffy Music Manager
 * Handles all music functionality using Riffy library
 */

import { Riffy } from 'riffy';
import musicConfig from './config.js';
import logger from '../utils/logger.js';

class RiffyManager {
    constructor(client) {
        this.client = client;
        this.riffy = null;
    }

    /**
     * Initialize Riffy with the client
     */
    initialize() {
        logger.info('Initializing Riffy Music Manager...');

        this.riffy = new Riffy(this.client, musicConfig.nodes, {
            send: (payload) => {
                const guild = this.client.guilds.cache.get(payload.d.guild_id);
                if (guild) guild.shard.send(payload);
            },
            defaultSearchPlatform: musicConfig.defaultSearchPlatform,
            restVersion: musicConfig.restVersion
        });

        // Attach riffy to client for global access
        this.client.riffy = this.riffy;

        // Setup event listeners
        this.setupEvents();

        logger.info('Riffy Music Manager initialized successfully');
        return this.riffy;
    }

    /**
     * Initialize Riffy with the bot's user ID (call after client is ready)
     */
    initializePlayer() {
        if (this.riffy && this.client.user) {
            this.riffy.init(this.client.user.id);
            logger.info('Riffy player initialized with bot ID: ' + this.client.user.id);
        }
    }

    /**
     * Setup Riffy event listeners
     */
    setupEvents() {
        // Node connected
        this.riffy.on('nodeConnect', (node) => {
            logger.info(`[RIFFY] Node ${node.name} has connected.`);
            console.log(`🎵 Lavalink Node ${node.name} connected`);
        });

        // Node error
        this.riffy.on('nodeError', (node, error) => {
            logger.error(`[RIFFY] Node ${node.name} encountered an error: ${error.message}`);
            console.error(`❌ Lavalink Node ${node.name} error:`, error.message);
        });

        // Node disconnect
        this.riffy.on('nodeDisconnect', (node) => {
            logger.warn(`[RIFFY] Node ${node.name} has disconnected.`);
            console.log(`⚠️ Lavalink Node ${node.name} disconnected`);
        });

        // Track start
        this.riffy.on('trackStart', async (player, track) => {
            this.client.emit('musicTrackStart', player, track);
        });

        // Track end
        this.riffy.on('trackEnd', async (player, track) => {
            this.client.emit('musicTrackEnd', player, track);
        });

        // Track error
        this.riffy.on('trackError', async (player, track, payload) => {
            this.client.emit('musicTrackError', player, track, payload);
        });

        // Queue end
        this.riffy.on('queueEnd', async (player) => {
            this.client.emit('musicQueueEnd', player);
        });

        // Player create
        this.riffy.on('playerCreate', (player) => {
            logger.info(`[RIFFY] Player created for guild ${player.guildId}`);
        });

        // Player destroy
        this.riffy.on('playerDestroy', (player) => {
            logger.info(`[RIFFY] Player destroyed for guild ${player.guildId}`);
        });
    }

    /**
     * Create a player connection
     */
    createPlayer(guildId, voiceChannelId, textChannelId) {
        return this.riffy.createConnection({
            guildId: guildId,
            voiceChannel: voiceChannelId,
            textChannel: textChannelId,
            deaf: true
        });
    }

    /**
     * Get existing player for a guild
     */
    getPlayer(guildId) {
        return this.riffy.players.get(guildId);
    }

    /**
     * Resolve a query to tracks
     */
    async resolve(query, requester) {
        return await this.riffy.resolve({ query, requester });
    }

    /**
     * Destroy a player
     */
    destroyPlayer(guildId) {
        const player = this.getPlayer(guildId);
        if (player) {
            player.destroy();
            return true;
        }
        return false;
    }
}

export default RiffyManager;
