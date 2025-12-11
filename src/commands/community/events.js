import Event from '../../models/Event.js';
import { infoEmbed, errorEmbed, GLYPHS } from '../../utils/embeds.js';

export default {
    name: 'events',
    aliases: ['listevents', 'upcomingevents'],
    description: 'View upcoming server events',
    usage: 'events',
    category: 'community',
    execute: async (message, args) => {
        const guildId = message.guild.id;
        
        try {
            const events = await Event.getUpcomingEvents(guildId);
            
            if (events.length === 0) {
                return message.reply({
                    embeds: [await infoEmbed(guildId, 'No Upcoming Events', 'There are no scheduled events at this time.')]
                });
            }
            
            const embed = await infoEmbed(
                guildId,
                `${GLYPHS.CALENDAR} Upcoming Events`,
                `${events.length} event${events.length !== 1 ? 's' : ''} scheduled`
            );
            
            for (const event of events.slice(0, 10)) { // Show max 10 events
                let fieldValue = '';
                
                if (event.description) {
                    fieldValue += `${event.description}\n\n`;
                }
                
                fieldValue += `**When:** <t:${Math.floor(event.eventDate.getTime() / 1000)}:F>\n`;
                fieldValue += `**Time:** <t:${Math.floor(event.eventDate.getTime() / 1000)}:R>\n`;
                
                if (event.location) {
                    const channel = message.guild.channels.cache.get(event.location);
                    fieldValue += `**Location:** ${channel ? channel.toString() : event.location}\n`;
                }
                
                if (event.participants.length > 0) {
                    fieldValue += `**Participants:** ${event.participants.length} member${event.participants.length !== 1 ? 's' : ''}\n`;
                }
                
                fieldValue += `**ID:** \`${event._id.toString()}\``;
                
                embed.addFields({
                    name: `${GLYPHS.SPARKLE} ${event.title}`,
                    value: fieldValue,
                    inline: false
                });
            }
            
            if (events.length > 10) {
                embed.setFooter({ text: `Showing 10 of ${events.length} events` });
            }
            
            embed.setColor('#5865F2'); // Blurple
            message.reply({ embeds: [embed] });
            
        } catch (error) {
            console.error('Error listing events:', error);
            message.reply({
                embeds: [await errorEmbed(guildId, 'Failed to fetch events. Please try again.')]
            });
        }
    }
};
