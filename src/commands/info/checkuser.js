import Member from '../../models/Member.js';
import { infoEmbed, GLYPHS } from '../../utils/embeds.js';
import { isStaff } from '../../utils/helpers.js';

export default {
    name: 'checkuser',
    description: 'Check a user for suspicious activity',
    usage: '<@user|user_id>',
    aliases: ['check', 'scan', 'inspect'],
    cooldown: 3,
    
    async execute(message, args) {
        // Restrict to staff
        if (!await isStaff(message.member, message.guild.id)) {
            const { errorEmbed } = await import('../../utils/embeds.js');
            const embed = await errorEmbed(message.guild.id, 'Permission Denied',
                `${GLYPHS.LOCK} Only staff members can use this command.`
            );
            return message.reply({ embeds: [embed] });
        }
        
        if (!args[0]) {
            const { errorEmbed } = await import('../../utils/embeds.js');
            const embed = await errorEmbed(message.guild.id, 'Invalid Usage',
                `${GLYPHS.ARROW_RIGHT} Usage: \`checkuser <@user|user_id>\``
            );
            return message.reply({ embeds: [embed] });
        }
        
        const userId = args[0].replace(/[<@!>]/g, '');
        const targetMember = await message.guild.members.fetch(userId).catch(() => null);
        
        if (!targetMember) {
            const { errorEmbed } = await import('../../utils/embeds.js');
            const embed = await errorEmbed(message.guild.id, 'User Not Found',
                `${GLYPHS.ERROR} Could not find that user.`
            );
            return message.reply({ embeds: [embed] });
        }
        
        // Get member data
        const memberData = await Member.findOne({
            userId: targetMember.user.id,
            guildId: message.guild.id
        });
        
        if (!memberData) {
            const { warningEmbed } = await import('../../utils/embeds.js');
            const embed = await warningEmbed(message.guild.id, 'No Data',
                `${GLYPHS.WARNING} No data found for this user.`
            );
            return message.reply({ embeds: [embed] });
        }
        
        // Recalculate sus level
        memberData.calculateSusLevel();
        await memberData.save();
        
        const embed = await infoEmbed(message.guild.id, 
            `${GLYPHS.RADAR} User Security Check`,
            `Detailed analysis of **${targetMember.user.tag}**`
        );
        
        // Account info
        const accountAge = (Date.now() - targetMember.user.createdTimestamp) / (1000 * 60 * 60);
        embed.addFields({
            name: `${GLYPHS.ARROW_RIGHT} Account Information`,
            value:
                `**Username:** ${targetMember.user.tag}\n` +
                `**ID:** \`${targetMember.user.id}\`\n` +
                `**Created:** <t:${Math.floor(targetMember.user.createdTimestamp / 1000)}:R>\n` +
                `**Age:** ${accountAge.toFixed(0)} hours (${(accountAge / 24).toFixed(1)} days)\n` +
                `**New Account:** ${memberData.isNewAccount ? `${GLYPHS.EGG} Yes` : 'No'}`,
            inline: false
        });
        
        // Sus analysis
        const susEmoji = memberData.susLevel >= 7 ? '🔴' : memberData.susLevel >= 4 ? '🟡' : '🟢';
        embed.addFields({
            name: `${GLYPHS.ARROW_RIGHT} Suspicious Activity Analysis`,
            value:
                `**Sus Level:** ${susEmoji} **${memberData.susLevel}**/10\n` +
                `**Status:** ${memberData.isSuspicious ? `${GLYPHS.RADAR} **SUSPICIOUS**` : '✅ Normal'}\n` +
                `**Join Count:** ${memberData.joinCount}\n` +
                `**Leave Count:** ${memberData.leaveCount}\n` +
                `**Radar Flag:** ${memberData.flags.radarOn ? '🚨 ON' : 'Off'}`,
            inline: false
        });
        
        // Join history
        if (memberData.joinHistory.length > 0) {
            const recentJoins = memberData.joinHistory.slice(-5).reverse();
            const joinsText = recentJoins.map((j, i) => 
                `${GLYPHS.DOT} <t:${Math.floor(j.timestamp.getTime() / 1000)}:R>${j.inviteCode ? ` (invite: \`${j.inviteCode}\`)` : ''}`
            ).join('\n');
            
            embed.addFields({
                name: `${GLYPHS.ARROW_RIGHT} Recent Joins`,
                value: joinsText,
                inline: false
            });
        }
        
        // Moderation history
        const modActions = [];
        if (memberData.warnings.length > 0) modActions.push(`**Warnings:** ${memberData.warnings.length}`);
        if (memberData.kicks.length > 0) modActions.push(`**Kicks:** ${memberData.kicks.length}`);
        if (memberData.bans.length > 0) modActions.push(`**Bans:** ${memberData.bans.length}`);
        if (memberData.mutes.length > 0) modActions.push(`**Mutes:** ${memberData.mutes.length}`);
        
        if (modActions.length > 0) {
            embed.addFields({
                name: `${GLYPHS.ARROW_RIGHT} Moderation History`,
                value: modActions.join('\n'),
                inline: false
            });
        }
        
        // Invite links posted
        if (memberData.inviteLinks.length > 0) {
            embed.addFields({
                name: `${GLYPHS.WARNING} Invite Links Posted`,
                value: `**Count:** ${memberData.inviteLinks.length}\n` +
                       `**Last:** <t:${Math.floor(memberData.inviteLinks[memberData.inviteLinks.length - 1].timestamp.getTime() / 1000)}:R>`,
                inline: false
            });
        }
        
        // Risk assessment
        let riskLevel = 'Low';
        let riskColor = '🟢';
        if (memberData.susLevel >= 7 || memberData.warnings.length >= 3) {
            riskLevel = 'High';
            riskColor = '🔴';
        } else if (memberData.susLevel >= 4 || memberData.warnings.length >= 1) {
            riskLevel = 'Medium';
            riskColor = '🟡';
        }
        
        embed.addFields({
            name: `${GLYPHS.SHIELD} Risk Assessment`,
            value: `${riskColor} **${riskLevel} Risk**`,
            inline: false
        });
        
        embed.setThumbnail(targetMember.user.displayAvatarURL({ dynamic: true }));
        
        // Set color based on risk
        if (riskLevel === 'High') embed.setColor('#ff0000');
        else if (riskLevel === 'Medium') embed.setColor('#ffaa00');
        else embed.setColor('#00ff00');
        
        return message.reply({ embeds: [embed] });
    }
};
