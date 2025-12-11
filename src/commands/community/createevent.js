import Event from '../../models/Event.js';
import { successEmbed, errorEmbed, GLYPHS } from '../../utils/embeds.js';
import { parseDuration, hasPermission } from '../../utils/helpers.js';

export default {
    name: 'createevent',
    aliases: ['addevent', 'newevent'],
    description: 'Create a server event with notifications',
    usage: 'createevent <time> | <title> | [description]',
    category: 'community',
    permissions: ['ManageGuild'],
    cooldown: 10,
    execute: async (message, args) => {
        const guildId = message.guild.id;
        
        if (!hasPermission(message.member, 'ManageGuild')) {
            return message.reply({
                embeds: [await errorEmbed(guildId, 'You need **Manage Server** permission to create events!')]
            });
        }
        
        if (args.length === 0) {
            return message.reply({
                embeds: [await errorEmbed(guildId, 'Please provide event details!\n\nUsage: `!createevent <time> | <title> | [description]`\n\nExamples:\n• `!createevent 2h | Movie Night | Join us in VC!`\n• `!createevent 1d12h | Tournament | Registration required`\n• `!createevent 30m | Quick Meeting`')]
            });
        }
        
        const parts = args.join(' ').split('|').map(p => p.trim());
        
        if (parts.length < 2) {
            return message.reply({
                embeds: [await errorEmbed(guildId, 'Please use the format: `<time> | <title> | [description]`')]
            });
        }
        
        const [timeStr, title, description] = parts;
        
        // Parse time duration
        const duration = parseDuration(timeStr);
        if (!duration || duration < 60000) { // Minimum 1 minute
            return message.reply({
                embeds: [await errorEmbed(guildId, 'Invalid time! Use formats like: 30m, 2h, 1d12h\n\nMinimum: 1 minute')]
            });
        }
        
        if (duration > 365 * 24 * 60 * 60 * 1000) { // Maximum 1 year
            return message.reply({
                embeds: [await errorEmbed(guildId, 'Event time cannot be more than 1 year in the future!')]
            });
        }
        
        const eventDate = new Date(Date.now() + duration);
        
        try {
            const event = new Event({
                guildId,
                title,
                description: description || null,
                eventDate,
                createdBy: message.author.id,
                notificationChannel: message.channel.id,
                notifyBefore: 15 // 15 minutes before by default
            });
            
            await event.save();
            
            const embed = await successEmbed(
                guildId,
                `${GLYPHS.CALENDAR} Event Created!`,
                `**${title}** has been scheduled!`
            );
            
            embed.addFields(
                {
                    name: 'When',
                    value: `<t:${Math.floor(eventDate.getTime() / 1000)}:F> (<t:${Math.floor(eventDate.getTime() / 1000)}:R>)`,
                    inline: false
                }
            );
            
            if (description) {
                embed.addFields({
                    name: 'Description',
                    value: description,
                    inline: false
                });
            }
            
            embed.addFields(
                {
                    name: 'Event ID',
                    value: `\`${event._id.toString()}\``,
                    inline: true
                },
                {
                    name: 'Notification',
                    value: '15 minutes before',
                    inline: true
                }
            );
            
            embed.setFooter({ text: 'Users can join with: !joinevent <ID>' });
            
            message.reply({ embeds: [embed] });
            
        } catch (error) {
            console.error('Error creating event:', error);
            message.reply({
                embeds: [await errorEmbed(guildId, 'Failed to create event. Please try again.')]
            });
        }
    }
};
