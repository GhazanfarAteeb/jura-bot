import { infoEmbed, GLYPHS } from '../../utils/embeds.js';
import Member from '../../models/Member.js';
import { getRandomFooter } from '../../utils/raphael.js';

export default {
    name: 'userinfo',
    description: 'Get information about a user',
    usage: '[@user|user_id]',
    aliases: ['user', 'whois', 'ui'],
    cooldown: 3,
    
    async execute(message, args) {
        const targetUser = args[0] ? 
            await message.guild.members.fetch(args[0].replace(/[<@!>]/g, '')).catch(() => null) :
            message.member;
        
        if (!targetUser) {
            const { errorEmbed } = await import('../../utils/embeds.js');
            const embed = await errorEmbed(message.guild.id, 'Subject Not Found',
                `**Warning:** Unable to locate the specified user, Master.`
            );
            return message.reply({ embeds: [embed] });
        }
        
        // Get member data from database
        const memberData = await Member.findOne({
            userId: targetUser.user.id,
            guildId: message.guild.id
        });
        
        const embed = await infoEmbed(message.guild.id, `Individual Analysis`, `**Report:** Data compiled for **${targetUser.user.tag}**, Master.`);
        
        // Basic info
        embed.addFields({
            name: `▸ Identity Data`,
            value:
                `**Username:** ${targetUser.user.tag}\n` +
                `**Identifier:** \`${targetUser.user.id}\`\n` +
                `**Classification:** ${targetUser.user.bot ? 'Automated System' : 'Organic User'}\n` +
                `**Reference:** ${targetUser}`,
            inline: false
        });
        
        // Account dates
        embed.addFields({
            name: `▸ Temporal Records`,
            value:
                `**Account Created:** <t:${Math.floor(targetUser.user.createdTimestamp / 1000)}:F>\n` +
                `**Age:** <t:${Math.floor(targetUser.user.createdTimestamp / 1000)}:R>`,
            inline: false
        });
        
        // Server dates
        embed.addFields({
            name: `▸ Server Affiliation`,
            value:
                `**First Detected:** <t:${Math.floor(targetUser.joinedTimestamp / 1000)}:F>\n` +
                `**Duration:** <t:${Math.floor(targetUser.joinedTimestamp / 1000)}:R>`,
            inline: false
        });
        
        // Roles
        const roles = targetUser.roles.cache
            .filter(r => r.id !== message.guild.id)
            .sort((a, b) => b.position - a.position)
            .map(r => r.toString())
            .slice(0, 10);
        
        if (roles.length > 0) {
            embed.addFields({
                name: `▸ Authority Levels [${targetUser.roles.cache.size - 1}]`,
                value: roles.join(', ') + (targetUser.roles.cache.size > 11 ? '...' : ''),
                inline: false
            });
        }
        
        // Member data from database
        if (memberData) {
            embed.addFields({
                name: `▸ Behavioral Metrics`,
                value:
                    `**Entry Count:** ${memberData.joinCount}\n` +
                    `**Departure Count:** ${memberData.leaveCount}\n` +
                    `**Infractions:** ${memberData.warnings.length}\n` +
                    `**Threat Assessment:** ${memberData.susLevel}/10\n` +
                    `**New Account:** ${memberData.isNewAccount ? 'Affirmative' : 'Negative'}\n` +
                    `**Under Surveillance:** ${memberData.isSuspicious ? '◉ Active' : '○ Inactive'}`,
                inline: false
            });
        }
        
        embed.setThumbnail(targetUser.user.displayAvatarURL({ dynamic: true, size: 256 }));
        embed.setColor(targetUser.displayHexColor);
        embed.setFooter({ text: getRandomFooter() });
        
        return message.reply({ embeds: [embed] });
    }
};
