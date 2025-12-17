import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import Member from '../../models/Member.js';
import { errorEmbed } from '../../utils/embeds.js';

export default {
    name: 'userhistory',
    description: 'View user tracking history (username changes, joins, etc.)',
    usage: 'userhistory [@user|user_id]',
    category: 'moderation',
    permissions: {
        user: PermissionFlagsBits.ModerateMembers
    },
    aliases: ['history', 'trackuser', 'userlookup'],
    
    execute: async (message, args) => {
        const guildId = message.guild.id;
        
        // Get target user
        const targetUser = message.mentions.users.first() || 
                          await message.client.users.fetch(args[0]).catch(() => null) ||
                          message.author;
        
        const memberData = await Member.findOne({ userId: targetUser.id, guildId });
        
        if (!memberData) {
            return message.reply({
                embeds: [await errorEmbed(guildId, 'No tracking data found for this user.')]
            });
        }
        
        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle(`📊 User History: ${targetUser.tag}`)
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
            .setTimestamp();
        
        // Current Identity
        let identityText = `**Current Username:** ${memberData.username}`;
        if (memberData.discriminator && memberData.discriminator !== '0') {
            identityText += `#${memberData.discriminator}`;
        }
        if (memberData.displayName && memberData.displayName !== memberData.username) {
            identityText += `\n**Display Name:** ${memberData.displayName}`;
        }
        if (memberData.globalName) {
            identityText += `\n**Global Name:** ${memberData.globalName}`;
        }
        identityText += `\n**User ID:** ${targetUser.id}`;
        identityText += `\n**Account Created:** <t:${Math.floor(targetUser.createdTimestamp / 1000)}:R>`;
        
        embed.addFields({ name: '👤 Identity', value: identityText, inline: false });
        
        // Username History
        if (memberData.usernameHistory && memberData.usernameHistory.length > 0) {
            const historyText = memberData.usernameHistory
                .slice(-5) // Last 5 changes
                .reverse()
                .map(h => {
                    const name = h.discriminator && h.discriminator !== '0' 
                        ? `${h.username}#${h.discriminator}` 
                        : h.username;
                    const display = h.displayName && h.displayName !== h.username 
                        ? ` (${h.displayName})` 
                        : '';
                    return `\`${name}${display}\` - <t:${Math.floor(h.changedAt.getTime() / 1000)}:R>`;
                })
                .join('\n') || 'No username changes recorded';
            
            embed.addFields({ 
                name: `📝 Username History (Last 5 of ${memberData.usernameHistory.length})`, 
                value: historyText, 
                inline: false 
            });
        }
        
        // Join/Leave Stats
        const joinLeaveText = `**Joins:** ${memberData.joinCount}\n` +
                             `**Leaves:** ${memberData.leaveCount}\n` +
                             `**Sus Level:** ${memberData.susLevel}\n` +
                             `**Status:** ${memberData.isSuspicious ? '⚠️ Suspicious' : '✅ Normal'}`;
        
        embed.addFields({ name: '📊 Join/Leave Stats', value: joinLeaveText, inline: true });
        
        // Moderation History
        const modText = `**Warnings:** ${memberData.warnings?.length || 0}\n` +
                       `**Kicks:** ${memberData.kicks?.length || 0}\n` +
                       `**Bans:** ${memberData.bans?.length || 0}\n` +
                       `**Mutes:** ${memberData.mutes?.length || 0}`;
        
        embed.addFields({ name: '🔨 Moderation', value: modText, inline: true });
        
        // Recent Joins (Last 3)
        if (memberData.joinHistory && memberData.joinHistory.length > 0) {
            const recentJoins = memberData.joinHistory
                .slice(-3)
                .reverse()
                .map(j => {
                    let text = `<t:${Math.floor(j.timestamp.getTime() / 1000)}:F>`;
                    if (j.inviteCode) text += `\nInvite: \`${j.inviteCode}\``;
                    if (j.inviter) text += ` by <@${j.inviter}>`;
                    return text;
                })
                .join('\n\n');
            
            embed.addFields({ 
                name: `📥 Recent Joins (Last 3 of ${memberData.joinHistory.length})`, 
                value: recentJoins, 
                inline: false 
            });
        }
        
        // Flags
        if (memberData.flags) {
            const flagText = [];
            if (memberData.flags.radarOn) flagText.push('📡 On Radar');
            if (memberData.flags.verified) flagText.push('✅ Verified');
            if (memberData.flags.autoModBypass) flagText.push('🔓 AutoMod Bypass');
            if (memberData.isNewAccount) flagText.push('🥚 New Account');
            
            if (flagText.length > 0) {
                embed.addFields({ name: '🏷️ Flags', value: flagText.join('\n'), inline: false });
            }
        }
        
        // Staff Notes Count
        if (memberData.notes && memberData.notes.length > 0) {
            embed.addFields({ 
                name: '📋 Staff Notes', 
                value: `${memberData.notes.length} note(s) on file. Use \`!notes @user\` to view.`, 
                inline: false 
            });
        }
        
        embed.setFooter({ text: `Data tracked since ${memberData.createdAt.toLocaleDateString()}` });
        
        return message.reply({ embeds: [embed] });
    }
};
