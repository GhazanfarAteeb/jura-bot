import { shoukaku, players } from '../../utils/shoukaku.js';
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
            
            // Determine search type based on URL
            let searchQuery = query;
            const isURL = query.includes('http://') || query.includes('https://');
            
            // For Spotify URLs, use direct resolution
            if (isURL && query.includes('spotify.com')) {
                searchQuery = query; // Lavalink will handle Spotify URLs directly
            }
            // For Apple Music URLs
            else if (isURL && query.includes('music.apple.com')) {
                searchQuery = query; // Lavalink will handle Apple Music URLs directly
            }
            // For YouTube URLs
            else if (isURL && (query.includes('youtube.com') || query.includes('youtu.be'))) {
                searchQuery = query; // Direct YouTube URL
            }
            // For search queries, use YouTube search
            else {
                searchQuery = `ytsearch:${query}`;
            }
            
            console.log(`🔍 Searching Lavalink: ${searchQuery}`);
            
            // Use Shoukaku's search method - correct API for v4
            const result = await node.rest.resolve(searchQuery);
            
            console.log(`📊 Raw Lavalink Response:`, JSON.stringify(result, null, 2));
            
            // Shoukaku v4 returns: { loadType, data }
            // loadType can be: 'track', 'search', 'playlist', 'empty', 'error'
            
            let track;
            
            switch (result?.loadType) {
                case 'track':
                    // Direct track (Spotify/Apple Music URL)
                    track = result.data;
                    console.log(`✅ Track loaded: ${track?.info?.title}`);
                    break;
                    
                case 'search':
                    // Search results array
                    if (!result.data || result.data.length === 0) {
                        console.log(`❌ Search returned no results`);
                        return message.reply({
                            embeds: [await errorEmbed(guildId, 'No Results', `No results found for: **${query}**`)]
                        });
                    }
                    track = result.data[0];
                    console.log(`✅ Search result: ${track?.info?.title}`);
                    break;
                    
                case 'playlist':
                    // Playlist
                    if (!result.data?.tracks || result.data.tracks.length === 0) {
                        return message.reply({
                            embeds: [await errorEmbed(guildId, 'Empty Playlist', `The playlist has no tracks.`)]
                        });
                    }
                    track = result.data.tracks[0];
                    console.log(`✅ Playlist track: ${track?.info?.title}`);
                    break;
                    
                case 'empty':
                    console.log(`❌ Lavalink returned empty`);
                    return message.reply({
                        embeds: [await errorEmbed(guildId, 'No Results', `No results found for: **${query}**`)]
                    });
                    
                case 'error':
                    console.log(`❌ Lavalink error:`, result.data);
                    return message.reply({
                        embeds: [await errorEmbed(guildId, 'Search Error', `Failed to search: ${result.data?.message || 'Unknown error'}`)]
                    });
                    
                default:
                    console.log(`❌ Unknown loadType: ${result?.loadType}`);
                    return message.reply({
                        embeds: [await errorEmbed(guildId, 'Unknown Error', `Unexpected response from Lavalink`)]
                    });
            }
            
            // Final validation
            if (!track || !track.encoded) {
                console.log(`❌ Invalid track object:`, track);
                return message.reply({
                    embeds: [await errorEmbed(guildId, 'Invalid Track', `Could not load track information.`)]
                });
            }
            
            console.log(`🎵 Ready to play: ${track.info.title} by ${track.info.author}`);
            
            // Get or create player
            let player = players.get(guildId);
            
            if (!player) {
                // Create new player
                player = await node.joinChannel({
                    guildId: guildId,
                    channelId: channel.id,
                    shardId: 0
                });
                
                // Store player
                players.set(guildId, {
                    player: player,
                    queue: [],
                    nowPlaying: null,
                    textChannel: message.channel.id,
                    voiceChannel: channel.id
                });
                
                // Setup player event handlers
                player.on('start', () => {
                    const playerData = players.get(guildId);
                    if (playerData && playerData.nowPlaying) {
                        const track = playerData.nowPlaying;
                        message.channel.send({
                            embeds: [successEmbed(guildId, '🎵 Now Playing', `**[${track.info.title}](${track.info.uri})**\nBy: ${track.info.author}\nDuration: ${formatDuration(track.info.length)}`)]
                        });
                    }
                });
                
                player.on('end', async () => {
                    const playerData = players.get(guildId);
                    if (playerData && playerData.queue.length > 0) {
                        // Play next track in queue
                        const nextTrack = playerData.queue.shift();
                        playerData.nowPlaying = nextTrack;
                        await player.playTrack({ track: nextTrack.encoded });
                    } else {
                        // Queue is empty, disconnect
                        playerData.nowPlaying = null;
                    }
                });
                
                player.on('closed', (reason) => {
                    console.log(`Player closed: ${reason}`);
                    players.delete(guildId);
                });
                
                player.on('exception', (error) => {
                    console.error(`Player exception:`, error);
                    message.channel.send({
                        embeds: [errorEmbed(guildId, 'Playback Error', 'An error occurred during playback.')]
                    });
                });
            }
            
            const playerData = players.get(guildId);
            
            // If nothing is currently playing, play immediately
            if (!playerData.nowPlaying) {
                playerData.nowPlaying = track;
                await playerData.player.playTrack({ track: track.encoded });
                
                return message.reply({
                    embeds: [await successEmbed(guildId, '🎵 Now Playing', `**[${track.info.title}](${track.info.uri})**\nBy: ${track.info.author}\nDuration: ${formatDuration(track.info.length)}\n\n🔊 Started playing in ${channel.name}`)]
                });
            } else {
                // Add to queue
                playerData.queue.push(track);
                
                return message.reply({
                    embeds: [await successEmbed(guildId, '📝 Added to Queue', `**[${track.info.title}](${track.info.uri})**\nBy: ${track.info.author}\nDuration: ${formatDuration(track.info.length)}\n\nPosition in queue: ${playerData.queue.length}`)]
                });
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
