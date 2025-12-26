import { PermissionFlagsBits } from 'discord.js';
import Member from '../../models/Member.js';
import ModLog from '../../models/ModLog.js';
import Guild from '../../models/Guild.js';
import { successEmbed, errorEmbed, modLogEmbed, GLYPHS } from '../../utils/embeds.js';
import logger from '../../utils/logger.js';

export default {
  name: 'kick',
  description: 'Kick a member from the server',
  usage: '<@user|user_id> [reason]',
  aliases: ['boot'],
  permissions: {
    user: PermissionFlagsBits.KickMembers,
    client: PermissionFlagsBits.KickMembers
  },
  cooldown: 3,

  async execute(message, args) {
    if (!args[0]) {
      const embed = await errorEmbed(message.guild.id, 'Invalid Usage',
        `${GLYPHS.ARROW_RIGHT} Usage: \`kick <@user|user_id> [reason]\``
      );
      return message.reply({ embeds: [embed] });
    }

    const userId = args[0].replace(/[<@!>]/g, '');
    // Force fetch to bypass cache and get fresh member data
    const targetMember = await message.guild.members.fetch({ user: userId, force: true }).catch(() => null);

    if (!targetMember) {
      const embed = await errorEmbed(message.guild.id, 'User Not Found',
        `${GLYPHS.ERROR} Could not find that user.`
      );
      return message.reply({ embeds: [embed] });
    }

    // Check if trying to kick the server owner
    if (targetMember.id === message.guild.ownerId) {
      const embed = await errorEmbed(message.guild.id, 'Cannot Kick Owner',
        `${GLYPHS.ERROR} Cannot kick the server owner. The owner is immune to all moderation actions.`
      );
      return message.reply({ embeds: [embed] });
    }

    if (!targetMember.kickable) {
      const botMember = message.guild.members.me;
      const isRoleIssue = targetMember.roles.highest.position >= botMember.roles.highest.position;
      
      // Log detailed permission info for debugging
      logger.warn(`[Kick Debug] Cannot kick user in ${message.guild.name}`);
      logger.warn(`  Target: ${targetMember.user.tag} (${targetMember.id})`);
      logger.warn(`  Target highest role: ${targetMember.roles.highest.name} (pos: ${targetMember.roles.highest.position})`);
      logger.warn(`  Target role permissions: ${targetMember.roles.highest.permissions.bitfield}`);
      logger.warn(`  Bot highest role: ${botMember.roles.highest.name} (pos: ${botMember.roles.highest.position})`);
      logger.warn(`  Bot role permissions: ${botMember.roles.highest.permissions.bitfield}`);
      logger.warn(`  Bot has Admin: ${botMember.permissions.has('Administrator')}`);
      logger.warn(`  Bot has KickMembers: ${botMember.permissions.has('KickMembers')}`);
      logger.warn(`  Target is kickable: ${targetMember.kickable}`);
      logger.warn(`  All target roles: ${targetMember.roles.cache.map(r => `${r.name}(${r.position})`).join(', ')}`);
      logger.warn(`  All bot roles: ${botMember.roles.cache.map(r => `${r.name}(${r.position})`).join(', ')}`);
      
      const embed = await errorEmbed(message.guild.id, 'Cannot Kick',
        `${GLYPHS.ERROR} I cannot kick this user.\n\n` +
        `**Debug Info:**\n` +
        `${GLYPHS.DOT} My highest role: \`${botMember.roles.highest.name}\` (pos: ${botMember.roles.highest.position})\n` +
        `${GLYPHS.DOT} Their highest role: \`${targetMember.roles.highest.name}\` (pos: ${targetMember.roles.highest.position})\n` +
        `${GLYPHS.DOT} Bot has Admin: ${botMember.permissions.has('Administrator') ? 'Yes' : 'No'}\n\n` +
        `**Issue:** ${isRoleIssue ? 'Their role is higher or equal to mine.' : 'Unknown - check Discord permissions.'}`
      );
      return message.reply({ embeds: [embed] });
    }

    if (targetMember.roles.highest.position >= message.member.roles.highest.position) {
      const embed = await errorEmbed(message.guild.id, 'Permission Denied',
        `${GLYPHS.LOCK} You cannot kick someone with equal or higher role than you.`
      );
      return message.reply({ embeds: [embed] });
    }

    const reason = args.slice(1).join(' ') || 'No reason provided';

    // Update member data
    let memberData = await Member.findOne({
      userId: targetMember.user.id,
      guildId: message.guild.id
    });

    if (memberData) {
      memberData.kicks.push({
        moderatorId: message.author.id,
        reason,
        timestamp: new Date()
      });
      await memberData.save();
    }

    // Create mod log
    const caseNumber = await ModLog.getNextCaseNumber(message.guild.id);
    const guildConfig = await Guild.getGuild(message.guild.id);

    const logData = {
      caseNumber,
      targetTag: targetMember.user.tag,
      targetId: targetMember.user.id,
      moderatorTag: message.author.tag,
      reason
    };

    await ModLog.create({
      guildId: message.guild.id,
      caseNumber,
      action: 'kick',
      moderatorId: message.author.id,
      moderatorTag: message.author.tag,
      targetId: targetMember.user.id,
      targetTag: targetMember.user.tag,
      reason
    });

    // DM the user
    try {
      const dmEmbed = await errorEmbed(message.guild.id, `Kicked from ${message.guild.name}`,
        `${GLYPHS.KICK} You have been kicked from the server.\n\n` +
        `**Reason:** ${reason}\n` +
        `**Moderator:** ${message.author.tag}`
      );
      await targetMember.send({ embeds: [dmEmbed] });
    } catch (error) {
      // User has DMs disabled
    }

    // Kick the member
    await targetMember.kick(reason);

    // Send to mod log
    if (guildConfig.channels.modLog) {
      const modLogChannel = message.guild.channels.cache.get(guildConfig.channels.modLog);
      if (modLogChannel) {
        const logEmbed = await modLogEmbed(message.guild.id, 'kick', logData);
        await modLogChannel.send({ embeds: [logEmbed] });
      }
    }

    const embed = await successEmbed(message.guild.id, 'Member Kicked',
      `${GLYPHS.ARROW_RIGHT} **${targetMember.user.tag}** has been kicked.\n` +
      `${GLYPHS.ARROW_RIGHT} **Case #${caseNumber}**`
    );
    return message.reply({ embeds: [embed] });
  }
};
