import { infoEmbed, GLYPHS } from '../../utils/embeds.js';
import Member from '../../models/Member.js';

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
            const embed = await errorEmbed(message.guild.id, 'User Not Found',
                `${GLYPHS.ERROR} Could not find that user.`
            );
            return message.reply({ embeds: [embed] });
        }
        
        // Get member data from database
        const memberData = await Member.findOne({
            userId: targetUser.user.id,
            guildId: message.guild.id
        });
        
        const embed = await infoEmbed(message.guild.id, `User Info: ${targetUser.user.tag}`, null);
        
        // Basic info
        embed.addFields({
            name: `${GLYPHS.ARROW_RIGHT} Basic Information`,
            value:
                `**Username:** ${targetUser.user.tag}\n` +
                `**ID:** \`${targetUser.user.id}\`\n` +
                `**Bot:** ${targetUser.user.bot ? 'Yes' : 'No'}\n` +
                `**Mention:** ${targetUser}`,
            inline: false
        });
        
        // Account dates
        embed.addFields({
            name: `${GLYPHS.ARROW_RIGHT} Account`,
            value:
                `**Created:** <t:${Math.floor(targetUser.user.createdTimestamp / 1000)}:F>\n` +
                `**Created (Relative):** <t:${Math.floor(targetUser.user.createdTimestamp / 1000)}:R>`,
            inline: false
        });
        
        // Server dates
        embed.addFields({
            name: `${GLYPHS.ARROW_RIGHT} Server`,
            value:
                `**Joined:** <t:${Math.floor(targetUser.joinedTimestamp / 1000)}:F>\n` +
                `**Joined (Relative):** <t:${Math.floor(targetUser.joinedTimestamp / 1000)}:R>`,
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
                name: `${GLYPHS.ARROW_RIGHT} Roles [${targetUser.roles.cache.size - 1}]`,
                value: roles.join(', ') + (targetUser.roles.cache.size > 11 ? '...' : ''),
                inline: false
            });
        }
        
        // Member data from database
        if (memberData) {
            embed.addFields({
                name: `${GLYPHS.ARROW_RIGHT} Statistics`,
                value:
                    `**Join Count:** ${memberData.joinCount}\n` +
                    `**Leave Count:** ${memberData.leaveCount}\n` +
                    `**Warnings:** ${memberData.warnings.length}\n` +
                    `**Sus Level:** ${memberData.susLevel}/10\n` +
                    `**New Account:** ${memberData.isNewAccount ? 'Yes' : 'No'}\n` +
                    `**Suspicious:** ${memberData.isSuspicious ? `${GLYPHS.RADAR} Yes` : 'No'}`,
                inline: false
            });
        }
        
        embed.setThumbnail(targetUser.user.displayAvatarURL({ dynamic: true, size: 256 }));
        embed.setColor(targetUser.displayHexColor);
        
        return message.reply({ embeds: [embed] });
    }
};
