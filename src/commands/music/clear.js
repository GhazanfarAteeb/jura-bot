import { checkSameVoiceChannel } from '../../utils/musicPlayer.js';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';

export default {
    name: 'clear',
    description: 'Clear all songs from the queue',
    usage: 'clear',
    category: 'music',
    aliases: ['clearqueue', 'cq'],
    execute: async (message, args) => {
        const guildId = message.guild.id;
        
        // Check if user is in same voice channel
        const check = checkSameVoiceChannel(message);
        if (check.error) {
            return message.reply({ embeds: [await errorEmbed(guildId, 'Error', check.message)] });
        }
        
        const queue = check.queue;
        
        if (queue.tracks.data.length === 0) {
            return message.reply({
                embeds: [await errorEmbed(guildId, 'The queue is already empty!')]
            });
        }
        
        const trackCount = queue.tracks.data.length;
        queue.tracks.clear();
        
        message.reply({
            embeds: [await successEmbed(guildId, '🗑️ Queue Cleared', `Removed **${trackCount}** songs from the queue!`)]
        });
    }
};
