import { player, checkVoiceChannel } from '../../utils/musicPlayer.js';
import { QueryType } from 'discord-player';
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
        
        // Join all args to support "song name artist name"
        const query = args.join(' ');
        const channel = message.member.voice.channel;
        
        try {
            await message.channel.sendTyping();
            
            // Determine search engine based on query type
            let searchEngine = QueryType.AUTO;
            let searchQuery = query;
            
            // Check if it's a URL
            if (query.includes('http://') || query.includes('https://')) {
                // Direct URL - use AUTO to detect platform
                searchEngine = QueryType.AUTO;
            } else {
                // Plain text search - prioritize YouTube for best results
                searchEngine = QueryType.YOUTUBE_SEARCH;
                
                // If query looks like "artist - song", format it better
                if (query.includes(' - ')) {
                    searchQuery = query; // Keep as is
                } else {
                    // Add quotes for exact match on YouTube
                    searchQuery = query;
                }
            }
            
            console.log(`🔍 Searching: "${searchQuery}" using ${searchEngine}`);
            
            // Search for the track
            const searchResult = await player.search(searchQuery, {
                requestedBy: message.author,
                searchEngine: searchEngine
            });
            
            if (!searchResult || !searchResult.tracks.length) {
                return message.reply({
                    embeds: [await errorEmbed(guildId, 'No results found!', `Could not find: **${query}**\n\nTry:\n• Being more specific (artist name + song name)\n• Using a direct URL (Spotify, YouTube, Apple Music)`)]
                });
            }
            
            console.log(`✅ Found: ${searchResult.tracks[0].title} by ${searchResult.tracks[0].author}`);
            
            // Create or get queue
            const queue = player.nodes.create(message.guild, {
                metadata: {
                    channel: message.channel,
                    client: message.guild.members.me,
                    requestedBy: message.author
                },
                selfDeaf: true,
                volume: 80,
                leaveOnEmpty: true,
                leaveOnEmptyCooldown: 300000, // 5 minutes
                leaveOnEnd: false,
                leaveOnEndCooldown: 300000
            });
            
            // Connect to voice channel if not connected
            let justConnected = false;
            try {
                if (!queue.connection) {
                    await queue.connect(channel, {
                        deaf: true
                    });
                    justConnected = true;
                    console.log(`✅ Connected to voice channel: ${channel.name} in guild: ${message.guild.name}`);
                    await message.channel.send(`🎵 Joined **${channel.name}**! Preparing to play...`);
                }
            } catch (error) {
                console.error('Voice connection error:', error);
                player.nodes.delete(message.guild.id);
                return message.reply({
                    embeds: [await errorEmbed(guildId, 'Voice Connection Failed', `Could not join your voice channel!\n\n**Error:** ${error.message}\n\nMake sure I have permission to **Connect** and **Speak** in the voice channel.`)]
                });
            }
            
            // Add track(s) to queue
            if (searchResult.playlist) {
                queue.addTrack(searchResult.tracks);
                const embed = await successEmbed(
                    guildId,
                    '📂 Playlist Added!',
                    `**${searchResult.playlist.title}**\n\n${searchResult.tracks.length} tracks added to queue`
                );
                embed.setThumbnail(searchResult.playlist.thumbnail);
                await message.reply({ embeds: [embed] });
            } else {
                const track = searchResult.tracks[0];
                queue.addTrack(track);
                
                if (queue.tracks.size > 1) {
                    const embed = await successEmbed(
                        guildId,
                        '✅ Added to Queue',
                        `**${track.title}**\nby ${track.author}`
                    );
                    embed.addFields(
                        { name: 'Duration', value: track.duration, inline: true },
                        { name: 'Position in Queue', value: `${queue.tracks.size}`, inline: true }
                    );
                    if (track.thumbnail) embed.setThumbnail(track.thumbnail);
                    await message.reply({ embeds: [embed] });
                }
            }
            
            // Start playing if not already
            if (!queue.node.isPlaying()) {
                try {
                    // Wait 2 seconds after joining before playing
                    if (justConnected) {
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                    
                    console.log(`🎵 Starting playback in ${message.guild.name}...`);
                    console.log(`   Track: ${queue.tracks.toArray()[0]?.title || 'Unknown'}`);
                    console.log(`   Volume: ${queue.node.volume}%`);
                    
                    // Play with retry mechanism
                    let playAttempts = 0;
                    let playSuccess = false;
                    
                    while (playAttempts < 3 && !playSuccess) {
                        try {
                            await queue.node.play();
                            playSuccess = true;
                            
                            // Set volume explicitly
                            queue.node.setVolume(80);
                            
                            console.log(`▶️ Playback started successfully in ${message.guild.name}`);
                        } catch (attemptError) {
                            playAttempts++;
                            console.error(`❌ Play attempt ${playAttempts} failed:`, attemptError.message);
                            
                            if (playAttempts < 3) {
                                console.log(`🔄 Retrying in 1 second...`);
                                await new Promise(resolve => setTimeout(resolve, 1000));
                            } else {
                                throw attemptError;
                            }
                        }
                    }
                    
                } catch (playError) {
                    console.error('❌ Play error:', playError);
                    console.error('Play error details:', playError.message, playError.stack);
                    return message.reply({
                        embeds: [await errorEmbed(guildId, 'Playback Error', `Failed to start playback after 3 attempts: ${playError.message}`)]
                    });
                }
            }
            
        } catch (error) {
            console.error('Error playing music:', error);
            return message.reply({
                embeds: [await errorEmbed(guildId, 'An error occurred while trying to play the song!')]
            });
        }
    }
};
