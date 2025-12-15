import logger from '../utils/logger.js';

export default class Dispatcher {
    constructor(options) {
        this.client = options.client;
        this.guild = options.guild;
        this.channelId = options.channelId;
        this.channel = options.channel;
        this.node = options.node;

        logger.info(`[Dispatcher] Creating dispatcher for guild ${this.guild.id} in channel ${this.channelId}`);

        // Kazagumo-style queue architecture
        this.queue = [];              // Upcoming tracks
        this.current = null;          // Currently playing track
        this.previous = [];           // Previously played tracks
        this.loop = 'none';           // none, track, queue
        
        this.player = null;
        this.playing = false;         // Track playing state
        this.paused = false;          // Pause state
        this.exists = true;
        this.ready = false;

        logger.debug(`[Dispatcher] State initialized for guild ${this.guild.id}`);
        // Don't await here - initialization happens async, play() will wait
        this.initializePlayer();
    }

    isPlaying() {
        // Shoukaku v4: Check if player exists and has a track loaded
        return this.player && this.player.track !== null;
    }

    async initializePlayer() {
        logger.info(`[Dispatcher] Initializing player for guild ${this.guild.id}`);
        try {
            logger.debug(`[Dispatcher] Joining voice channel ${this.channelId} in guild ${this.guild.id}`);
            
            // Shoukaku v4: Use shoukaku.joinVoiceChannel() instead of node.joinChannel()
            this.player = await this.client.music.joinVoiceChannel({
                guildId: this.guild.id,
                channelId: this.channelId,
                shardId: this.guild.shardId
            });

            logger.info(`[Dispatcher] Player created successfully for guild ${this.guild.id}`);
            logger.debug(`[Dispatcher] Player node: ${this.player?.node?.name || 'unknown'}`);
            
            // Wait for connection to be established
            if (this.player.connection) {
                logger.debug(`[Dispatcher] Waiting for connection to establish for guild ${this.guild.id}`);
                let attempts = 0;
                const maxAttempts = 30; // 3 seconds max
                
                while (attempts < maxAttempts && (!this.player.connection.state || this.player.connection.state === 4)) {
                    // State 4 is CONNECTING, wait for it to become ready
                    await new Promise(resolve => setTimeout(resolve, 100));
                    attempts++;
                    logger.debug(`[Dispatcher] Connection state: ${this.player.connection.state} (attempt ${attempts}/${maxAttempts})`);
                }
                
                if (this.player.connection.state && this.player.connection.state !== 4) {
                    logger.info(`[Dispatcher] Connection established - state: ${this.player.connection.state} for guild ${this.guild.id}`);
                } else {
                    logger.warn(`[Dispatcher] Connection state still not ready after waiting: ${this.player.connection.state} for guild ${this.guild.id}`);
                }
            } else {
                logger.warn(`[Dispatcher] Player has no connection object for guild ${this.guild.id}`);
            }

            logger.debug(`[Dispatcher] Attaching event listeners for guild ${this.guild.id}`);
            this.player
                .on('start', (data) => this.onStart(data))
                .on('end', (data) => this.onEnd(data))
                .on('stuck', (data) => this.onStuck(data))
                .on('closed', (data) => this.onClosed(data))
                .on('error', (data) => this.onError(data));

            this.ready = true;
            logger.info(`[Dispatcher] Player ready for guild ${this.guild.id}`);

        } catch (error) {
            logger.error(`[Dispatcher] Failed to initialize player for guild ${this.guild.id}:`, error);
            this.destroy();
        }
    }

    async play() {
        logger.info(`[Dispatcher] play() called for guild ${this.guild.id}`);
        logger.debug(`[Dispatcher] State - exists: ${this.exists}, queueLength: ${this.queue.length}, current: ${!!this.current}`);
        
        // Kazagumo pattern: Check if there's a current track or queue has items
        if (!this.exists) {
            logger.warn(`[Dispatcher] Dispatcher no longer exists for guild ${this.guild.id}, aborting play`);
            return this.destroy();
        }
        
        // Wait for player to be ready with better retry logic
        let retries = 0;
        const maxRetries = 20; // 2 seconds max wait
        while (!this.player && retries < maxRetries) {
            logger.warn(`[Dispatcher] Player not initialized for guild ${this.guild.id}, waiting... (attempt ${retries + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, 100));
            retries++;
        }
        
        if (!this.player) {
            logger.error(`[Dispatcher] Player still not ready after ${maxRetries * 100}ms for guild ${this.guild.id}`);
            return this.destroy();
        }
        
        // Verify player has a connection before playing
        if (!this.player.connection || !this.player.connection.state) {
            logger.error(`[Dispatcher] Player exists but has no valid connection for guild ${this.guild.id}`);
            logger.debug(`[Dispatcher] Player.connection: ${!!this.player.connection}, state: ${this.player.connection?.state}`);
            return this.destroy();
        }
        
        logger.debug(`[Dispatcher] Player ready - connection state: ${this.player.connection.state} for guild ${this.guild.id}`);
        
        // Kazagumo pattern: If no current track, shift from queue
        if (!this.current) {
            logger.debug(`[Dispatcher] No current track, shifting from queue for guild ${this.guild.id}`);
            this.current = this.queue.shift();
        }
        
        // If still no track, check if queue is empty
        if (!this.current) {
            logger.info(`[Dispatcher] No tracks to play for guild ${this.guild.id}, destroying player`);
            return this.destroy();
        }
        
        logger.info(`[Dispatcher] Playing track: "${this.current.info.title}" (${this.current.info.length}ms) for guild ${this.guild.id}`);
        logger.debug(`[Dispatcher] Track URI: ${this.current.info.uri}`);
        logger.debug(`[Dispatcher] Track encoded: ${typeof this.current.track} - ${this.current.track ? 'exists' : 'missing'}`);
        
        // Validate track data
        if (!this.current.track || typeof this.current.track !== 'string') {
            logger.error(`[Dispatcher] Invalid track encoding for guild ${this.guild.id} - type: ${typeof this.current.track}`);
            logger.warn(`[Dispatcher] Skipping invalid track "${this.current.info.title}"`);
            this.previous.push(this.current);
            this.current = null;
            this.playing = false;
            if (this.queue.length > 0) {
                return this.play();
            }
            return this.destroy();
        }
        
        try {
            logger.debug(`[Dispatcher] Calling playTrack() for guild ${this.guild.id}`);
            // Shoukaku v4: playTrack accepts { track: encodedString }
            await this.player.playTrack({ track: this.current.track });
            logger.debug(`[Dispatcher] playTrack() succeeded, setting volume for guild ${this.guild.id}`);
            
            // Shoukaku v4: Use setFilterVolume instead of setGlobalVolume
            await this.player.setFilterVolume(0.8); // 0.8 = 80%
            logger.debug(`[Dispatcher] Volume set to 80% for guild ${this.guild.id}`);
            
            this.playing = true;
            this.paused = false;
            logger.info(`[Dispatcher] Track started successfully for guild ${this.guild.id}`);
        } catch (error) {
            logger.error(`[Dispatcher] Failed to play track for guild ${this.guild.id}:`, error);
            logger.debug(`[Dispatcher] Error details - name: ${error.name}, message: ${error.message}`);
            
            // On error, skip the failed track (don't re-queue it to prevent infinite loops)
            if (this.current) {
                logger.warn(`[Dispatcher] Skipping failed track "${this.current.info.title}" for guild ${this.guild.id}`);
                // Add to previous array so it's tracked as skipped
                this.previous.push(this.current);
            }
            this.current = null;
            this.playing = false;
            
            // Try next track if available
            if (this.queue.length > 0) {
                logger.info(`[Dispatcher] Attempting to play next track for guild ${this.guild.id}`);
                return this.play();
            }
            logger.warn(`[Dispatcher] No more tracks, destroying player for guild ${this.guild.id}`);
            this.destroy();
        }
    }

    onStart() {
        logger.info(`[Dispatcher] onStart event fired for guild ${this.guild.id}`);
        
        // Kazagumo pattern: Mark as playing when track starts
        this.playing = true;
        this.paused = false;
        
        if (!this.current) {
            logger.warn(`[Dispatcher] onStart fired but no current track for guild ${this.guild.id}`);
            return;
        }
        
        logger.info(`[Dispatcher] Now playing "${this.current.info.title}" in guild ${this.guild.id}`);
        
        const embed = this.client.embed()
            .setTitle('Now Playing')
            .setDescription(`[${this.current.info.title}](${this.current.info.uri})`)
            .setThumbnail(this.current.info.artworkUrl || null)
            .addFields(
                { name: 'Duration', value: this.formatTime(this.current.info.length), inline: true },
                { name: 'Requested by', value: `<@${this.current.requester.id}>`, inline: true }
            )
            .setColor(this.client.color.main);
            
        this.channel.send({ embeds: [embed] }).catch(err => {
            logger.warn(`[Dispatcher] Failed to send now playing message for guild ${this.guild.id}:`, err.message);
        });
    }

    onEnd(data) {
        logger.info(`[Dispatcher] onEnd event fired for guild ${this.guild.id}, reason: ${data.reason}`);
        logger.debug(`[Dispatcher] Track that ended: "${this.current?.info?.title || 'unknown'}"`);
        logger.debug(`[Dispatcher] Current queue size: ${this.queue.length}`);
        
        // Kazagumo pattern: Handle different end reasons
        if (data.reason === 'replaced') {
            logger.debug(`[Dispatcher] Track replaced, ignoring onEnd for guild ${this.guild.id}`);
            return;
        }
        
        // Don't process if player is being destroyed
        if (!this.exists) {
            logger.debug(`[Dispatcher] Dispatcher no longer exists, ignoring onEnd for guild ${this.guild.id}`);
            return;
        }
        
        // Kazagumo pattern: Handle cleanup/loadFailed reasons
        if (['loadFailed', 'cleanup'].includes(data.reason)) {
            logger.warn(`[Dispatcher] Track failed/cleanup for guild ${this.guild.id}, reason: ${data.reason}`);
            
            // Add to previous if not already there
            if (this.current && !this.previous.find(t => 
                t.info.identifier === this.current.info.identifier && 
                t.info.title === this.current.info.title
            )) {
                logger.debug(`[Dispatcher] Adding failed track to history for guild ${this.guild.id}`);
                this.previous.unshift(this.current);
            }
            
            this.current = null;
            this.playing = false;
            
            // Try next track if available
            if (this.queue.length > 0) {
                logger.info(`[Dispatcher] ${this.queue.length} tracks remaining, playing next for guild ${this.guild.id}`);
                return this.play();
            }
            logger.info(`[Dispatcher] No more tracks after failure, destroying for guild ${this.guild.id}`);
            return this.destroy();
        }
        
        // Kazagumo pattern: Handle loop modes
        if (this.loop === 'track' && this.current) {
            logger.debug(`[Dispatcher] Loop mode: track - re-queuing current track for guild ${this.guild.id}`);
            // Re-add current track to front of queue for repeat
            this.queue.unshift(this.current);
        } else if (this.loop === 'queue' && this.current) {
            logger.debug(`[Dispatcher] Loop mode: queue - adding track to end for guild ${this.guild.id}`);
            // Add current track to end of queue for queue loop
            this.queue.push(this.current);
        }
        
        // Add to previous history (Kazagumo pattern)
        if (this.current && !this.previous.find(t => 
            t.info.identifier === this.current.info.identifier && 
            t.info.title === this.current.info.title
        )) {
            logger.debug(`[Dispatcher] Adding completed track "${this.current.info.title}" to history for guild ${this.guild.id}`);
            this.previous.unshift(this.current);
        }
        
        const completedTrack = this.current;
        this.current = null;
        this.playing = false;
        logger.debug(`[Dispatcher] Track completed, cleared current for guild ${this.guild.id}`);
        
        // Kazagumo pattern: Auto-play next track or stay idle
        if (this.queue.length > 0) {
            logger.info(`[Dispatcher] ${this.queue.length} tracks in queue, auto-playing next for guild ${this.guild.id}`);
            return this.play();
        } else {
            logger.info(`[Dispatcher] Queue empty, staying connected and waiting for more tracks for guild ${this.guild.id}`);
            // Queue is empty, but stay connected for more songs
            // Don't destroy - let users add more songs
        }
    }

    onStuck(data) {
        logger.warn(`[Dispatcher] onStuck event fired for guild ${this.guild.id}`);
        logger.debug(`[Dispatcher] Stuck data:`, data);
        this.playing = false;
        
        // Kazagumo pattern: Skip stuck track by stopping it
        if (this.player) {
            logger.info(`[Dispatcher] Stopping stuck track for guild ${this.guild.id}`);
            this.player.stopTrack();
        } else {
            logger.warn(`[Dispatcher] No player to stop stuck track, destroying for guild ${this.guild.id}`);
            this.destroy();
        }
    }

    onClosed(data) {
        logger.warn(`[Dispatcher] onClosed event fired for guild ${this.guild.id}`);
        logger.debug(`[Dispatcher] Close data - code: ${data.code}, reason: ${data.reason}, byRemote: ${data.byRemote}`);
        this.destroy();
    }

    onError(error) {
        logger.error(`[Dispatcher] onError event fired for guild ${this.guild.id}:`, error);
        logger.debug(`[Dispatcher] Error type: ${error.type || 'unknown'}, severity: ${error.severity || 'unknown'}`);
        this.playing = false;
        
        // Try next track if available, otherwise destroy
        if (this.queue.length > 0) {
            logger.info(`[Dispatcher] Error occurred but ${this.queue.length} tracks remain, attempting next for guild ${this.guild.id}`);
            this.current = null;
            this.play();
        } else {
            logger.warn(`[Dispatcher] Error occurred and no tracks remain, destroying for guild ${this.guild.id}`);
            this.destroy();
        }
    }

    destroy() {
        logger.info(`[Dispatcher] destroy() called for guild ${this.guild.id}`);
        logger.debug(`[Dispatcher] Current state - exists: ${this.exists}, playing: ${this.playing}, queueSize: ${this.queue.length}`);
        
        this.exists = false;
        
        // Properly disconnect the Shoukaku player
        if (this.player) {
            logger.debug(`[Dispatcher] Player exists, attempting disconnect for guild ${this.guild.id}`);
            logger.debug(`[Dispatcher] Player connection state: ${this.player.connection ? 'connected' : 'no connection'}`);
            
            try {
                if (this.player.connection) {
                    logger.debug(`[Dispatcher] Disconnecting player.connection for guild ${this.guild.id}`);
                    this.player.connection.disconnect();
                    logger.info(`[Dispatcher] Player connection disconnected for guild ${this.guild.id}`);
                } else {
                    logger.warn(`[Dispatcher] No player.connection to disconnect for guild ${this.guild.id}`);
                }
                
                // Also destroy the player on Shoukaku side
                if (this.client.music.players && this.client.music.players.get(this.guild.id)) {
                    logger.debug(`[Dispatcher] Found player in music.players map, disconnecting for guild ${this.guild.id}`);
                    const shoukakuPlayer = this.client.music.players.get(this.guild.id);
                    
                    if (shoukakuPlayer.connection) {
                        logger.debug(`[Dispatcher] Disconnecting Shoukaku player connection for guild ${this.guild.id}`);
                        shoukakuPlayer.connection.disconnect();
                        logger.info(`[Dispatcher] Shoukaku player disconnected for guild ${this.guild.id}`);
                    } else {
                        logger.warn(`[Dispatcher] Shoukaku player has no connection for guild ${this.guild.id}`);
                    }
                } else {
                    logger.debug(`[Dispatcher] No player found in music.players map for guild ${this.guild.id}`);
                }
            } catch (e) {
                logger.error(`[Dispatcher] Error disconnecting player for guild ${this.guild.id}:`, e);
                logger.debug(`[Dispatcher] Disconnect error stack:`, e.stack);
            }
        } else {
            logger.warn(`[Dispatcher] No player to disconnect for guild ${this.guild.id}`);
        }
        
        logger.debug(`[Dispatcher] Removing queue from music.queues map for guild ${this.guild.id}`);
        this.client.music.queues.delete(this.guild.id);
        logger.info(`[Dispatcher] Queue removed from map for guild ${this.guild.id}`);
        
        const embed = this.client.embed()
            .setDescription('Queue finished or player stopped. Disconnecting.')
            .setColor(this.client.color.red);
            
        this.channel.send({ embeds: [embed] }).catch(err => {
            logger.debug(`[Dispatcher] Failed to send disconnect message for guild ${this.guild.id}:`, err.message);
        });
        
        logger.info(`[Dispatcher] Destroy completed for guild ${this.guild.id}`);
    }

    formatTime(ms) {
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    }
    
    // Kazagumo-style helper methods
    
    /**
     * Skip the current track
     * Kazagumo pattern: stopTrack triggers onEnd event
     */
    skip() {
        logger.info(`[Dispatcher] skip() called for guild ${this.guild.id}`);
        if (!this.player) {
            logger.warn(`[Dispatcher] No player to skip for guild ${this.guild.id}`);
            return false;
        }
        logger.debug(`[Dispatcher] Calling stopTrack() for guild ${this.guild.id}`);
        this.player.stopTrack();
        logger.info(`[Dispatcher] Track skipped for guild ${this.guild.id}`);
        return true;
    }
    
    /**
     * Pause or resume the player
     * @param {boolean} state - true to pause, false to resume
     */
    pause(state) {
        logger.info(`[Dispatcher] pause(${state}) called for guild ${this.guild.id}`);
        if (!this.player) {
            logger.warn(`[Dispatcher] No player to pause for guild ${this.guild.id}`);
            return false;
        }
        this.paused = state;
        this.playing = !state;
        logger.debug(`[Dispatcher] Setting player pause state to ${state} for guild ${this.guild.id}`);
        this.player.setPaused(state);
        logger.info(`[Dispatcher] Player ${state ? 'paused' : 'resumed'} for guild ${this.guild.id}`);
        return true;
    }
    
    /**
     * Set loop mode (Kazagumo pattern)
     * @param {string} mode - 'none', 'track', or 'queue'
     */
    setLoop(mode) {
        logger.info(`[Dispatcher] setLoop(${mode}) called for guild ${this.guild.id}`);
        if (!['none', 'track', 'queue'].includes(mode)) {
            logger.error(`[Dispatcher] Invalid loop mode "${mode}" for guild ${this.guild.id}`);
            throw new Error("loop must be one of 'none', 'track', 'queue'");
        }
        const oldMode = this.loop;
        this.loop = mode;
        logger.info(`[Dispatcher] Loop mode changed from "${oldMode}" to "${mode}" for guild ${this.guild.id}`);
        return this;
    }
    
    /**
     * Get the size of the queue (Kazagumo pattern)
     */
    get size() {
        const size = this.queue.length;
        logger.debug(`[Dispatcher] Queue size requested: ${size} for guild ${this.guild.id}`);
        return size;
    }
    
    /**
     * Get total size including current track (Kazagumo pattern)
     */
    get totalSize() {
        const total = this.queue.length + (this.current ? 1 : 0);
        logger.debug(`[Dispatcher] Total size requested: ${total} (queue: ${this.queue.length}, current: ${this.current ? 1 : 0}) for guild ${this.guild.id}`);
        return total;
    }
    
    /**
     * Check if queue is empty (Kazagumo pattern)
     */
    get isEmpty() {
        const empty = this.queue.length === 0 && !this.current;
        logger.debug(`[Dispatcher] isEmpty check: ${empty} (queue: ${this.queue.length}, current: ${!!this.current}) for guild ${this.guild.id}`);
        return empty;
    }
    
    /**
     * Get the previous track (Kazagumo pattern)
     * @param {boolean} remove - Remove from previous array
     */
    getPrevious(remove = false) {
        logger.info(`[Dispatcher] getPrevious(${remove}) called for guild ${this.guild.id}`);
        logger.debug(`[Dispatcher] Previous tracks count: ${this.previous.length}`);
        
        if (remove) {
            const track = this.previous.shift();
            logger.info(`[Dispatcher] Removed and returned previous track: ${track?.info?.title || 'none'} for guild ${this.guild.id}`);
            return track;
        }
        
        const track = this.previous[0];
        logger.debug(`[Dispatcher] Returning previous track (not removed): ${track?.info?.title || 'none'} for guild ${this.guild.id}`);
        return track;
    }
    
    /**
     * Clear the queue (Kazagumo pattern)
     */
    clear() {
        const oldSize = this.queue.length;
        logger.info(`[Dispatcher] clear() called for guild ${this.guild.id}`);
        logger.debug(`[Dispatcher] Clearing ${oldSize} tracks from queue`);
        this.queue = [];
        logger.info(`[Dispatcher] Queue cleared (was ${oldSize} tracks) for guild ${this.guild.id}`);
        return this;
    }
    
    /**
     * Shuffle the queue (Kazagumo pattern)
     */
    shuffle() {
        logger.info(`[Dispatcher] shuffle() called for guild ${this.guild.id}`);
        logger.debug(`[Dispatcher] Shuffling ${this.queue.length} tracks`);
        
        for (let i = this.queue.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.queue[i], this.queue[j]] = [this.queue[j], this.queue[i]];
        }
        
        logger.info(`[Dispatcher] Queue shuffled (${this.queue.length} tracks) for guild ${this.guild.id}`);
        return this;
    }
}
