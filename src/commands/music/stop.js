import { checkSameVoiceChannel } from '../../utils/musicPlayer.js';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';

export default {
    name: 'stop',
    aliases: ['leave', 'disconnect', 'dc'],
    description: 'Stop the music and clear the queue',
    usage: 'stop',
    category: 'music',
    execute: async (message, args) => {
        const guildId = message.guild.id;
        
        // Check if user is in same voice channel
        const check = checkSameVoiceChannel(message);
        if (check.error) {
            return message.reply({ embeds: [await errorEmbed(guildId, 'Error', check.message)] });
        }
        
        const queue = check.queue;
        
        // Clear queue and stop
        queue.delete();
        
        message.reply({
            embeds: [await successEmbed(guildId, '👋 Stopped!', 'Stopped the music and cleared the queue.')]
        });
    }
};
