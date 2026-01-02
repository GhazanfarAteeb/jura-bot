import { PermissionFlagsBits } from 'discord.js';
import Member from '../../models/Member.js';
import ModLog from '../../models/ModLog.js';
import Guild from '../../models/Guild.js';
import { successEmbed, errorEmbed, modLogEmbed, GLYPHS } from '../../utils/embeds.js';
import logger from '../../utils/logger.js';

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
    // Force fetch to bypass cache and get fresh member data
    const targetMember = await message.guild.members.fetch({ user: userId, force: true }).catch(() => null);

    // Check if trying to ban the server owner
    if (userId === message.guild.ownerId) {
      const embed = await errorEmbed(message.guild.id, 'Cannot Ban Owner',
        `${GLYPHS.ERROR} Cannot ban the server owner. The owner is immune to all moderation actions.`
      );
      return message.reply({ embeds: [embed] });
    }

    if (targetMember) {
      if (!targetMember.bannable) {
        const botMember = message.guild.members.me;
        const isRoleIssue = targetMember.roles.highest.position >= botMember.roles.highest.position;
        
        // Log detailed permission info for debugging
        logger.info(`[Ban Debug] Cannot ban user in ${message.guild.name}`);
        logger.info(`  Target: ${targetMember.user.tag} (${targetMember.id})`);
        logger.info(`  Target highest role: ${targetMember.roles.highest.name} (pos: ${targetMember.roles.highest.position})`);
        logger.info(`  Target role permissions: ${targetMember.roles.highest.permissions.bitfield}`);
        logger.info(`  Bot highest role: ${botMember.roles.highest.name} (pos: ${botMember.roles.highest.position})`);
        logger.info(`  Bot role permissions: ${botMember.roles.highest.permissions.bitfield}`);
        logger.info(`  Bot has Admin: ${botMember.permissions.has('Administrator')}`);
        logger.info(`  Bot has BanMembers: ${botMember.permissions.has('BanMembers')}`);
        logger.info(`  Target is bannable: ${targetMember.bannable}`);
        logger.info(`  All target roles: ${targetMember.roles.cache.map(r => `${r.name}(${r.position})`).join(', ')}`);
        logger.info(`  All bot roles: ${botMember.roles.cache.map(r => `${r.name}(${r.position})`).join(', ')}`);
        
        const embed = await errorEmbed(message.guild.id, 'Cannot Ban',
          `${GLYPHS.ERROR} I cannot ban this user.\n\n` +
          `**Debug Info:**\n` +
          `${GLYPHS.DOT} My highest role: \`${botMember.roles.highest.name}\` (pos: ${botMember.roles.highest.position})\n` +
          `${GLYPHS.DOT} Their highest role: \`${targetMember.roles.highest.name}\` (pos: ${targetMember.roles.highest.position})\n` +
          `${GLYPHS.DOT} Bot has Admin: ${botMember.permissions.has('Administrator') ? 'Yes' : 'No'}\n\n` +
          `**Issue:** ${isRoleIssue ? 'Their role is higher or equal to mine.' : 'Unknown - check Discord permissions.'}`
        );
        return message.reply({ embeds: [embed] });
      }

      if (targetMember.roles.highest.position >= message.member.roles.highest.position) {
        // Allow server owner and administrators to bypass role hierarchy check
        const isOwner = message.author.id === message.guild.ownerId;
        if (!isOwner && !message.member.permissions.has(PermissionFlagsBits.Administrator)) {
          logger.info(`[Ban Debug] Moderator role hierarchy check failed`);
          logger.info(`  Moderator: ${message.author.tag} - highest role: ${message.member.roles.highest.name} (pos: ${message.member.roles.highest.position})`);
          logger.info(`  Target: ${targetMember.user.tag} - highest role: ${targetMember.roles.highest.name} (pos: ${targetMember.roles.highest.position})`);
          logger.info(`  Moderator is Owner: ${isOwner}`);
          
          const embed = await errorEmbed(message.guild.id, 'Permission Denied',
            `${GLYPHS.LOCK} You cannot ban someone with equal or higher role than you.\n\n` +
            `**Debug Info:**\n` +
            `${GLYPHS.DOT} Your highest role: \`${message.member.roles.highest.name}\` (pos: ${message.member.roles.highest.position})\n` +
            `${GLYPHS.DOT} Their highest role: \`${targetMember.roles.highest.name}\` (pos: ${targetMember.roles.highest.position})\n\n` +
            `*Server owner and Administrators can bypass this check.*`
          );
          return message.reply({ embeds: [embed] });
        }
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
          const dmEmbed = await errorEmbed(message.guild.id, `Expulsion Notice`,
            `**Notice:** You have been permanently expelled from **${message.guild.name}**.\n\n` +
            `▸ **Justification:** ${reason}\n` +
            `▸ **Authorized by:** ${message.author.tag}\n\n` +
            `*This decision is final.*`
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

    const embed = await successEmbed(message.guild.id, 'Expulsion Executed',
      `**Notice:** Disciplinary action has been executed, Master.\n\n` +
      `▸ **Subject:** ${userTag}\n` +
      `▸ **Action:** Permanent Expulsion\n` +
      `▸ **Case Reference:** #${caseNumber}`
    );
    return message.reply({ embeds: [embed] });
  }
};
