import { LoadType } from 'shoukaku';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';
import { checkVoiceChannel } from '../../utils/musicPlayer.js';

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
                embeds: [await errorEmbed(guildId, 'Missing Arguments', 'Please provide a song name or URL!\n\n**Usage:** `R!play <song|url>`\n\n**Examples:**\n• `R!play never gonna give you up`\n• `R!play https://youtube.com/watch?v=...`\n• `R!play https://open.spotify.com/track/...`')]
            });
        }

        const query = args.join(' ');
        const vc = message.member;

        try {
            await message.channel.sendTyping();

            // Get or create player
            let player = message.client.queue.get(message.guild.id);
            if (!player) {
                player = await message.client.queue.create(
                    message.guild,
                    vc.voice.channel,
                    message.channel
                );
            }

            // Search for track
            const res = await message.client.queue.search(query);
            
            if (!res) {
                return message.reply({
                    embeds: [await errorEmbed(guildId, 'Search Error', 'Failed to search for the track.')]
                });
            }

            console.log(`📊 LoadType: ${res.loadType}`);

            // Handle different load types (Wave-Music pattern)
            switch (res.loadType) {
                case LoadType.ERROR:
                    return message.reply({
                        embeds: [await errorEmbed(guildId, 'Search Error', 'There was an error while searching.')]
                    });

                case LoadType.EMPTY:
                    return message.reply({
                        embeds: [await errorEmbed(guildId, 'No Results', 'There were no results found.')]
                    });

                case LoadType.TRACK: {
                    const track = player.buildTrack(res.data, message.author);
                    
                    if (player.queue.length > 1000) {
                        return message.reply({
                            embeds: [await errorEmbed(guildId, 'Queue Full', 'The queue is too long. Max allowed is 1000 songs.')]
                        });
                    }
                    
                    player.queue.push(track);
                    await player.isPlaying();
                    
                    return message.reply({
                        embeds: [await successEmbed(
                            guildId,
                            '📝 Added to Queue',
                            `**[${res.data.info.title}](${res.data.info.uri})**\nBy: ${res.data.info.author}\nRequested by: ${message.author}`
                        )]
                    });
                }

                case LoadType.PLAYLIST: {
                    if (res.data.tracks.length > 100) {
                        return message.reply({
                            embeds: [await errorEmbed(guildId, 'Playlist Too Large', 'The playlist is too long. Max allowed is 100 songs.')]
                        });
                    }
                    
                    for (const track of res.data.tracks) {
                        if (player.queue.length > 1000) {
                            return message.reply({
                                embeds: [await errorEmbed(guildId, 'Queue Full', 'The queue is too long. Max allowed is 1000 songs.')]
                            });
                        }
                        
                        const plTrack = player.buildTrack(track, message.author);
                        player.queue.push(plTrack);
                    }
                    
                    await player.isPlaying();
                    
                    return message.reply({
                        embeds: [await successEmbed(
                            guildId,
                            '📝 Playlist Added',
                            `Added ${res.data.tracks.length} songs to the queue.`
                        )]
                    });
                }

                case LoadType.SEARCH: {
                    const first = res.data[0];
                    const track = player.buildTrack(first, message.author);
                    
                    if (player.queue.length > 1000) {
                        return message.reply({
                            embeds: [await errorEmbed(guildId, 'Queue Full', 'The queue is too long. Max allowed is 1000 songs.')]
                        });
                    }
                    
                    player.queue.push(track);
                    await player.isPlaying();
                    
                    return message.reply({
                        embeds: [await successEmbed(
                            guildId,
                            '📝 Added to Queue',
                            `**[${first.info.title}](${first.info.uri})**\nBy: ${first.info.author}\nRequested by: ${message.author}`
                        )]
                    });
                }
            }
        } catch (error) {
            console.error('❌ Error in play command:', error);
            return message.reply({
                embeds: [await errorEmbed(guildId, 'Error', `Failed to play track: ${error.message}`)]
            });
        }
    }
};
