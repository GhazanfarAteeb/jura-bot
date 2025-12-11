import Birthday from '../../models/Birthday.js';
import { infoEmbed, errorEmbed, GLYPHS } from '../../utils/embeds.js';

export default {
    name: 'birthdays',
    aliases: ['listbirthdays', 'upcomingbirthdays'],
    description: 'View upcoming birthdays',
    usage: 'birthdays [days]',
    category: 'community',
    execute: async (message, args) => {
        const guildId = message.guild.id;
        const days = args[0] ? parseInt(args[0]) : 30;
        
        if (isNaN(days) || days < 1 || days > 365) {
            return message.reply({
                embeds: [await errorEmbed(guildId, 'Please provide a valid number of days (1-365)!')]
            });
        }
        
        try {
            const birthdays = await Birthday.getUpcomingBirthdays(guildId, days);
            
            if (birthdays.length === 0) {
                return message.reply({
                    embeds: [await infoEmbed(guildId, 'No Upcoming Birthdays', `No birthdays in the next ${days} days.`)]
                });
            }
            
            const embed = await infoEmbed(
                guildId,
                `${GLYPHS.CALENDAR} Upcoming Birthdays`,
                `Birthdays in the next ${days} days:`
            );
            
            // Group birthdays by date
            const grouped = {};
            for (const birthday of birthdays) {
                const dateKey = `${birthday.month}/${birthday.day}`;
                if (!grouped[dateKey]) {
                    grouped[dateKey] = [];
                }
                grouped[dateKey].push(birthday);
            }
            
            // Sort by date
            const sortedDates = Object.keys(grouped).sort((a, b) => {
                const [aMonth, aDay] = a.split('/').map(Number);
                const [bMonth, bDay] = b.split('/').map(Number);
                
                const now = new Date();
                const currentYear = now.getFullYear();
                
                const aDate = new Date(currentYear, aMonth - 1, aDay);
                const bDate = new Date(currentYear, bMonth - 1, bDay);
                
                // If date has passed, move to next year
                if (aDate < now) aDate.setFullYear(currentYear + 1);
                if (bDate < now) bDate.setFullYear(currentYear + 1);
                
                return aDate - bDate;
            });
            
            // Add fields (max 25 fields)
            let fieldCount = 0;
            for (const dateKey of sortedDates) {
                if (fieldCount >= 25) {
                    embed.setFooter({ text: `Showing first 25 dates. Use !birthdays ${days} to see all.` });
                    break;
                }
                
                const [month, day] = dateKey.split('/').map(Number);
                const birthdayList = grouped[dateKey];
                
                // Calculate days until
                const now = new Date();
                const currentYear = now.getFullYear();
                const birthdayDate = new Date(currentYear, month - 1, day);
                if (birthdayDate < now) birthdayDate.setFullYear(currentYear + 1);
                const daysUntil = Math.ceil((birthdayDate - now) / (1000 * 60 * 60 * 24));
                
                let value = '';
                for (const birthday of birthdayList) {
                    const member = await message.guild.members.fetch(birthday.userId).catch(() => null);
                    if (!member) continue;
                    
                    value += `${member.toString()}`;
                    
                    if (birthday.showAge && birthday.year) {
                        const age = birthday.getAge();
                        if (age !== null) {
                            value += ` • Turning ${age + 1}`;
                        }
                    }
                    
                    value += '\n';
                }
                
                if (value) {
                    const monthName = new Date(2000, month - 1, day).toLocaleDateString('en-US', { month: 'long' });
                    embed.addFields({
                        name: `${GLYPHS.SPARKLE} ${monthName} ${day}${daysUntil === 0 ? ' (Today!)' : ` (in ${daysUntil} day${daysUntil !== 1 ? 's' : ''})`}`,
                        value: value.trim(),
                        inline: false
                    });
                    fieldCount++;
                }
            }
            
            embed.setColor('#FF69B4'); // Pink
            message.reply({ embeds: [embed] });
            
        } catch (error) {
            console.error('Error listing birthdays:', error);
            message.reply({
                embeds: [await errorEmbed(guildId, 'Failed to fetch birthdays. Please try again.')]
            });
        }
    }
};
