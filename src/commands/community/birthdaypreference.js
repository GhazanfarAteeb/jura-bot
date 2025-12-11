import Birthday from '../../models/Birthday.js';
import { successEmbed, errorEmbed } from '../../utils/embeds.js';

export default {
    name: 'birthdaypreference',
    aliases: ['bdpref'],
    description: 'Set how you want birthday celebrations',
    usage: 'birthdaypreference <public|dm|role|none>',
    category: 'community',
    execute: async (message, args) => {
        const guildId = message.guild.id;
        const userId = message.author.id;
        
        const validPreferences = ['public', 'dm', 'role', 'none'];
        const preference = args[0]?.toLowerCase();
        
        if (!preference || !validPreferences.includes(preference)) {
            return message.reply({
                embeds: [await errorEmbed(guildId, `Please provide a valid preference!\n\nOptions:\n• **public** - Announce in birthday channel (default)\n• **dm** - Only send a DM\n• **role** - Only assign birthday role (no announcement)\n• **none** - No celebration at all`)]
            });
        }
        
        try {
            const birthday = await Birthday.findOne({ guildId, userId });
            
            if (!birthday) {
                return message.reply({
                    embeds: [await errorEmbed(guildId, 'You need to set your birthday first!\n\nUse: `!setbirthday <month> <day> [year]`')]
                });
            }
            
            birthday.celebrationPreference = preference;
            await birthday.save();
            
            const descriptions = {
                public: 'Your birthday will be announced publicly in the birthday channel!',
                dm: 'You will receive a private birthday message via DM!',
                role: 'You will only receive the birthday role (no announcement)!',
                none: 'Your birthday will not be celebrated (tracked only).'
            };
            
            message.reply({
                embeds: [await successEmbed(guildId, 'Preference Updated', descriptions[preference])]
            });
            
        } catch (error) {
            console.error('Error updating birthday preference:', error);
            message.reply({
                embeds: [await errorEmbed(guildId, 'Failed to update preference. Please try again.')]
            });
        }
    }
};
