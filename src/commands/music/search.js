import { useMainPlayer, QueryType } from 'discord-player';
import { checkVoiceChannel } from '../../utils/musicPlayer.js';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';

export default {
    name: 'search',
    description: 'Search for songs and select one to play',
    usage: 'search <query>',
    category: 'music',
    aliases: ['find'],
    execute: async (message, args) => {
        const guildId = message.guild.id;
        
        // Check voice channel
        const voiceCheck = checkVoiceChannel(message);
        if (voiceCheck.error) {
            return message.reply({ embeds: [await errorEmbed(guildId, 'Voice Channel Error', voiceCheck.message)] });
        }
        
        const query = args.join(' ');
        if (!query) {
            return message.reply({
                embeds: [await errorEmbed(guildId, 'Missing Query', 'Please provide a search query!')]
            });
        }
        
        const player = useMainPlayer();
        
        try {
            const searchResult = await player.search(query, {
                requestedBy: message.author,
                searchEngine: QueryType.AUTO
            });
            
            if (!searchResult.hasTracks()) {
                return message.reply({
                    embeds: [await errorEmbed(guildId, 'No Results', `No results found for: ${query}`)]
                });
            }
            
            // Get top 10 results
            const tracks = searchResult.tracks.slice(0, 10);
            
            let description = 'Select a song by typing a number (1-10) within 30 seconds:\n\n';
            tracks.forEach((track, i) => {
                description += `**${i + 1}.** ${track.title} - ${track.author} \`[${track.duration}]\`\n`;
            });
            
            const searchEmbed = await successEmbed(guildId, '🔍 Search Results', description);
            await message.reply({ embeds: [searchEmbed] });
            
            // Create message collector
            const filter = m => m.author.id === message.author.id && !isNaN(m.content) && parseInt(m.content) >= 1 && parseInt(m.content) <= tracks.length;
            const collector = message.channel.createMessageCollector({ filter, time: 30000, max: 1 });
            
            collector.on('collect', async m => {
                const choice = parseInt(m.content) - 1;
                const selectedTrack = tracks[choice];
                
                try {
                    const queue = player.nodes.create(message.guild, {
                        metadata: {
                            channel: message.channel,
                            requestedBy: message.author
                        },
                        selfDeaf: true,
                        volume: 80,
                        leaveOnEmpty: true,
                        leaveOnEmptyCooldown: 300000,
                        leaveOnEnd: false
                    });
                    
                    if (!queue.connection) {
                        await queue.connect(message.member.voice.channel);
                    }
                    
                    queue.addTrack(selectedTrack);
                    
                    if (!queue.isPlaying()) {
                        await queue.node.play();
                    }
                    
                    m.reply({
                        embeds: [await successEmbed(guildId, '✅ Added to Queue', `**${selectedTrack.title}** by **${selectedTrack.author}**\nDuration: \`${selectedTrack.duration}\``)]
                    });
                } catch (error) {
                    console.error('Search play error:', error);
                    m.reply({
                        embeds: [await errorEmbed(guildId, 'Playback Error', 'An error occurred while trying to play the song!')]
                    });
                }
            });
            
            collector.on('end', async collected => {
                if (collected.size === 0) {
                    message.reply({
                        embeds: [await errorEmbed(guildId, 'Timeout', 'Search timed out. No song was selected.')]
                    });
                }
            });
            
        } catch (error) {
            console.error('Search error:', error);
            return message.reply({
                embeds: [await errorEmbed(guildId, 'Search Error', 'An error occurred while searching!')]
            });
        }
    }
};
