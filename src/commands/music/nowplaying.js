import { checkSameVoiceChannel, formatDuration, createProgressBar } from '../../utils/musicPlayer.js';
import { errorEmbed, infoEmbed } from '../../utils/embeds.js';

export default {
    name: 'nowplaying',
    aliases: ['np', 'current', 'playing'],
    description: 'Show the currently playing song',
    usage: 'nowplaying',
    category: 'music',
    execute: async (message, args) => {
        const guildId = message.guild.id;
        
        // Check if user is in same voice channel
        const check = checkSameVoiceChannel(message);
        if (check.error) {
            return message.reply({ embeds: [await errorEmbed(guildId, check.message)] });
        }
        
        const queue = check.queue;
        const track = queue.currentTrack;
        
        if (!track) {
            return message.reply({
                embeds: [await errorEmbed(guildId, 'There is no song currently playing!')]
            });
        }
        
        const embed = await infoEmbed(
            guildId,
            '🎶 Now Playing',
            `**${track.title}**\nby ${track.author}`
        );
        
        // Progress bar
        const currentTime = queue.node.getTimestamp();
        if (currentTime) {
            const progress = createProgressBar(currentTime.current.value, currentTime.total.value);
            embed.addFields({
                name: 'Progress',
                value: `\`${currentTime.current.label}\` ${progress} \`${currentTime.total.label}\``,
                inline: false
            });
        }
        
        // Track info
        embed.addFields(
            { name: 'Duration', value: track.duration, inline: true },
            { name: 'Volume', value: `${queue.node.volume}%`, inline: true },
            { name: 'Loop Mode', value: queue.repeatMode === 0 ? 'Off' : queue.repeatMode === 1 ? 'Track' : 'Queue', inline: true },
            { name: 'Requested By', value: track.requestedBy.toString(), inline: true },
            { name: 'Queue Position', value: `${queue.tracks.size} tracks remaining`, inline: true }
        );
        
        if (track.thumbnail) {
            embed.setThumbnail(track.thumbnail);
        }
        
        if (track.url) {
            embed.setURL(track.url);
        }
        
        message.reply({ embeds: [embed] });
    }
};
