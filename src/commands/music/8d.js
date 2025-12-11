import { checkSameVoiceChannel } from '../../utils/musicPlayer.js';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';

export default {
    name: '8d',
    description: 'Toggle 8D audio effect',
    usage: '8d',
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
        const is8DActive = currentFilters.includes('8D');
        
        await queue.filters.ffmpeg.toggle(['8D']);
        
        if (is8DActive) {
            message.reply({
                embeds: [await successEmbed(guildId, '🎧 8D Audio Disabled', '8D audio effect has been turned off!')]
            });
        } else {
            message.reply({
                embeds: [await successEmbed(guildId, '🎧 8D Audio Enabled', '8D audio effect is now active! Use headphones for the best experience.')]
            });
        }
    }
};
