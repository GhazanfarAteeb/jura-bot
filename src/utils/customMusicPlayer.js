import {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    VoiceConnectionStatus,
    entersState,
    getVoiceConnection,
    StreamType
} from '@discordjs/voice';
import { createReadStream } from 'fs';
import play from 'play-dl';
import ytdl from 'youtube-dl-exec';

// Store active players and queues per guild
const guildQueues = new Map();

class MusicQueue {
    constructor(guildId) {
        this.guildId = guildId;
        this.songs = [];
        this.currentSong = null;
        this.player = createAudioPlayer();
        this.connection = null;
        this.isPlaying = false;
        
        // Player event handlers
        this.player.on(AudioPlayerStatus.Playing, () => {
            console.log('▶️ Audio player started playing');
            this.isPlaying = true;
        });
        
        this.player.on(AudioPlayerStatus.Idle, () => {
            console.log('⏸️ Audio player is idle');
            this.isPlaying = false;
            this.playNext();
        });
        
        this.player.on('error', (error) => {
            console.error('❌ Audio player error:', error);
            this.isPlaying = false;
            this.playNext();
        });
    }
    
    addSong(song) {
        this.songs.push(song);
        console.log(`➕ Added to queue: ${song.title}`);
    }
    
    async playNext() {
        if (this.songs.length === 0) {
            console.log('✅ Queue finished');
            this.currentSong = null;
            return;
        }
        
        this.currentSong = this.songs.shift();
        await this.playSong(this.currentSong);
    }
    
    async playSong(song) {
        try {
            console.log(`🎵 Playing: ${song.title} by ${song.author}`);
            
            // Get stream URL based on source
            let streamUrl;
            if (song.url.includes('spotify.com')) {
                streamUrl = await this.getSpotifyStream(song);
            } else if (song.url.includes('youtube.com') || song.url.includes('youtu.be')) {
                streamUrl = await this.getYouTubeStream(song.url);
            } else {
                streamUrl = await this.getGenericStream(song.url);
            }
            
            if (!streamUrl) {
                throw new Error('Failed to get audio stream');
            }
            
            console.log('🎵 Creating audio resource from stream URL');
            
            // Create audio resource from the stream URL
            const resource = createAudioResource(streamUrl, {
                inlineVolume: true,
                inputType: StreamType.Arbitrary
            });
            
            // Set volume
            resource.volume.setVolume(0.8);
            
            // Play the resource
            this.player.play(resource);
            
            // Subscribe connection to player
            if (this.connection) {
                this.connection.subscribe(this.player);
            }
            
            console.log('✅ Audio resource created and playing');
            
        } catch (error) {
            console.error('❌ Error playing song:', error);
            await this.playNext();
        }
    }
    
    async getSpotifyStream(song) {
        try {
            // Search YouTube for Spotify track
            const searchQuery = `${song.title} ${song.author}`;
            console.log(`🔍 Searching YouTube for: ${searchQuery}`);
            
            const searchResults = await play.search(searchQuery, { limit: 1, source: { youtube: 'video' } });
            if (!searchResults || searchResults.length === 0) {
                console.log('⚠️ No YouTube results, trying alternative search...');
                // Try without artist name
                const altSearch = await play.search(song.title, { limit: 1, source: { youtube: 'video' } });
                if (!altSearch || altSearch.length === 0) {
                    throw new Error('No YouTube results found');
                }
                const videoUrl = altSearch[0].url;
                console.log(`✅ Found YouTube video (alternative): ${videoUrl}`);
                return await this.getYouTubeStream(videoUrl);
            }
            
            const videoUrl = searchResults[0].url;
            console.log(`✅ Found YouTube video: ${videoUrl}`);
            
            return await this.getYouTubeStream(videoUrl);
        } catch (error) {
            console.error('❌ Error getting Spotify stream:', error);
            return null;
        }
    }
    
    async getYouTubeStream(url) {
        try {
            console.log('🔗 Getting stream for URL:', url);
            
            // Use youtube-dl-exec for more reliable streaming
            const info = await ytdl(url, {
                dumpSingleJson: true,
                noCheckCertificates: true,
                noWarnings: true,
                preferFreeFormats: true,
                addHeader: ['referer:youtube.com', 'user-agent:googlebot']
            });
            
            // Get the best audio format URL
            const audioFormat = info.formats.find(f => 
                f.acodec && f.acodec !== 'none' && !f.vcodec
            ) || info.formats.find(f => f.acodec && f.acodec !== 'none');
            
            if (!audioFormat || !audioFormat.url) {
                throw new Error('No audio format found');
            }
            
            console.log('✅ Got audio stream URL');
            return audioFormat.url;
            
        } catch (error) {
            console.error('❌ Error getting YouTube stream:', error);
            return null;
        }
    }
    
    async getGenericStream(url) {
        try {
            console.log('🔗 Getting generic stream for URL:', url);
            return await this.getYouTubeStream(url);
        } catch (error) {
            console.error('❌ Error getting generic stream:', error);
            return null;
        }
    }
    
    stop() {
        this.songs = [];
        this.currentSong = null;
        this.player.stop();
        console.log('⏹️ Stopped playback');
    }
    
    pause() {
        this.player.pause();
        console.log('⏸️ Paused playback');
    }
    
    resume() {
        this.player.unpause();
        console.log('▶️ Resumed playback');
    }
    
    skip() {
        this.player.stop();
        console.log('⏭️ Skipped song');
    }
    
    async connect(channel) {
        try {
            console.log(`🔌 Attempting to connect to voice channel: ${channel.name} (${channel.id})`);
            console.log(`   Guild: ${channel.guild.name} (${channel.guild.id})`);
            
            this.connection = joinVoiceChannel({
                channelId: channel.id,
                guildId: channel.guild.id,
                adapterCreator: channel.guild.voiceAdapterCreator,
                selfDeaf: true,
                selfMute: false
            });
            
            console.log('🔌 Voice connection created');
            
            // Subscribe player immediately
            this.connection.subscribe(this.player);
            console.log('✅ Player subscribed to connection');
            
            // Handle connection state changes
            this.connection.on(VoiceConnectionStatus.Ready, () => {
                console.log('✅ Voice connection is ready');
            });
            
            this.connection.on(VoiceConnectionStatus.Connecting, () => {
                console.log('🔄 Voice connection is connecting...');
            });
            
            this.connection.on(VoiceConnectionStatus.Signalling, () => {
                console.log('📡 Voice connection is signalling...');
            });
            
            this.connection.on(VoiceConnectionStatus.Disconnected, async () => {
                console.log('⚠️ Voice connection disconnected');
                try {
                    await Promise.race([
                        entersState(this.connection, VoiceConnectionStatus.Signalling, 5_000),
                        entersState(this.connection, VoiceConnectionStatus.Connecting, 5_000),
                    ]);
                    console.log('🔄 Attempting to reconnect...');
                } catch (error) {
                    // Real disconnect
                    console.log('❌ Failed to reconnect, destroying connection');
                    this.connection.destroy();
                }
            });
            
            this.connection.on('error', (error) => {
                console.error('❌ Voice connection error:', error);
            });
            
            // Don't wait for Ready state - connection will transition automatically
            // Just give it a moment to establish
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            console.log(`✅ Voice connection established for: ${channel.name}`);
            return this.connection;
            
        } catch (error) {
            console.error('❌ Error connecting to voice channel:', error);
            console.error('   Error stack:', error.stack);
            
            if (this.connection) {
                console.log('🧹 Cleaning up failed connection...');
                this.connection.destroy();
                this.connection = null;
            }
            
            throw error;
        }
    }

    
    disconnect() {
        if (this.connection) {
            this.connection.destroy();
            this.connection = null;
            console.log('👋 Left voice channel');
        }
    }
}

// Get or create queue for guild
export function getQueue(guildId) {
    if (!guildQueues.has(guildId)) {
        guildQueues.set(guildId, new MusicQueue(guildId));
    }
    return guildQueues.get(guildId);
}

// Delete queue for guild
export function deleteQueue(guildId) {
    const queue = guildQueues.get(guildId);
    if (queue) {
        queue.disconnect();
        queue.stop();
    }
    guildQueues.delete(guildId);
}

// Check if queue exists
export function hasQueue(guildId) {
    return guildQueues.has(guildId);
}

// Helper functions for commands
export function checkVoiceChannel(message) {
    if (!message.member.voice.channel) {
        return {
            error: true,
            message: '❌ You must be in a voice channel to use music commands!'
        };
    }
    return { error: false };
}

export function checkBotInVoice(message) {
    const botVoiceChannel = message.guild.members.me?.voice?.channel;
    if (!botVoiceChannel) {
        return {
            error: true,
            message: '❌ The bot is not in a voice channel!'
        };
    }
    return { error: false, channel: botVoiceChannel };
}

export function checkSameVoiceChannel(message) {
    const userChannel = message.member.voice.channel;
    const botChannel = message.guild.members.me?.voice?.channel;
    
    if (!botChannel) {
        return { error: false };
    }
    
    if (userChannel.id !== botChannel.id) {
        return {
            error: true,
            message: '❌ You must be in the same voice channel as the bot!'
        };
    }
    
    return { error: false };
}
