import {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    VoiceConnectionStatus,
    entersState,
    getVoiceConnection
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
            let stream;
            if (song.url.includes('spotify.com')) {
                stream = await this.getSpotifyStream(song);
            } else if (song.url.includes('youtube.com') || song.url.includes('youtu.be')) {
                stream = await this.getYouTubeStream(song.url);
            } else {
                stream = await this.getGenericStream(song.url);
            }
            
            if (!stream) {
                throw new Error('Failed to get audio stream');
            }
            
            // Create audio resource
            const resource = createAudioResource(stream, {
                inlineVolume: true
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
                throw new Error('No YouTube results found');
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
            const stream = await play.stream(url);
            return stream.stream;
        } catch (error) {
            console.error('❌ Error getting YouTube stream:', error);
            return null;
        }
    }
    
    async getGenericStream(url) {
        try {
            const stream = await play.stream(url);
            return stream.stream;
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
            this.connection = joinVoiceChannel({
                channelId: channel.id,
                guildId: channel.guild.id,
                adapterCreator: channel.guild.voiceAdapterCreator,
                selfDeaf: true,
                selfMute: false
            });
            
            // Handle connection state changes
            this.connection.on(VoiceConnectionStatus.Ready, () => {
                console.log('✅ Voice connection is ready');
            });
            
            this.connection.on(VoiceConnectionStatus.Disconnected, async () => {
                try {
                    await Promise.race([
                        entersState(this.connection, VoiceConnectionStatus.Signalling, 5_000),
                        entersState(this.connection, VoiceConnectionStatus.Connecting, 5_000),
                    ]);
                    // Reconnecting
                } catch (error) {
                    // Real disconnect
                    this.connection.destroy();
                    console.log('👋 Disconnected from voice channel');
                }
            });
            
            // Wait for connection to be ready
            await entersState(this.connection, VoiceConnectionStatus.Ready, 30_000);
            
            console.log(`✅ Connected to voice channel: ${channel.name}`);
            return this.connection;
            
        } catch (error) {
            console.error('❌ Error connecting to voice:', error);
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
