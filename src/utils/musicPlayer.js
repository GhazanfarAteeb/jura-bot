import { Player, QueryType } from 'discord-player';
import client from '../index.js';

// Initialize Discord Player
export const player = new Player(client, {
    ytdlOptions: {
        quality: 'highestaudio',
        highWaterMark: 1 << 25,
        filter: 'audioonly'
    }
});

// Load extractors for Spotify, SoundCloud, YouTube
player.extractors.loadDefault().catch(console.error);

// Player events
player.events.on('playerStart', (queue, track) => {
    queue.metadata.channel.send({
        content: `🎶 Now playing: **${track.title}** by **${track.author}**`
    });
});

player.events.on('audioTrackAdd', (queue, track) => {
    if (queue.tracks.toArray().length > 1) {
        queue.metadata.channel.send({
            content: `✅ Added to queue: **${track.title}** by **${track.author}**`
        });
    }
});

player.events.on('audioTracksAdd', (queue, tracks) => {
    queue.metadata.channel.send({
        content: `✅ Added **${tracks.length}** tracks to the queue!`
    });
});

player.events.on('playerError', (queue, error) => {
    console.error(`Player error:`, error);
    queue.metadata.channel.send('❌ An error occurred while playing the track.');
});

player.events.on('error', (queue, error) => {
    console.error(`General error:`, error);
    queue.metadata.channel.send('❌ An error occurred.');
});

player.events.on('emptyQueue', (queue) => {
    queue.metadata.channel.send('✅ Queue finished!');
});

player.events.on('emptyChannel', (queue) => {
    queue.metadata.channel.send('👋 Leaving voice channel due to inactivity.');
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
    
    const botChannel = botCheck.queue.connection.channel;
    if (message.member.voice.channel.id !== botChannel.id) {
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
