import { player, checkVoiceChannel } from '../../utils/musicPlayer.js';
import { QueryType } from 'discord-player';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';

export default {
    name: 'play',
    aliases: ['p'],
    description: 'Play music from YouTube, Spotify, or SoundCloud',
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
                embeds: [await errorEmbed(guildId, 'Missing Arguments', 'Please provide a song name or URL!\n\nUsage: `!play <song|url>`\n\nExamples:\n• `!play never gonna give you up`\n• `!play https://youtube.com/watch?v=...`\n• `!play https://open.spotify.com/track/...`')]
            });
        }
        
        // Join all args to support "song name artist name"
        const query = args.join(' ');
        const channel = message.member.voice.channel;
        
        try {
            await message.channel.sendTyping();
            
            // Search for the track
            const searchResult = await player.search(query, {
                requestedBy: message.author,
                searchEngine: QueryType.AUTO
            });
            
            if (!searchResult || !searchResult.tracks.length) {
                return message.reply({
                    embeds: [await errorEmbed(guildId, 'No results found!')]
                });
            }
            
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
            try {
                if (!queue.connection) {
                    await queue.connect(channel);
                }
            } catch {
                player.nodes.delete(message.guild.id);
                return message.reply({
                    embeds: [await errorEmbed(guildId, 'Could not join your voice channel!')]
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
                message.reply({ embeds: [embed] });
            } else {
                const track = searchResult.tracks[0];
                queue.addTrack(track);
                
                if (!queue.isPlaying()) {
                    // Will start playing automatically and trigger playerStart event
                } else {
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
                    message.reply({ embeds: [embed] });
                }
            }
            
            // Start playing if not already
            if (!queue.isPlaying()) {
                await queue.node.play();
            }
            
        } catch (error) {
            console.error('Error playing music:', error);
            return message.reply({
                embeds: [await errorEmbed(guildId, 'An error occurred while trying to play the song!')]
            });
        }
    }
};
