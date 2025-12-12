import { shoukaku } from '../../utils/shoukaku.js';
import { checkVoiceChannel } from '../../utils/musicPlayer.js';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';

export default {
    name: 'play',
    aliases: ['p'],
    description: 'Play music from YouTube, Spotify, and Apple Music',
    usage: 'play <song name | url>',
    category: 'music',
    cooldown: 3,
    execute: async (message, args) => {
        const guildId = message.guild.id;
        
        // Check if user is in voice channel
        const voiceCheck = checkVoiceChannel(message);
        if (voiceCheck.error) {
            return message.reply({ embeds: [await errorEmbed(guildId, 'Voice Channel Error', voiceCheck.message)] });
        }
        
        if (!args.length) {
            return message.reply({
                embeds: [await errorEmbed(guildId, 'Missing Arguments', 'Please provide a song name or URL!\n\n**Usage:** `R!play <song|url>`\n\n**Examples:**\n• `R!play never gonna give you up`\n• `R!play rick astley - never gonna give you up`\n• `R!play https://youtube.com/watch?v=...`\n• `R!play https://open.spotify.com/track/...`\n• `R!play https://music.apple.com/...`\n\n**Supported Platforms:**\n✅ YouTube (search or URL)\n✅ Spotify (URL only)\n✅ Apple Music (URL only)')]
            });
        }
        
        const query = args.join(' ');
        const channel = message.member.voice.channel;
        
        try {
            await message.channel.sendTyping();
            
            // Get a Lavalink node
            const node = shoukaku.options.nodeResolver(shoukaku.nodes);
            
            if (!node) {
                return message.reply({
                    embeds: [await errorEmbed(guildId, 'Lavalink Error', 'No Lavalink nodes available. Please try again later.')]
                });
            }
            
            // Get or create dispatcher (queue system)
            let dispatcher = message.client.queue.get(guildId);
            
            if (!dispatcher) {
                dispatcher = await message.client.queue.create(
                    message.guild,
                    channel,
                    message.channel,
                    node
                );
            }
            
            // Search for the track using Queue's search method
            console.log(`🔍 Searching: ${query}`);
            const result = await message.client.queue.search(query);
            
            if (!result) {
                return message.reply({
                    embeds: [await errorEmbed(guildId, 'Search Error', 'Failed to search for the track.')]
                });
            }
            
            console.log(`📊 Search result loadType: ${result.loadType}`);
            
            // Handle different load types
            switch (result.loadType) {
                case 'track': {
                    // Single track (Spotify/Apple Music URL)
                    const track = dispatcher.buildTrack(result.data, message.author);
                    dispatcher.queue.push(track);
                    
                    await dispatcher.isPlaying();
                    
                    return message.reply({
                        embeds: [await successEmbed(
                            guildId,
                            dispatcher.queue.length === 0 ? '🎵 Now Playing' : '📝 Added to Queue',
                            `**[${track.info.title}](${track.info.uri})**\nBy: ${track.info.author}\nDuration: ${formatDuration(track.info.length)}${dispatcher.queue.length > 0 ? `\n\nPosition in queue: ${dispatcher.queue.length}` : ''}`
                        )]
                    });
                }
                
                case 'search': {
                    // Search results - take first result
                    if (!result.data || result.data.length === 0) {
                        return message.reply({
                            embeds: [await errorEmbed(guildId, 'No Results', `No results found for: **${query}**`)]
                        });
                    }
                    
                    const track = dispatcher.buildTrack(result.data[0], message.author);
                    dispatcher.queue.push(track);
                    
                    await dispatcher.isPlaying();
                    
                    return message.reply({
                        embeds: [await successEmbed(
                            guildId,
                            dispatcher.queue.length === 0 ? '🎵 Now Playing' : '📝 Added to Queue',
                            `**[${track.info.title}](${track.info.uri})**\nBy: ${track.info.author}\nDuration: ${formatDuration(track.info.length)}${dispatcher.queue.length > 0 ? `\n\nPosition in queue: ${dispatcher.queue.length}` : ''}`
                        )]
                    });
                }
                
                case 'playlist': {
                    // Playlist
                    if (!result.data?.tracks || result.data.tracks.length === 0) {
                        return message.reply({
                            embeds: [await errorEmbed(guildId, 'Empty Playlist', 'The playlist has no tracks.')]
                        });
                    }
                    
                    // Add all tracks to queue
                    const tracks = result.data.tracks.map(track => dispatcher.buildTrack(track, message.author));
                    dispatcher.queue.push(...tracks);
                    
                    await dispatcher.isPlaying();
                    
                    return message.reply({
                        embeds: [await successEmbed(
                            guildId,
                            '📝 Playlist Added',
                            `**${result.data.info?.name || 'Playlist'}**\nAdded ${tracks.length} tracks to the queue`
                        )]
                    });
                }
                
                case 'empty': {
                    return message.reply({
                        embeds: [await errorEmbed(guildId, 'No Results', `No results found for: **${query}**`)]
                    });
                }
                
                case 'error': {
                    return message.reply({
                        embeds: [await errorEmbed(guildId, 'Search Error', `Failed to search: ${result.data?.message || 'Unknown error'}`)]
                    });
                }
                
                default: {
                    return message.reply({
                        embeds: [await errorEmbed(guildId, 'Unknown Error', 'Unexpected response from Lavalink')]
                    });
                }
            }
            
        } catch (error) {
            console.error('Error in play command:', error);
            return message.reply({
                embeds: [await errorEmbed(guildId, 'Error', `Failed to play track: ${error.message}`)]
            });
        }
    }
};

// Helper function to format duration
function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
        return `${hours}:${String(minutes % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
    }
    return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}
