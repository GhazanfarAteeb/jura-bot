import { checkSameVoiceChannel } from '../../utils/musicPlayer.js';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';

export default {
    name: 'vaporwave',
    description: 'Toggle vaporwave effect (lower pitch and slower)',
    usage: 'vaporwave',
    category: 'music',
    aliases: ['vapor'],
    execute: async (message, args) => {
        const guildId = message.guild.id;
        
        // Check if user is in same voice channel
        const check = checkSameVoiceChannel(message);
        if (check.error) {
            return message.reply({ embeds: [await errorEmbed(guildId, check.message)] });
        }
        
        const queue = check.queue;
        const currentFilters = queue.filters.ffmpeg.filters;
        const isActive = currentFilters.includes('vaporwave');
        
        await queue.filters.ffmpeg.toggle(['vaporwave']);
        
        if (isActive) {
            message.reply({
                embeds: [await successEmbed(guildId, '🌊 Vaporwave Disabled', 'Vaporwave effect has been turned off!')]
            });
        } else {
            message.reply({
                embeds: [await successEmbed(guildId, '🌊 Vaporwave Enabled', 'Vaporwave effect is now active!')]
            });
        }
    }
};
