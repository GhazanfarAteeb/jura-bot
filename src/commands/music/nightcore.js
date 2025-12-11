import { checkSameVoiceChannel } from '../../utils/musicPlayer.js';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';

export default {
    name: 'nightcore',
    description: 'Toggle nightcore effect (higher pitch and faster)',
    usage: 'nightcore',
    category: 'music',
    execute: async (message, args) => {
        const guildId = message.guild.id;
        
        // Check if user is in same voice channel
        const check = checkSameVoiceChannel(message);
        if (check.error) {
            return message.reply({ embeds: [await errorEmbed(guildId, 'Error', check.message)] });
        }
        
        const queue = check.queue;
        const currentFilters = queue.filters.ffmpeg.filters;
        const isActive = currentFilters.includes('nightcore');
        
        await queue.filters.ffmpeg.toggle(['nightcore']);
        
        if (isActive) {
            message.reply({
                embeds: [await successEmbed(guildId, '🌙 Nightcore Disabled', 'Nightcore effect has been turned off!')]
            });
        } else {
            message.reply({
                embeds: [await successEmbed(guildId, '🌙 Nightcore Enabled', 'Nightcore effect is now active!')]
            });
        }
    }
};
