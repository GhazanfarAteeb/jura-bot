import { checkSameVoiceChannel } from '../../utils/musicPlayer.js';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';

export default {
    name: 'bassboost',
    description: 'Apply bass boost filter',
    usage: 'bassboost [off/low/medium/high]',
    category: 'music',
    aliases: ['bass'],
    execute: async (message, args) => {
        const guildId = message.guild.id;
        
        // Check if user is in same voice channel
        const check = checkSameVoiceChannel(message);
        if (check.error) {
            return message.reply({ embeds: [await errorEmbed(guildId, check.message)] });
        }
        
        const queue = check.queue;
        const level = args[0]?.toLowerCase() || 'medium';
        
        // Remove all bass boost filters first
        const currentFilters = queue.filters.ffmpeg.filters;
        const bassFilters = ['bassboost_low', 'bassboost', 'bassboost_high'];
        const activeBass = bassFilters.filter(f => currentFilters.includes(f));
        
        if (activeBass.length > 0) {
            await queue.filters.ffmpeg.toggle(activeBass);
        }
        
        if (level === 'off' || level === 'disable') {
            return message.reply({
                embeds: [await successEmbed(guildId, '🔊 Bass Boost Disabled', 'Bass boost has been turned off!')]
            });
        }
        
        let filter;
        let levelText;
        
        switch (level) {
            case 'low':
            case '1':
                filter = 'bassboost_low';
                levelText = 'Low';
                break;
            case 'medium':
            case 'med':
            case '2':
                filter = 'bassboost';
                levelText = 'Medium';
                break;
            case 'high':
            case '3':
                filter = 'bassboost_high';
                levelText = 'High';
                break;
            default:
                return message.reply({
                    embeds: [await errorEmbed(guildId, 'Invalid level! Use: `off`, `low`, `medium`, or `high`')]
                });
        }
        
        await queue.filters.ffmpeg.toggle([filter]);
        
        message.reply({
            embeds: [await successEmbed(guildId, '🔊 Bass Boost Applied', `Bass boost level: **${levelText}**`)]
        });
    }
};
