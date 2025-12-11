import { checkSameVoiceChannel } from '../../utils/musicPlayer.js';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';

export default {
    name: 'karaoke',
    description: 'Toggle karaoke effect (reduces vocals)',
    usage: 'karaoke',
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
        const isActive = currentFilters.includes('karaoke');
        
        await queue.filters.ffmpeg.toggle(['karaoke']);
        
        if (isActive) {
            message.reply({
                embeds: [await successEmbed(guildId, '🎤 Karaoke Disabled', 'Karaoke effect has been turned off!')]
            });
        } else {
            message.reply({
                embeds: [await successEmbed(guildId, '🎤 Karaoke Enabled', 'Karaoke effect is now active! Vocals have been reduced.')]
            });
        }
    }
};
