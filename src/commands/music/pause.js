import { checkSameVoiceChannel } from '../../utils/musicPlayer.js';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';

export default {
    name: 'pause',
    description: 'Pause the current song',
    usage: 'pause',
    category: 'music',
    execute: async (message, args) => {
        const guildId = message.guild.id;
        
        // Check if user is in same voice channel
        const check = checkSameVoiceChannel(message);
        if (check.error) {
            return message.reply({ embeds: [await errorEmbed(guildId, 'Error', check.message)] });
        }
        
        const queue = check.queue;
        
        if (queue.node.isPaused()) {
            return message.reply({
                embeds: [await errorEmbed(guildId, 'The music is already paused!')]
            });
        }
        
        queue.node.setPaused(true);
        
        message.reply({
            embeds: [await successEmbed(guildId, '⏸️ Paused', 'Music has been paused. Use `!resume` to continue.')]
        });
    }
};
