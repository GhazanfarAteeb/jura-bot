import { checkSameVoiceChannel } from '../../utils/musicPlayer.js';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';

export default {
    name: 'remove',
    description: 'Remove a song from the queue',
    usage: 'remove <position>',
    category: 'music',
    aliases: ['rm', 'delete'],
    execute: async (message, args) => {
        const guildId = message.guild.id;
        
        // Check if user is in same voice channel
        const check = checkSameVoiceChannel(message);
        if (check.error) {
            return message.reply({ embeds: [await errorEmbed(guildId, check.message)] });
        }
        
        const queue = check.queue;
        
        if (queue.tracks.data.length === 0) {
            return message.reply({
                embeds: [await errorEmbed(guildId, 'The queue is empty!')]
            });
        }
        
        const position = parseInt(args[0]);
        
        if (!position || position < 1 || position > queue.tracks.data.length) {
            return message.reply({
                embeds: [await errorEmbed(guildId, `Please provide a valid position between 1 and ${queue.tracks.data.length}!`)]
            });
        }
        
        const track = queue.tracks.data[position - 1];
        queue.node.remove(track);
        
        message.reply({
            embeds: [await successEmbed(guildId, '🗑️ Song Removed', `Removed **${track.title}** by **${track.author}** from the queue!`)]
        });
    }
};
