import Birthday from '../../models/Birthday.js';
import { successEmbed, errorEmbed } from '../../utils/embeds.js';

export default {
    name: 'removebirthday',
    aliases: ['deletebirthday', 'clearbirthday'],
    description: 'Remove your birthday from the system',
    usage: 'removebirthday',
    category: 'community',
    execute: async (message, args) => {
        const guildId = message.guild.id;
        const userId = message.author.id;
        
        try {
            const birthday = await Birthday.findOne({ guildId, userId });
            
            if (!birthday) {
                return message.reply({
                    embeds: [await errorEmbed(guildId, 'You don\'t have a birthday set!')]
                });
            }
            
            await Birthday.deleteOne({ guildId, userId });
            
            message.reply({
                embeds: [await successEmbed(guildId, 'Birthday Removed', 'Your birthday has been removed from the system.')]
            });
            
        } catch (error) {
            console.error('Error removing birthday:', error);
            message.reply({
                embeds: [await errorEmbed(guildId, 'Failed to remove birthday. Please try again.')]
            });
        }
    }
};
