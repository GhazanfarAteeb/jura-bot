import { players } from '../../utils/shoukaku.js';
import { checkVoiceChannel } from '../../utils/musicPlayer.js';
import { errorEmbed, infoEmbed } from '../../utils/embeds.js';

export default {
    name: 'queue',
    aliases: ['q'],
    description: 'View the music queue',
    usage: 'queue [page]',
    category: 'music',
    execute: async (message, args) => {
        const guildId = message.guild.id;
        
        // Check if user is in voice channel
        const voiceCheck = checkVoiceChannel(message);
        if (voiceCheck.error) {
            return message.reply({ embeds: [await errorEmbed(guildId, 'Voice Channel Error', voiceCheck.message)] });
        }
        
        const playerData = players.get(guildId);
        
        if (!playerData || !playerData.nowPlaying) {
            return message.reply({
                embeds: [await errorEmbed(guildId, 'Empty Queue', 'There is nothing in the queue!')]
            });
        }
        
        const tracks = playerData.queue;
        const page = parseInt(args[0]) || 1;
        const perPage = 10;
        const totalPages = Math.ceil(tracks.length / perPage) || 1;
        
        if (page < 1 || page > totalPages) {
            return message.reply({
                embeds: [await errorEmbed(guildId, 'Invalid Page', `Invalid page number! Please use 1-${totalPages}`)]
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
        const current = playerData.nowPlaying.info;
        embed.addFields({
            name: '🎶 Now Playing',
            value: `**[${current.title}](${current.uri})**\nby ${current.author} • ${formatDuration(current.length)}`,
            inline: false
        });
        
        // Queue tracks
        if (pageTracks.length > 0) {
            const queueList = pageTracks.map((track, i) => {
                const num = start + i + 1;
                return `\`${num}.\` **[${track.info.title}](${track.info.uri})**\nby ${track.info.author} • ${formatDuration(track.info.length)}`;
            }).join('\n\n');
            
            embed.addFields({
                name: `📋 Up Next (${tracks.length} tracks)`,
                value: queueList,
                inline: false
            });
        }
        
        // Footer with stats
        const totalDuration = tracks.reduce((acc, track) => {
            return acc + track.info.length;
        }, 0);
        
        const hours = Math.floor(totalDuration / 3600000);
        const minutes = Math.floor((totalDuration % 3600000) / 60000);
        const durationStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
        
        embed.setFooter({ 
            text: `Page ${page}/${totalPages} • ${tracks.length} songs • ${durationStr} remaining` 
        });
        
        message.reply({ embeds: [embed] });
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
