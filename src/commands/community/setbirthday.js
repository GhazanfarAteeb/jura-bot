import Birthday from '../../models/Birthday.js';
import { successEmbed, errorEmbed, GLYPHS } from '../../utils/embeds.js';

export default {
    name: 'setbirthday',
    description: 'Set your birthday for celebrations',
    usage: 'setbirthday <month> <day> [year] [--fake] [--private]',
    category: 'community',
    cooldown: 60,
    execute: async (message, args) => {
        const guildId = message.guild.id;
        const userId = message.author.id;
        
        if (args.length < 2) {
            return message.reply({
                embeds: [await errorEmbed(guildId, 'Please provide at least month and day!\n\nUsage: `!setbirthday <month> <day> [year] [--fake] [--private]`\n\nExamples:\n• `!setbirthday 12 25` - December 25th\n• `!setbirthday 12 25 2000` - December 25th, 2000\n• `!setbirthday 12 25 --fake` - Fake birthday (for privacy)\n• `!setbirthday 12 25 --private` - No age will be shown')]
            });
        }
        
        // Parse flags
        const flags = args.filter(arg => arg.startsWith('--'));
        const isFake = flags.includes('--fake');
        const isPrivate = flags.includes('--private');
        
        // Remove flags from args
        const cleanArgs = args.filter(arg => !arg.startsWith('--'));
        
        const month = parseInt(cleanArgs[0]);
        const day = parseInt(cleanArgs[1]);
        const year = cleanArgs[2] ? parseInt(cleanArgs[2]) : null;
        
        // Validate month (1-12)
        if (isNaN(month) || month < 1 || month > 12) {
            return message.reply({
                embeds: [await errorEmbed(guildId, 'Invalid month! Please use 1-12.')]
            });
        }
        
        // Validate day (1-31)
        if (isNaN(day) || day < 1 || day > 31) {
            return message.reply({
                embeds: [await errorEmbed(guildId, 'Invalid day! Please use 1-31.')]
            });
        }
        
        // Validate year if provided
        if (year !== null && (isNaN(year) || year < 1900 || year > new Date().getFullYear())) {
            return message.reply({
                embeds: [await errorEmbed(guildId, `Invalid year! Please use 1900-${new Date().getFullYear()}.`)]
            });
        }
        
        // Check if date exists (basic validation)
        const testDate = new Date(year || 2000, month - 1, day);
        if (testDate.getMonth() !== month - 1 || testDate.getDate() !== day) {
            return message.reply({
                embeds: [await errorEmbed(guildId, 'Invalid date! This day doesn\'t exist in this month.')]
            });
        }
        
        try {
            // Find or create birthday
            let birthday = await Birthday.findOne({ guildId, userId });
            
            if (birthday) {
                // Update existing
                birthday.month = month;
                birthday.day = day;
                birthday.year = year;
                birthday.isActualBirthday = !isFake;
                birthday.showAge = !isPrivate;
            } else {
                // Create new
                birthday = new Birthday({
                    guildId,
                    userId,
                    month,
                    day,
                    year,
                    isActualBirthday: !isFake,
                    showAge: !isPrivate
                });
            }
            
            await birthday.save();
            
            // Create success message
            const dateStr = `${month}/${day}${year ? `/${year}` : ''}`;
            let description = `${GLYPHS.SUCCESS} Birthday set to **${dateStr}**!`;
            
            if (isFake) {
                description += '\n🎭 Marked as fake birthday (for privacy)';
            }
            
            if (isPrivate) {
                description += '\n🔒 Age will not be shown in announcements';
            }
            
            if (!isFake && year) {
                const age = birthday.getAge();
                if (age) {
                    description += `\n🎂 You'll turn ${age + 1} on your next birthday!`;
                }
            }
            
            const embed = await successEmbed(guildId, 'Birthday Set!', description);
            embed.addFields({
                name: 'Celebration Preference',
                value: `Current: **${birthday.celebrationPreference}**\nChange with: \`!birthdaypreference <public|dm|role|none>\``,
                inline: false
            });
            
            message.reply({ embeds: [embed] });
            
        } catch (error) {
            console.error('Error setting birthday:', error);
            message.reply({
                embeds: [await errorEmbed(guildId, 'Failed to set birthday. Please try again.')]
            });
        }
    }
};
