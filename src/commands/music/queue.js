import { checkSameVoiceChannel } from '../../utils/musicPlayer.js';
import { errorEmbed, infoEmbed } from '../../utils/embeds.js';

export default {
    name: 'queue',
    aliases: ['q'],
    description: 'View the music queue',
    usage: 'queue [page]',
    category: 'music',
    execute: async (message, args) => {
        const guildId = message.guild.id;
        
        // Check if user is in same voice channel
        const check = checkSameVoiceChannel(message);
        if (check.error) {
            return message.reply({ embeds: [await errorEmbed(guildId, 'Error', check.message)] });
        }
        
        const queue = check.queue;
        
        if (!queue.currentTrack) {
            return message.reply({
                embeds: [await errorEmbed(guildId, 'There is nothing in the queue!')]
            });
        }
        
        const tracks = queue.tracks.toArray();
        const page = parseInt(args[0]) || 1;
        const perPage = 10;
        const totalPages = Math.ceil(tracks.length / perPage) || 1;
        
        if (page < 1 || page > totalPages) {
            return message.reply({
                embeds: [await errorEmbed(guildId, `Invalid page number! Please use 1-${totalPages}`)]
            });
        }
        
        const start = (page - 1) * perPage;
        const end = start + perPage;
        const pageTracks = tracks.slice(start, end);
        
        const embed = await infoEmbed(
            guildId,
            '🎵 Music Queue',
            ''
        );
        
        // Current track
        const current = queue.currentTrack;
        embed.addFields({
            name: '🎶 Now Playing',
            value: `**${current.title}**\nby ${current.author} • ${current.duration}\nRequested by: ${current.requestedBy}`,
            inline: false
        });
        
        // Queue tracks
        if (pageTracks.length > 0) {
            const queueList = pageTracks.map((track, i) => {
                const num = start + i + 1;
                return `\`${num}.\` **${track.title}**\nby ${track.author} • ${track.duration}`;
            }).join('\n\n');
            
            embed.addFields({
                name: `📋 Up Next (${tracks.length} tracks)`,
                value: queueList,
                inline: false
            });
        }
        
        // Footer with stats
        const totalDuration = tracks.reduce((acc, track) => {
            const [min, sec] = track.duration.split(':').map(Number);
            return acc + (min * 60 + sec);
        }, 0);
        
        const hours = Math.floor(totalDuration / 3600);
        const minutes = Math.floor((totalDuration % 3600) / 60);
        const durationStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
        
        embed.setFooter({ 
            text: `Page ${page}/${totalPages} • ${tracks.length} songs • ${durationStr} remaining • Volume: ${queue.node.volume}%` 
        });
        
        if (current.thumbnail) {
            embed.setThumbnail(current.thumbnail);
        }
        
        message.reply({ embeds: [embed] });
    }
};
