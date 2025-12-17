import { PermissionFlagsBits } from 'discord.js';
import Member from '../../models/Member.js';
import ModLog from '../../models/ModLog.js';
import Guild from '../../models/Guild.js';
import { successEmbed, errorEmbed, modLogEmbed, GLYPHS } from '../../utils/embeds.js';

export default {
    name: 'ban',
    description: 'Ban a member from the server',
    usage: '<@user|user_id> [reason]',
    aliases: ['hammer'],
    permissions: {
        user: PermissionFlagsBits.BanMembers,
        client: PermissionFlagsBits.BanMembers
    },
    cooldown: 3,
    
    async execute(message, args) {
        if (!args[0]) {
            const embed = await errorEmbed(message.guild.id, 'Invalid Usage',
                `${GLYPHS.ARROW_RIGHT} Usage: \`ban <@user|user_id> [reason]\``
            );
            return message.reply({ embeds: [embed] });
        }
        
        const userId = args[0].replace(/[<@!>]/g, '');
        const targetMember = await message.guild.members.fetch(userId).catch(() => null);
        
        if (targetMember) {
            if (!targetMember.bannable) {
                const embed = await errorEmbed(message.guild.id, 'Cannot Ban',
                    `${GLYPHS.ERROR} I cannot ban this user. They may have a higher role than me.`
                );
                return message.reply({ embeds: [embed] });
            }
            
            if (targetMember.roles.highest.position >= message.member.roles.highest.position) {
                const embed = await errorEmbed(message.guild.id, 'Permission Denied',
                    `${GLYPHS.LOCK} You cannot ban someone with equal or higher role than you.`
                );
                return message.reply({ embeds: [embed] });
            }
        }
        
        const reason = args.slice(1).join(' ') || 'No reason provided';
        
        // Get user info
        let userTag;
        try {
            const user = await message.client.users.fetch(userId);
            userTag = user.tag;
            
            // DM the user if they're in the server
            if (targetMember) {
                try {
                    const dmEmbed = await errorEmbed(message.guild.id, `Banned from ${message.guild.name}`,
                        `${GLYPHS.BAN} You have been banned from the server.\n\n` +
                        `**Reason:** ${reason}\n` +
                        `**Moderator:** ${message.author.tag}`
                    );
                    await user.send({ embeds: [dmEmbed] });
                } catch (error) {
                    // User has DMs disabled
                }
            }
        } catch (error) {
            userTag = 'Unknown User';
        }
        
        // Update member data
        if (targetMember) {
            let memberData = await Member.findOne({
                userId: targetMember.user.id,
                guildId: message.guild.id
            });
            
            if (memberData) {
                memberData.bans.push({
                    moderatorId: message.author.id,
                    reason,
                    timestamp: new Date()
                });
                await memberData.save();
            }
        }
        
        // Ban the user
        await message.guild.members.ban(userId, { reason, deleteMessageSeconds: 86400 }); // Delete 1 day of messages
        
        // Create mod log
        const caseNumber = await ModLog.getNextCaseNumber(message.guild.id);
        const guildConfig = await Guild.getGuild(message.guild.id);
        
        const logData = {
            caseNumber,
            targetTag: userTag,
            targetId: userId,
            moderatorTag: message.author.tag,
            reason
        };
        
        await ModLog.create({
            guildId: message.guild.id,
            caseNumber,
            action: 'ban',
            moderatorId: message.author.id,
            moderatorTag: message.author.tag,
            targetId: userId,
            targetTag: userTag,
            reason
        });
        
        // Send to mod log
        if (guildConfig.channels.modLog) {
            const modLogChannel = message.guild.channels.cache.get(guildConfig.channels.modLog);
            if (modLogChannel) {
                const logEmbed = await modLogEmbed(message.guild.id, 'ban', logData);
                await modLogChannel.send({ embeds: [logEmbed] });
            }
        }
        
        const embed = await successEmbed(message.guild.id, 'Member Banned',
            `${GLYPHS.ARROW_RIGHT} **${userTag}** has been banned.\n` +
            `${GLYPHS.ARROW_RIGHT} **Case #${caseNumber}**`
        );
        return message.reply({ embeds: [embed] });
    }
};
