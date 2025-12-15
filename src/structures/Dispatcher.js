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

    logger.info(`[Dispatcher] State initialized for guild ${this.guild.id}`);
    // Don't await here - initialization happens async, play() will wait
    this.initializePlayer();
  }

  isPlaying() {
    // Check if dispatcher is actively playing or has a current track
    // This handles both active playback and idle-but-ready state
    const result = this.playing || (this.current !== null && this.current !== undefined);
    logger.info(`[Dispatcher] isPlaying() check for guild ${this.guild.id}: ${result} (playing: ${this.playing}, hasCurrent: ${!!this.current})`);
    return result;
  }

  /**
   * Find best matching track from search results
   * Prefers full tracks over previews and better title/artist matches
   */
  static findBestMatch(tracks, targetTitle, targetArtist, targetDuration = null) {
    if (!tracks || tracks.length === 0) return null;
    if (tracks.length === 1) return tracks[0];

    logger.info(`[Dispatcher] Finding best match for "${targetTitle}" by "${targetArtist}" from ${tracks.length} results`);

    // Score each track
    const scoredTracks = tracks.map(track => {
      let score = 0;
      const trackTitle = track.info.title.toLowerCase();
      const trackArtist = track.info.author.toLowerCase();
      const targetTitleLower = targetTitle.toLowerCase();
      const targetArtistLower = targetArtist.toLowerCase();

      // Title match scoring
      if (trackTitle === targetTitleLower) score += 50;
      else if (trackTitle.includes(targetTitleLower)) score += 30;
      else if (targetTitleLower.includes(trackTitle)) score += 20;

      // Artist match scoring
      if (trackArtist === targetArtistLower) score += 30;
      else if (trackArtist.includes(targetArtistLower)) score += 20;
      else if (targetArtistLower.includes(trackArtist)) score += 10;

      // Duration scoring (prefer full tracks)
      const trackDuration = track.info.length;
      if (trackDuration > 60000) { // Longer than 1 minute
        score += 20; // Prefer full tracks
      }
      if (trackDuration < 45000) { // Shorter than 45 seconds (likely preview)
        score -= 30; // Penalize previews
      }

      // If target duration is known, prefer tracks with similar duration
      if (targetDuration && trackDuration) {
        const durationDiff = Math.abs(trackDuration - targetDuration);
        if (durationDiff < 5000) score += 15; // Within 5 seconds
        else if (durationDiff < 15000) score += 10; // Within 15 seconds
        else if (durationDiff < 30000) score += 5; // Within 30 seconds
      }

      logger.info(`[Dispatcher] Track "${track.info.title}" by "${track.info.author}" - Duration: ${trackDuration}ms, Score: ${score}`);
      return { track, score };
    });

    // Sort by score (highest first)
    scoredTracks.sort((a, b) => b.score - a.score);

    const bestMatch = scoredTracks[0].track;
    logger.info(`[Dispatcher] Best match: "${bestMatch.info.title}" by "${bestMatch.info.author}" with score ${scoredTracks[0].score}`);

    return bestMatch;
  }

  async initializePlayer() {
    logger.info(`[Dispatcher] Initializing player for guild ${this.guild.id}`);
    try {
      logger.info(`[Dispatcher] Joining voice channel ${this.channelId} in guild ${this.guild.id}`);

      // Shoukaku v4: Use shoukaku.joinVoiceChannel() instead of node.joinChannel()
      this.player = await this.client.music.joinVoiceChannel({
        guildId: this.guild.id,
        channelId: this.channelId,
        shardId: this.guild.shardId
      });

      logger.info(`[Dispatcher] Player created successfully for guild ${this.guild.id}`);
      logger.info(`[Dispatcher] Player details - node: ${this.player?.node?.name}, track: ${this.player?.track}`);

      // Shoukaku v4: Connection is established through Discord.js voice system
      // The player is ready to use immediately after joinVoiceChannel resolves
      // No need to check connection.state as it's handled internally
      logger.info(`[Dispatcher] Player object keys: ${Object.keys(this.player).join(', ')}`);

      // Give Discord a moment to establish the voice connection
      await new Promise(resolve => setTimeout(resolve, 500));

      logger.info(`[Dispatcher] Attaching event listeners for guild ${this.guild.id}`);
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
      logger.info(`[Dispatcher] Error stack:`, error.stack);
      this.destroy();
    }
  }

  async play() {
    logger.info(`[Dispatcher] play() called for guild ${this.guild.id}`);
    logger.info(`[Dispatcher] State - exists: ${this.exists}, queueLength: ${this.queue.length}, current: ${!!this.current}`);

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

    // Shoukaku v4: Player is ready after joinVoiceChannel resolves
    // No need to check connection state - it's managed internally by Shoukaku
    logger.info(`[Dispatcher] Player exists and ready for guild ${this.guild.id}`);

    // Kazagumo pattern: If no current track, shift from queue
    if (!this.current) {
      logger.info(`[Dispatcher] No current track, shifting from queue for guild ${this.guild.id}`);
      this.current = this.queue.shift();
    }

    // If still no track, check if queue is empty
    if (!this.current) {
      logger.info(`[Dispatcher] No tracks to play for guild ${this.guild.id}, destroying player`);
      return this.destroy();
    }

    logger.info(`[Dispatcher] Playing track: "${this.current.info.title}" (${this.current.info.length}ms) for guild ${this.guild.id}`);
    logger.info(`[Dispatcher] Track URI: ${this.current.info.uri}`);
    logger.info(`[Dispatcher] Track encoded: ${typeof this.current.track} - ${this.current.track ? 'exists' : 'missing'}`);

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
      logger.info(`[Dispatcher] Calling playTrack() for guild ${this.guild.id}`);
      logger.info(`[Dispatcher] Track data - encoded: ${typeof this.current.track}, length: ${this.current.track?.length}`);
      logger.info(`[Dispatcher] Track info - title: "${this.current.info.title}", artist: "${this.current.info.author}", duration: ${this.current.info.length}ms`);
      // Shoukaku v4: playTrack accepts { track: { encoded: string } }
      await this.player.playTrack({ track: { encoded: this.current.track } });
      logger.info(`[Dispatcher] playTrack() API call succeeded for guild ${this.guild.id}`);
      await this.player.setGlobalVolume(80);
      logger.info(`[Dispatcher] Volume set to 80 for guild ${this.guild.id}`);

      this.playing = true;
      this.paused = false;
      logger.info(`[Dispatcher] Player state updated - playing: true, paused: false for guild ${this.guild.id}`);
    } catch (error) {
      logger.info(`[Dispatcher] Failed to play track for guild ${this.guild.id}:`, error);
      logger.info(`[Dispatcher] Error details - name: ${error.name}, message: ${error.message}`);

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
    logger.info(`[Dispatcher] Player state at start - paused: ${this.paused}, volume: ${this.volume}%`);

    // Track when the song actually starts playing (for duration tracking)
    this.trackStartTime = Date.now();
    logger.info(`[Dispatcher] Track start timestamp recorded: ${this.trackStartTime}`);

    // Kazagumo pattern: Mark as playing when track starts
    this.playing = true;
    this.paused = false;
    logger.info(`[Dispatcher] Updated player state - playing: true, paused: false`);

    if (!this.current) {
      logger.warn(`[Dispatcher] onStart fired but no current track for guild ${this.guild.id}`);
      return;
    }

    logger.info(`[Dispatcher] Now playing "${this.current.info.title}" in guild ${this.guild.id}`);
    logger.info(`[Dispatcher] Track details - artist: "${this.current.info.author}", duration: ${this.current.info.length}ms, source: ${this.current.info.sourceName}`);
    logger.info(`[Dispatcher] Queue status - remaining: ${this.queue.length} tracks, loop mode: "${this.loop}"`);

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
    logger.info(`[Dispatcher] Track that ended: "${this.current?.info?.title || 'unknown'}"`);
    logger.info(`[Dispatcher] Current queue size: ${this.queue.length}`);

    // Log track duration info to detect preview/snippet tracks
    if (this.current && this.trackStartTime) {
      const playedDuration = Date.now() - this.trackStartTime;
      const expectedDuration = this.current.info.length;
      const percentagePlayed = ((playedDuration / expectedDuration) * 100).toFixed(1);

      logger.info(`[Dispatcher] Track playback stats - Expected: ${expectedDuration}ms, Actual: ${playedDuration}ms, Percentage: ${percentagePlayed}%`);

      // Warn if track ended prematurely (less than 90% played)
      if (percentagePlayed < 90 && data.reason === 'finished') {
        logger.warn(`[Dispatcher] Track ended prematurely! This might be a preview/snippet. Source: ${this.current.info.sourceName}, URI: ${this.current.info.uri}`);
      }
    } else if (this.current) {
      logger.warn(`[Dispatcher] trackStartTime was not set for guild ${this.guild.id}`);
    }

    // Kazagumo pattern: Handle different end reasons
    if (data.reason === 'replaced') {
      logger.info(`[Dispatcher] Track replaced, ignoring onEnd for guild ${this.guild.id}`);
      return;
    }

    // Don't process if player is being destroyed
    if (!this.exists) {
      logger.info(`[Dispatcher] Dispatcher no longer exists, ignoring onEnd for guild ${this.guild.id}`);
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
        logger.info(`[Dispatcher] Adding failed track to history for guild ${this.guild.id}`);
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
      logger.info(`[Dispatcher] Loop mode: track - re-queuing "${this.current.info.title}" to front for guild ${this.guild.id}`);
      // Re-add current track to front of queue for repeat
      this.queue.unshift(this.current);
      logger.info(`[Dispatcher] Track looped, queue size now: ${this.queue.length}`);
    } else if (this.loop === 'queue' && this.current) {
      logger.info(`[Dispatcher] Loop mode: queue - adding "${this.current.info.title}" to end for guild ${this.guild.id}`);
      // Add current track to end of queue for queue loop
      this.queue.push(this.current);
      logger.info(`[Dispatcher] Track moved to end, queue size now: ${this.queue.length}`);
    }

    // Add to previous history (Kazagumo pattern)
    if (this.current && !this.previous.find(t =>
      t.info.identifier === this.current.info.identifier &&
      t.info.title === this.current.info.title
    )) {
      logger.info(`[Dispatcher] Adding completed track "${this.current.info.title}" to history for guild ${this.guild.id}`);
      this.previous.unshift(this.current);
    }

    const completedTrack = this.current;
    this.current = null;
    this.playing = false;
    logger.info(`[Dispatcher] Track completed, cleared current for guild ${this.guild.id}`);

    // Kazagumo pattern: Auto-play next track or stay idle
    if (this.queue.length > 0) {
      const nextTrack = this.queue[0];
      logger.info(`[Dispatcher] ${this.queue.length} tracks in queue, auto-playing next for guild ${this.guild.id}`);
      logger.info(`[Dispatcher] Next track will be: "${nextTrack.info.title}" by ${nextTrack.info.author}`);
      return this.play();
    } else {
      logger.info(`[Dispatcher] Queue empty, staying connected and waiting for more tracks for guild ${this.guild.id}`);
      logger.info(`[Dispatcher] Player idle - current state: playing: ${this.playing}, paused: ${this.paused}`);
      // Queue is empty, but stay connected for more songs
      // Don't destroy - let users add more songs
    }
  }

  onStuck(data) {
    logger.warn(`[Dispatcher] onStuck event fired for guild ${this.guild.id}`);
    logger.info(`[Dispatcher] Stuck data:`, data);
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
    logger.info(`[Dispatcher] Close data - code: ${data.code}, reason: ${data.reason}, byRemote: ${data.byRemote}`);
    this.destroy();
  }

  onError(error) {
    logger.error(`[Dispatcher] onError event fired for guild ${this.guild.id}:`, error);
    logger.info(`[Dispatcher] Error type: ${error.type || 'unknown'}, severity: ${error.severity || 'unknown'}`);
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
    logger.info(`[Dispatcher] Current state - exists: ${this.exists}, playing: ${this.playing}, queueSize: ${this.queue.length}`);

    this.exists = false;

    // Properly disconnect the Shoukaku v4 player
    if (this.player) {
      logger.info(`[Dispatcher] Player exists, attempting to leave voice channel for guild ${this.guild.id}`);

      try {
        // Shoukaku v4: Use leaveVoiceChannel to properly disconnect
        if (this.client.music.leaveVoiceChannel) {
          logger.info(`[Dispatcher] Calling leaveVoiceChannel for guild ${this.guild.id}`);
          this.client.music.leaveVoiceChannel(this.guild.id);
          logger.info(`[Dispatcher] Left voice channel for guild ${this.guild.id}`);
        } else {
          // Fallback: Try to disconnect via player if leaveVoiceChannel doesn't exist
          logger.info(`[Dispatcher] Using player.connection.disconnect() as fallback`);
          if (this.player.connection && typeof this.player.connection.disconnect === 'function') {
            this.player.connection.disconnect();
            logger.info(`[Dispatcher] Player connection disconnected for guild ${this.guild.id}`);
          } else {
            logger.warn(`[Dispatcher] No connection.disconnect method available for guild ${this.guild.id}`);
          }
        }
      } catch (e) {
        logger.error(`[Dispatcher] Error disconnecting player for guild ${this.guild.id}:`, e);
        logger.info(`[Dispatcher] Disconnect error stack:`, e.stack);
      }
    } else {
      logger.warn(`[Dispatcher] No player to disconnect for guild ${this.guild.id}`);
    }

    logger.info(`[Dispatcher] Removing queue from music.queues map for guild ${this.guild.id}`);
    this.client.music.queues.delete(this.guild.id);
    logger.info(`[Dispatcher] Queue removed from map for guild ${this.guild.id}`);

    const embed = this.client.embed()
      .setDescription('Queue finished or player stopped. Disconnecting.')
      .setColor(this.client.color.red);

    this.channel.send({ embeds: [embed] }).catch(err => {
      logger.info(`[Dispatcher] Failed to send disconnect message for guild ${this.guild.id}:`, err.message);
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
    logger.info(`[Dispatcher] Current track: "${this.current?.info?.title || 'none'}", queue size: ${this.queue.length}`);
    if (!this.player) {
      logger.warn(`[Dispatcher] No player to skip for guild ${this.guild.id}`);
      return false;
    }
    if (this.queue.length > 0) {
      logger.info(`[Dispatcher] Next track will be: "${this.queue[0].info.title}"`);
    } else {
      logger.info(`[Dispatcher] No more tracks in queue after skip`);
    }
    logger.info(`[Dispatcher] Calling stopTrack() to trigger onEnd event for guild ${this.guild.id}`);
    this.player.stopTrack();
    logger.info(`[Dispatcher] Track skipped successfully, onEnd will handle next track for guild ${this.guild.id}`);
    return true;
  }

  /**
   * Pause or resume the player
   * @param {boolean} state - true to pause, false to resume
   */
  pause(state) {
    logger.info(`[Dispatcher] pause(${state}) called for guild ${this.guild.id}`);
    logger.info(`[Dispatcher] Current state - paused: ${this.paused}, playing: ${this.playing}, track: "${this.current?.info?.title || 'none'}"`);
    if (!this.player) {
      logger.warn(`[Dispatcher] No player to pause for guild ${this.guild.id}`);
      return false;
    }
    const previousPaused = this.paused;
    this.paused = state;
    this.playing = !state;
    logger.info(`[Dispatcher] State change - paused: ${previousPaused} → ${state}, playing: ${!previousPaused} → ${!state}`);
    logger.info(`[Dispatcher] Calling player.setPaused(${state}) for guild ${this.guild.id}`);
    this.player.setPaused(state);
    logger.info(`[Dispatcher] Player ${state ? 'paused' : 'resumed'} successfully for guild ${this.guild.id}`);
    return true;
  }

  /**
   * Set loop mode (Kazagumo pattern)
   * @param {string} mode - 'none', 'track', or 'queue'
   */
  setLoop(mode) {
    logger.info(`[Dispatcher] setLoop(${mode}) called for guild ${this.guild.id}`);
    logger.info(`[Dispatcher] Current loop mode: "${this.loop}", requested: "${mode}"`);
    if (!['none', 'track', 'queue'].includes(mode)) {
      logger.error(`[Dispatcher] Invalid loop mode "${mode}" (must be 'none', 'track', or 'queue') for guild ${this.guild.id}`);
      throw new Error("loop must be one of 'none', 'track', 'queue'");
    }
    const oldMode = this.loop;
    this.loop = mode;
    let description = '';
    if (mode === 'none') description = 'No looping - tracks play once';
    else if (mode === 'track') description = 'Current track will repeat';
    else if (mode === 'queue') description = 'Queue will loop continuously';
    logger.info(`[Dispatcher] Loop mode changed from "${oldMode}" to "${mode}" - ${description} for guild ${this.guild.id}`);
    return this;
  }

  /**
   * Get the size of the queue (Kazagumo pattern)
   */
  get size() {
    const size = this.queue.length;
    logger.info(`[Dispatcher] Queue size requested: ${size} for guild ${this.guild.id}`);
    return size;
  }

  /**
   * Get total size including current track (Kazagumo pattern)
   */
  get totalSize() {
    const total = this.queue.length + (this.current ? 1 : 0);
    logger.info(`[Dispatcher] Total size requested: ${total} (queue: ${this.queue.length}, current: ${this.current ? 1 : 0}) for guild ${this.guild.id}`);
    return total;
  }

  /**
   * Check if queue is empty (Kazagumo pattern)
   */
  get isEmpty() {
    const empty = this.queue.length === 0 && !this.current;
    logger.info(`[Dispatcher] isEmpty check: ${empty} (queue: ${this.queue.length}, current: ${!!this.current}) for guild ${this.guild.id}`);
    return empty;
  }

  /**
   * Get the previous track (Kazagumo pattern)
   * @param {boolean} remove - Remove from previous array
   */
  getPrevious(remove = false) {
    logger.info(`[Dispatcher] getPrevious(${remove}) called for guild ${this.guild.id}`);
    logger.info(`[Dispatcher] Previous tracks count: ${this.previous.length}`);

    if (remove) {
      const track = this.previous.shift();
      logger.info(`[Dispatcher] Removed and returned previous track: ${track?.info?.title || 'none'} for guild ${this.guild.id}`);
      return track;
    }

    const track = this.previous[0];
    logger.info(`[Dispatcher] Returning previous track (not removed): ${track?.info?.title || 'none'} for guild ${this.guild.id}`);
    return track;
  }

  /**
   * Clear the queue (Kazagumo pattern)
   */
  clear() {
    const oldSize = this.queue.length;
    logger.info(`[Dispatcher] clear() called for guild ${this.guild.id}`);
    logger.info(`[Dispatcher] Current queue size: ${oldSize} tracks`);
    if (oldSize > 0) {
      const preview = this.queue.slice(0, 3).map(t => t.info.title);
      logger.info(`[Dispatcher] Removing tracks: ${preview.join(', ')}${oldSize > 3 ? ` and ${oldSize - 3} more` : ''}`);
    } else {
      logger.info(`[Dispatcher] Queue is already empty`);
    }
    this.queue = [];
    logger.info(`[Dispatcher] Queue cleared successfully - removed ${oldSize} tracks for guild ${this.guild.id}`);
    return this;
  }

  /**
   * Shuffle the queue (Kazagumo pattern)
   */
  shuffle() {
    logger.info(`[Dispatcher] shuffle() called for guild ${this.guild.id}`);
    logger.info(`[Dispatcher] Queue size: ${this.queue.length} tracks`);
    if (this.queue.length <= 1) {
      logger.warn(`[Dispatcher] Cannot shuffle - queue has ${this.queue.length} tracks (need at least 2)`);
      return this;
    }

    const before = this.queue.slice(0, 3).map(t => t.info.title);
    logger.info(`[Dispatcher] First 3 tracks before shuffle: ${before.join(', ')}`);

    for (let i = this.queue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.queue[i], this.queue[j]] = [this.queue[j], this.queue[i]];
    }

    const after = this.queue.slice(0, 3).map(t => t.info.title);
    logger.info(`[Dispatcher] First 3 tracks after shuffle: ${after.join(', ')}`);
    logger.info(`[Dispatcher] Queue shuffled successfully (${this.queue.length} tracks) for guild ${this.guild.id}`);
    return this;
  }
}
