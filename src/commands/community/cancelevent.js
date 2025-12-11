import Event from '../../models/Event.js';
import { successEmbed, errorEmbed } from '../../utils/embeds.js';
import { hasPermission } from '../../utils/helpers.js';

export default {
    name: 'cancelevent',
    aliases: ['deleteevent', 'removeevent'],
    description: 'Cancel a scheduled event',
    usage: 'cancelevent <event_id>',
    category: 'community',
    permissions: ['ManageGuild'],
    execute: async (message, args) => {
        const guildId = message.guild.id;
        
        if (!hasPermission(message.member, 'ManageGuild')) {
            return message.reply({
                embeds: [await errorEmbed(guildId, 'You need **Manage Server** permission to cancel events!')]
            });
        }
        
        if (!args[0]) {
            return message.reply({
                embeds: [await errorEmbed(guildId, 'Please provide an event ID!\n\nUsage: `!cancelevent <event_id>`')]
            });
        }
        
        const eventId = args[0];
        
        try {
            const event = await Event.findOne({ _id: eventId, guildId });
            
            if (!event) {
                return message.reply({
                    embeds: [await errorEmbed(guildId, 'Event not found!')]
                });
            }
            
            const eventTitle = event.title;
            const participantCount = event.participants.length;
            
            // Notify participants if event had signups
            if (participantCount > 0 && event.notificationChannel) {
                const channel = message.guild.channels.cache.get(event.notificationChannel);
                if (channel) {
                    const mentions = event.participants.map(id => `<@${id}>`).join(' ');
                    await channel.send({
                        content: mentions,
                        embeds: [await errorEmbed(guildId, `The event **${eventTitle}** has been cancelled.`)]
                    }).catch(() => {});
                }
            }
            
            await Event.deleteOne({ _id: eventId });
            
            message.reply({
                embeds: [await successEmbed(
                    guildId, 
                    'Event Cancelled', 
                    `**${eventTitle}** has been cancelled.${participantCount > 0 ? `\n\n${participantCount} participant${participantCount !== 1 ? 's have' : ' has'} been notified.` : ''}`
                )]
            });
            
        } catch (error) {
            console.error('Error cancelling event:', error);
            message.reply({
                embeds: [await errorEmbed(guildId, 'Failed to cancel event. Please try again.')]
            });
        }
    }
};
