import { checkSameVoiceChannel } from '../../utils/musicPlayer.js';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';

export default {
    name: 'resume',
    description: 'Resume the paused song',
    usage: 'resume',
    category: 'music',
    aliases: ['unpause'],
    execute: async (message, args) => {
        const guildId = message.guild.id;
        
        // Check if user is in same voice channel
        const check = checkSameVoiceChannel(message);
        if (check.error) {
            return message.reply({ embeds: [await errorEmbed(guildId, check.message)] });
        }
        
        const queue = check.queue;
        
        if (!queue.node.isPaused()) {
            return message.reply({
                embeds: [await errorEmbed(guildId, 'The music is not paused!')]
            });
        }
        
        queue.node.setPaused(false);
        
        message.reply({
            embeds: [await successEmbed(guildId, '▶️ Resumed', 'Music has been resumed.')]
        });
    }
};
