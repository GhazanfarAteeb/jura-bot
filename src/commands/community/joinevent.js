import Event from '../../models/Event.js';
import { successEmbed, errorEmbed, GLYPHS } from '../../utils/embeds.js';

export default {
    name: 'joinevent',
    aliases: ['eventjoin', 'rsvp'],
    description: 'Join an event to get notified',
    usage: 'joinevent <event_id>',
    category: 'community',
    execute: async (message, args) => {
        const guildId = message.guild.id;
        const userId = message.author.id;
        
        if (!args[0]) {
            return message.reply({
                embeds: [await errorEmbed(guildId, 'Please provide an event ID!\n\nUsage: `!joinevent <event_id>`\n\nFind event IDs with: `!events`')]
            });
        }
        
        const eventId = args[0];
        
        try {
            const event = await Event.findOne({ _id: eventId, guildId });
            
            if (!event) {
                return message.reply({
                    embeds: [await errorEmbed(guildId, 'Event not found! Make sure you\'re using the correct ID.')]
                });
            }
            
            if (event.status !== 'scheduled') {
                return message.reply({
                    embeds: [await errorEmbed(guildId, 'This event is no longer accepting participants.')]
                });
            }
            
            if (event.eventDate < new Date()) {
                return message.reply({
                    embeds: [await errorEmbed(guildId, 'This event has already started!')]
                });
            }
            
            if (event.participants.includes(userId)) {
                return message.reply({
                    embeds: [await errorEmbed(guildId, 'You\'re already signed up for this event!')]
                });
            }
            
            event.participants.push(userId);
            await event.save();
            
            const embed = await successEmbed(
                guildId,
                `${GLYPHS.SUCCESS} Joined Event!`,
                `You've been added to **${event.title}**!`
            );
            
            embed.addFields(
                {
                    name: 'When',
                    value: `<t:${Math.floor(event.eventDate.getTime() / 1000)}:F> (<t:${Math.floor(event.eventDate.getTime() / 1000)}:R>)`,
                    inline: false
                },
                {
                    name: 'Participants',
                    value: `${event.participants.length} member${event.participants.length !== 1 ? 's' : ''}`,
                    inline: true
                }
            );
            
            message.reply({ embeds: [embed] });
            
        } catch (error) {
            console.error('Error joining event:', error);
            message.reply({
                embeds: [await errorEmbed(guildId, 'Failed to join event. Please try again.')]
            });
        }
    }
};
