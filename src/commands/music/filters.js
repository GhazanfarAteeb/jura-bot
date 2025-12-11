import { useMainPlayer } from 'discord-player';
import { checkSameVoiceChannel } from '../../utils/musicPlayer.js';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';

const availableFilters = [
    '8D',
    'bassboost_low',
    'bassboost',
    'bassboost_high',
    'echo',
    'flanger',
    'gate',
    'haas',
    'karaoke',
    'nightcore',
    'reverse',
    'vaporwave',
    'mcompand',
    'phaser',
    'tremolo',
    'surround',
    'earwax',
    'chorus',
    'crystalizer'
];

export default {
    name: 'filters',
    description: 'Manage audio filters',
    usage: 'filters [list/clear/add <filter>/remove <filter>]',
    category: 'music',
    aliases: ['filter', 'fx'],
    execute: async (message, args) => {
        const guildId = message.guild.id;
        
        // Check if user is in same voice channel
        const check = checkSameVoiceChannel(message);
        if (check.error) {
            return message.reply({ embeds: [await errorEmbed(guildId, check.message)] });
        }
        
        const queue = check.queue;
        const action = args[0]?.toLowerCase();
        
        // List all available filters
        if (!action || action === 'list') {
            const currentFilters = queue.filters.ffmpeg.filters;
            const activeFilters = availableFilters.filter(f => currentFilters.includes(f));
            
            let description = '**Available Filters:**\n';
            description += availableFilters.map(f => `\`${f}\``).join(', ');
            
            if (activeFilters.length > 0) {
                description += '\n\n**Active Filters:**\n';
                description += activeFilters.map(f => `✅ \`${f}\``).join(', ');
            } else {
                description += '\n\n**Active Filters:** None';
            }
            
            description += '\n\n**Usage:**\n';
            description += '`!filters add <filter>` - Add a filter\n';
            description += '`!filters remove <filter>` - Remove a filter\n';
            description += '`!filters clear` - Remove all filters';
            
            return message.reply({
                embeds: [await successEmbed(guildId, '🎛️ Audio Filters', description)]
            });
        }
        
        // Clear all filters
        if (action === 'clear' || action === 'reset') {
            await queue.filters.ffmpeg.setFilters(false);
            return message.reply({
                embeds: [await successEmbed(guildId, '🎛️ Filters Cleared', 'All audio filters have been removed!')]
            });
        }
        
        // Add filter
        if (action === 'add' || action === 'enable') {
            const filterName = args[1]?.toLowerCase();
            
            if (!filterName) {
                return message.reply({
                    embeds: [await errorEmbed(guildId, 'Please specify a filter to add!')]
                });
            }
            
            const filter = availableFilters.find(f => f.toLowerCase() === filterName);
            
            if (!filter) {
                return message.reply({
                    embeds: [await errorEmbed(guildId, `Filter \`${filterName}\` not found! Use \`!filters list\` to see available filters.`)]
                });
            }
            
            const currentFilters = queue.filters.ffmpeg.filters;
            if (currentFilters.includes(filter)) {
                return message.reply({
                    embeds: [await errorEmbed(guildId, `Filter \`${filter}\` is already active!`)]
                });
            }
            
            await queue.filters.ffmpeg.toggle([filter]);
            
            return message.reply({
                embeds: [await successEmbed(guildId, '🎛️ Filter Added', `Applied \`${filter}\` filter!`)]
            });
        }
        
        // Remove filter
        if (action === 'remove' || action === 'disable') {
            const filterName = args[1]?.toLowerCase();
            
            if (!filterName) {
                return message.reply({
                    embeds: [await errorEmbed(guildId, 'Please specify a filter to remove!')]
                });
            }
            
            const filter = availableFilters.find(f => f.toLowerCase() === filterName);
            
            if (!filter) {
                return message.reply({
                    embeds: [await errorEmbed(guildId, `Filter \`${filterName}\` not found!`)]
                });
            }
            
            const currentFilters = queue.filters.ffmpeg.filters;
            if (!currentFilters.includes(filter)) {
                return message.reply({
                    embeds: [await errorEmbed(guildId, `Filter \`${filter}\` is not active!`)]
                });
            }
            
            await queue.filters.ffmpeg.toggle([filter]);
            
            return message.reply({
                embeds: [await successEmbed(guildId, '🎛️ Filter Removed', `Removed \`${filter}\` filter!`)]
            });
        }
        
        return message.reply({
            embeds: [await errorEmbed(guildId, 'Invalid action! Use: `list`, `add <filter>`, `remove <filter>`, or `clear`')]
        });
    }
};
