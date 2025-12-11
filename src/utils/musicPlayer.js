import { Player, QueryType } from 'discord-player';
import client from '../index.js';
import { playerConfig } from '../config/playerConfig.js';

// Initialize Discord Player with optimized configuration
export const player = new Player(client, playerConfig);

// Load extractors - we handle Spotify manually with play-dl in the play command
try {
    console.log('🔧 Loading extractors...');
    
    // Import the extractor package
    const extractorPkg = await import('@discord-player/extractor');
    
    // Register YouTube extractor
    if (extractorPkg.YouTubeExtractor) {
        await player.extractors.register(extractorPkg.YouTubeExtractor, {});
        console.log('✅ YouTube extractor loaded');
    }
    
    // Register SoundCloud extractor
    if (extractorPkg.SoundCloudExtractor) {
        await player.extractors.register(extractorPkg.SoundCloudExtractor, {});
        console.log('✅ SoundCloud extractor loaded');
    }
    
    console.log(`📊 Total registered extractors: ${player.extractors.size}`);
    
} catch (extractorError) {
    console.error('❌ Failed to load extractors:', extractorError);
    console.error('Error details:', extractorError.message, extractorError.stack);
    
    // Fallback: try to use DefaultExtractors if individual loading fails
    console.log('🔄 Attempting fallback to DefaultExtractors...');
    try {
        const { DefaultExtractors } = await import('@discord-player/extractor');
        await player.extractors.loadDefault(DefaultExtractors);
        console.log('✅ DefaultExtractors loaded as fallback');
    } catch (fallbackError) {
        console.error('❌ Fallback also failed:', fallbackError.message);
        console.error('Music functionality may be severely limited');
    }
}

// Configure hooks for better Spotify → YouTube matching (like Jockie Music)
player.events.on('debug', async (queue, message) => {
    // Only log important debug messages
    if (message.includes('Stream extraction') || message.includes('Failed')) {
        console.log(`[DEBUG ${queue.guild.name}]: ${message}`);
    }
});

// Hook to improve YouTube search when Spotify track is found
player.events.on('beforeCreateStream', async (queue, track, source) => {
    // For Spotify tracks, improve the search query
    if (track.url?.includes('spotify.com')) {
        console.log(`[BRIDGE] Improving search for Spotify track: ${track.title} by ${track.author}`);
        
        // Clean up the search query to match Jockie's approach
        const cleanTitle = track.title
            .replace(/\s*\(.*?\)\s*/g, '') // Remove (feat. X) etc
            .replace(/\s*\[.*?\]\s*/g, '') // Remove [Official Audio] etc
            .trim();
        
        const cleanArtist = track.author
            .split(',')[0] // Take first artist only
            .split('&')[0]
            .trim();
        
        // Construct better search query
        const improvedQuery = `${cleanArtist} ${cleanTitle} topic`;
        console.log(`[BRIDGE] Improved query: "${improvedQuery}"`);
    }
});

// Player events
player.events.on('playerStart', (queue, track) => {
    console.log(`▶️ Started playing: ${track.title} in ${queue.guild.name}`);
    queue.metadata.channel.send({
        content: `🎶 Now playing: **${track.title}** by **${track.author}**`
    });
});

player.events.on('audioTrackAdd', (queue, track) => {
    console.log(`➕ Track added to queue: ${track.title}`);
    if (queue.tracks.toArray().length > 1) {
        queue.metadata.channel.send({
            content: `✅ Added to queue: **${track.title}** by **${track.author}**`
        });
    }
});

player.events.on('audioTracksAdd', (queue, tracks) => {
    console.log(`➕ ${tracks.length} tracks added to queue`);
    queue.metadata.channel.send({
        content: `✅ Added **${tracks.length}** tracks to the queue!`
    });
});

player.events.on('playerError', (queue, error) => {
    console.error(`❌ Player error in ${queue.guild.name}:`, error);
    console.error('Error details:', error.message, error.stack);
    
    // Try to play next track if available
    if (queue.tracks.toArray().length > 0) {
        console.log('⏭️ Attempting to play next track after error...');
        queue.node.skip();
    } else {
        queue.metadata.channel.send('❌ An error occurred while playing the track.');
    }
});

player.events.on('error', (queue, error) => {
    console.error(`❌ General error in ${queue.guild.name}:`, error);
    console.error('Error details:', error.message);
    
    // Try to reconnect if connection was lost
    if (error.message && error.message.includes('socket')) {
        console.log('🔄 Attempting to reconnect...');
        setTimeout(() => {
            if (queue.connection && !queue.connection.state) {
                queue.connect(queue.metadata.channel.guild.members.me.voice.channel);
            }
        }, 1000);
    }
});

player.events.on('connectionError', (queue, error) => {
    console.error(`❌ Connection error in ${queue.guild.name}:`, error);
    queue.metadata.channel.send('❌ Voice connection error. Retrying...');
    
    // Try to reconnect after 2 seconds
    setTimeout(() => {
        try {
            const voiceChannel = queue.metadata.channel.guild.members.me.voice.channel;
            if (voiceChannel) {
                queue.connect(voiceChannel);
            }
        } catch (err) {
            console.error('❌ Failed to reconnect:', err);
        }
    }, 2000);
});

player.events.on('emptyQueue', (queue) => {
    console.log(`✅ Queue finished in ${queue.guild.name}`);
    queue.metadata.channel.send('✅ Queue finished! Add more songs with `R!play <song>`');
});

player.events.on('emptyChannel', (queue) => {
    console.log(`👋 Leaving ${queue.guild.name} due to inactivity`);
    queue.metadata.channel.send('👋 Leaving voice channel due to inactivity.');
});

player.events.on('disconnect', (queue) => {
    console.log(`🔌 Disconnected from ${queue.guild.name}`);
});

player.events.on('audioTrackRemove', (queue, track) => {
    console.log(`➖ Track removed: ${track.title}`);
});

player.events.on('playerSkip', (queue, track) => {
    console.log(`⏭️ Skipped: ${track.title}`);
});

player.events.on('debug', (queue, message) => {
    console.log(`[DEBUG ${queue.guild.name}]:`, message);
});

// Helper function to check if user is in voice channel
export function checkVoiceChannel(message) {
    if (!message.member.voice.channel) {
        return {
            error: true,
            message: '❌ You must be in a voice channel to use music commands!'
        };
    }
    return { error: false };
}

// Helper function to check if bot is in voice channel
export function checkBotInVoice(message) {
    const queue = player.nodes.get(message.guild.id);
    if (!queue || !queue.connection) {
        return {
            error: true,
            message: '❌ I\'m not currently playing anything!'
        };
    }
    return { error: false, queue };
}

// Helper function to check if user is in same voice channel as bot
export function checkSameVoiceChannel(message) {
    const voiceCheck = checkVoiceChannel(message);
    if (voiceCheck.error) return voiceCheck;
    
    const botCheck = checkBotInVoice(message);
    if (botCheck.error) return botCheck;
    
    // Get the voice channel the bot is connected to
    const botVoiceChannel = message.guild.members.me?.voice?.channel;
    if (!botVoiceChannel) {
        return {
            error: true,
            message: '❌ I\'m not in a voice channel!'
        };
    }
    
    if (message.member.voice.channel.id !== botVoiceChannel.id) {
        return {
            error: true,
            message: '❌ You must be in the same voice channel as me!'
        };
    }
    
    return { error: false, queue: botCheck.queue };
}

// Format duration from milliseconds
export function formatDuration(ms) {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor(ms / (1000 * 60 * 60));
    
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Create progress bar
export function createProgressBar(current, total, length = 20) {
    const progress = Math.round((current / total) * length);
    const emptyProgress = length - progress;
    
    const progressText = '▓'.repeat(progress);
    const emptyProgressText = '░'.repeat(emptyProgress);
    
    return progressText + emptyProgressText;
}
