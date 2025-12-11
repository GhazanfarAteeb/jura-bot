import { checkSameVoiceChannel } from '../../utils/musicPlayer.js';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';

export default {
    name: 'shuffle',
    description: 'Shuffle the queue',
    usage: 'shuffle',
    category: 'music',
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
                embeds: [await errorEmbed(guildId, 'There are no songs in the queue to shuffle!')]
            });
        }
        
        queue.tracks.shuffle();
        
        message.reply({
            embeds: [await successEmbed(guildId, '🔀 Queue Shuffled', `Shuffled **${queue.tracks.data.length}** songs in the queue!`)]
        });
    }
};
