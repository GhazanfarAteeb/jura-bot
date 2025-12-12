class Song {
    constructor(track, user) {
        if (!track) throw new Error('Track is not provided');
        this.encoded = track.encoded;
        this.info = {
            ...track.info,
            requester: user,
        };
    }
}

class Dispatcher {
    constructor(options) {
        this.history = [];
        this.client = options.client;
        this.guildId = options.guildId;
        this.channelId = options.channelId;
        this.player = options.player;
        this.queue = [];
        this.stopped = false;
        this.previous = null;
        this.current = null;
        this.loop = 'off';
        this.repeat = 0;
        this.node = options.node;
        this.shuffle = false;
        this.paused = false;
        this.filters = [];
        this.autoplay = false;
        this.nowPlayingMessage = null;
        this.player
            .on('start', () => {
                console.log('🎵 Player event: START - Track started playing');
                this.client.shoukaku.emit('trackStart', this.player, this.current, this);
            })
            .on('end', () => {
                console.log('⏹️ Player event: END - Track ended');
                if (!this.queue.length) this.client.shoukaku.emit('queueEnd', this.player, this.current, this);
                this.client.shoukaku.emit('trackEnd', this.player, this.current, this);
            })
            .on('stuck', () => {
                console.log('⚠️ Player event: STUCK - Track is stuck');
                this.client.shoukaku.emit('trackStuck', this.player, this.current);
            })
            .on('closed', (...arr) => {
                console.log('🔒 Player event: CLOSED - Connection closed', arr);
                this.client.shoukaku.emit('socketClosed', this.player, ...arr);
            });
    }

    get exists() {
        return this.client.queue.has(this.guildId);
    }

    get volume() {
        return this.player.volume;
    }

    // async play() {
    //     console.log('🎵 Dispatcher.play() called');
    //     console.log('   - Exists:', this.exists);
    //     console.log('   - Queue length:', this.queue.length);
    //     console.log('   - Current track:', this.current ? this.current.info.title : 'none');
        
    //     if (!this.exists || (!this.queue.length && !this.current)) {
    //         console.log('❌ Cannot play: no queue or dispatcher does not exist');
    //         return;
    //     }
    //     this.current = this.queue.length !== 0 ? this.queue.shift() : this.queue[0];
    //     if (!this.current) {
    //         console.log('❌ No current track after shift');
    //         return;
    //     }
        
    //     console.log('▶️ Playing track:', this.current.info.title, 'by', this.current.info.author);
        
    //     try {
    //         // Shoukaku v4 API: playTrack requires { track: { encoded: ... } }
    //         await this.player.playTrack({ track: { encoded: this.current?.encoded } });
    //         console.log('✅ playTrack() successful');
    //         if (this.current) {
    //             this.history.push(this.current);
    //             if (this.history.length > 100) {
    //                 this.history.shift();
    //             }
    //         }
    //     } catch (error) {
    //         console.error('❌ Failed to play track:', error);
    //         // Try to recover by skipping to next track
    //         if (this.queue.length > 0) {
    //             await this.play();
    //         } else {
    //             this.destroy();
    //         }
    //     }
  // }
  
  async play() {
        if (!this.exists || (!this.queue.length && !this.current)) {
            return;
        }
        this.current = this.queue.length !== 0 ? this.queue.shift() : this.queue[0];
        if (!this.current) return;
        this.player.playTrack({ track: this.current?.encoded });
        if (this.current) {
            this.history.push(this.current);
            if (this.history.length > 100) {
                this.history.shift();
            }
        }
    }

    pause() {
        if (!this.player) return;
        try {
            if (!this.paused) {
                this.player.setPaused(true);
                this.paused = true;
            } else {
                this.player.setPaused(false);
                this.paused = false;
            }
        } catch (error) {
            console.error('❌ Failed to pause/resume:', error);
        }
    }

    remove(index) {
        if (!this.player) return;
        if (index > this.queue.length) return;
        this.queue.splice(index, 1);
    }

    previousTrack() {
        if (!this.player) return;
        if (!this.previous) return;
        this.queue.unshift(this.previous);
        this.player.stopTrack();
    }

    destroy() {
        this.queue.length = 0;
        this.history = [];
        this.client.shoukaku.leaveVoiceChannel(this.guildId);
        this.client.queue.delete(this.guildId);
        if (this.stopped) return;
        this.client.shoukaku.emit('playerDestroy', this.player);
    }

    setShuffle(shuffle) {
        if (!this.player) return;
        this.shuffle = shuffle;
        if (shuffle) {
            const current = this.queue.shift();
            this.queue = this.queue.sort(() => Math.random() - 0.5);
            this.queue.unshift(current);
        } else {
            const current = this.queue.shift();
            this.queue = this.queue.sort((a, b) => a - b);
            this.queue.unshift(current);
        }
    }

    async skip(skipto = 1) {
        if (!this.player) return;
        if (skipto > 1) {
            if (skipto > this.queue.length) {
                this.queue.length = 0;
            } else {
                this.queue.splice(0, skipto - 1);
            }
        }
        this.repeat = this.repeat == 1 ? 0 : this.repeat;
        this.player.stopTrack();
    }

    seek(time) {
        if (!this.player) return;
        this.player.seekTo(time);
    }

    stop() {
        if (!this.player) return;
        this.queue.length = 0;
        this.history = [];
        this.loop = 'off';
        this.autoplay = false;
        this.repeat = 0;
        this.stopped = true;
        this.player.stopTrack();
    }

    setLoop(loop) {
        this.loop = loop;
    }

    buildTrack(track, user) {
        return new Song(track, user);
    }

    async isPlaying() {
        console.log('🔍 isPlaying() called');
        console.log('   - Queue length:', this.queue.length);
        console.log('   - Current:', this.current ? this.current.info.title : 'none');
        console.log('   - Player paused:', this.paused);
        
        if (this.queue.length && !this.current) {
            console.log('✅ Starting playback...');
            await this.play();
        } else {
            console.log('⏸️ Not starting playback (current exists or queue empty)');
        }
    }

    async Autoplay(song) {
        const resolve = await this.node.rest.resolve(`${this.client.config.searchEngine}:${song.info.author}`);
        if (!resolve || !resolve?.data || !Array.isArray(resolve.data)) return this.destroy();
        const metadata = resolve.data;
        let choosed = null;
        const maxAttempts = 10; // Maximum number of attempts to find a unique song
        let attempts = 0;
        while (attempts < maxAttempts) {
            const potentialChoice = this.buildTrack(metadata[Math.floor(Math.random() * metadata.length)], this.client.user);
            if (!this.queue.some(s => s.encoded === potentialChoice.encoded) &&
                !this.history.some(s => s.encoded === potentialChoice.encoded)) {
                choosed = potentialChoice;
                break;
            }
            attempts++;
        }
        if (choosed) {
            this.queue.push(choosed);
            return await this.isPlaying();
        }
        return this.destroy();
    }

    async setAutoplay(autoplay) {
        this.autoplay = autoplay;
        if (autoplay) {
            this.Autoplay(this.current ? this.current : this.queue[0]);
        }
    }
}

export default Dispatcher;
