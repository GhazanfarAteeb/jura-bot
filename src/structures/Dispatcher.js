import logger from '../utils/logger.js';

export default class Dispatcher {
    constructor(options) {
        this.client = options.client;
        this.guild = options.guild;
        this.channelId = options.channelId;
        this.channel = options.channel;
        this.node = options.node;

        this.queue = [];
        this.history = [];
        this.current = null;
        this.loop = 'off'; // off, track, queue
        this.matchedTracks = [];
        this.player = null;
        this.exists = true;
        this.ready = false;

        this.initializePlayer();
    }

    isPlaying() {
        // Shoukaku v4: Check if player exists and has a track loaded
        return this.player && this.player.track !== null;
    }

    async initializePlayer() {
        try {
            this.player = await this.client.music.joinVoiceChannel({
                guildId: this.guild.id,
                channelId: this.channelId,
              shardId: this.guild.shardId,
              deaf: true,
                mute: false
            });

            this.player
                .on('start', (data) => this.onStart(data))
                .on('end', (data) => this.onEnd(data))
                .on('stuck', (data) => this.onStuck(data))
                .on('closed', (data) => this.onClosed(data))
                .on('error', (data) => this.onError(data));

            this.ready = true;

        } catch (error) {
            logger.error('Failed to initialize player', error);
            this.destroy();
        }
    }

    async play() {
        if (!this.exists || !this.queue.length) return this.destroy();
        
        // Wait for player to be ready
        if (!this.player) {
            // Player not initialized yet, wait a bit
            await new Promise(resolve => setTimeout(resolve, 100));
            if (!this.player) {
                logger.error('Player not ready after waiting');
                return this.destroy();
            }
        }
        
        this.current = this.queue.shift();
        
        try {
          console.log('[Dispatcher] Attempting to play track:', this.current.info.title);
          console.log('[Dispatcher] Track encoded:', this.current.track ? 'Yes' : 'No');
          console.log('[Dispatcher] Track length:', this.current.track?.length || 'N/A');
          console.log('[Dispatcher] Player state before play:', {
              playing: this.player.playing,
              paused: this.player.paused,
              track: this.player.track
          });
          
          const result = await this.player.playTrack({ track: this.current.track });
          console.log('[Dispatcher] playTrack result:', result);
          
          await this.player.setGlobalVolume(80);
          console.log('[Dispatcher] Volume set to 80');
          
          console.log('[Dispatcher] Player state after play:', {
              playing: this.player.playing,
              paused: this.player.paused,
              track: this.player.track
          });
        } catch (error) {
            logger.error('Failed to play track', error);
            this.queue.unshift(this.current);
            this.destroy();
        }
    }

    onStart() {
        console.log('[Dispatcher] onStart event fired for:', this.current.info.title);
        console.log('[Dispatcher] Player is now playing:', this.player.playing);
        
        const embed = this.client.embed()
            .setTitle('Now Playing')
            .setDescription(`[${this.current.info.title}](${this.current.info.uri})`)
            .setThumbnail(this.current.info.artworkUrl || null)
            .addFields(
                { name: 'Duration', value: this.formatTime(this.current.info.length), inline: true },
                { name: 'Requested by', value: `<@${this.current.requester.id}>`, inline: true }
            )
            .setColor(this.client.color.main);
            
        this.channel.send({ embeds: [embed] }).catch(() => null);
    }

    onEnd(data) {
        if (data.reason === 'replaced') return;
        
        if (this.loop === 'track') {
            this.queue.unshift(this.current);
        } else if (this.loop === 'queue') {
            this.queue.push(this.current);
        } else {
            this.history.push(this.current);
        }

        if (this.queue.length) {
            this.play();
        } else {
            this.destroy();
        }
    }

    onStuck(data) {
        logger.warn(`Track stuck in guild ${this.guild.id}`, data);
        if (this.player) {
            this.player.stopTrack(); // Force skip
        } else {
            this.destroy();
        }
    }

    onClosed(data) {
       // logger.debug(`Player closed in guild ${this.guild.id}`, data);
        this.destroy();
    }

    onError(error) {
        logger.error(`Player error in guild ${this.guild.id}`, error);
        this.destroy();
    }

    destroy() {
        this.exists = false;
        
        // Properly disconnect the Shoukaku player
        if (this.player) {
            try {
                this.player.connection?.disconnect();
                // Also destroy the player on Shoukaku side
                if (this.client.music.players && this.client.music.players.get(this.guild.id)) {
                    this.client.music.players.get(this.guild.id).connection.disconnect();
                }
            } catch (e) {
                logger.error('Error disconnecting player:', e.message);
            }
        }
        
        this.client.music.queues.delete(this.guild.id);
        
        const embed = this.client.embed()
            .setDescription('Queue finished or player stopped. Disconnecting.')
            .setColor(this.client.color.red);
            
        this.channel.send({ embeds: [embed] }).catch(() => null);
    }

    formatTime(ms) {
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    }
}
