import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import Member from '../../models/Member.js';
import ModLog from '../../models/ModLog.js';
import Guild from '../../models/Guild.js';
import { successEmbed, errorEmbed, modLogEmbed, GLYPHS } from '../../utils/embeds.js';
import logger from '../../utils/logger.js';

export default {
  name: 'timeout',
  description: 'Timeout a member (prevent them from sending messages)',
  usage: '<@user|user_id> <duration> [reason]',
  aliases: ['mute', 'to'],
  permissions: {
    user: PermissionFlagsBits.ModerateMembers,
    client: PermissionFlagsBits.ModerateMembers
  },
  cooldown: 3,

  // Slash command data
  slashCommand: true,
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Timeout a member (prevent them from sending messages)')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to timeout')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('duration')
        .setDescription('Duration (e.g., 5m, 1h, 1d, 1w)')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for the timeout')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(message, args) {
    if (!args[0]) {
      const embed = await errorEmbed(message.guild.id, 'Invalid Usage',
        `${GLYPHS.ARROW_RIGHT} Usage: \`timeout <@user|user_id> <duration> [reason]\`\n\n` +
        `**Duration Examples:**\n` +
        `${GLYPHS.DOT} \`5m\` - 5 minutes\n` +
        `${GLYPHS.DOT} \`1h\` - 1 hour\n` +
        `${GLYPHS.DOT} \`1d\` - 1 day\n` +
        `${GLYPHS.DOT} \`1w\` - 1 week\n` +
        `${GLYPHS.DOT} \`off\` - Remove timeout`
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

    // Check if target is the server owner
    if (targetMember.id === message.guild.ownerId) {
      const embed = await errorEmbed(message.guild.id, 'Cannot Timeout Owner',
        `${GLYPHS.ERROR} Cannot timeout the server owner. The owner is immune to all moderation actions.`
      );
      return message.reply({ embeds: [embed] });
    }

    if (!targetMember.moderatable) {
      // Get the bot's highest role for better error message
      const botMember = message.guild.members.me;
      const botHighestRole = botMember.roles.highest;
      const targetHighestRole = targetMember.roles.highest;
      
      // Check role hierarchy
      const isRoleIssue = targetHighestRole.position >= botHighestRole.position;
      
      // Log detailed permission info for debugging
      logger.info(`[Timeout Debug] Cannot moderate user in ${message.guild.name}`);
      logger.info(`  Target: ${targetMember.user.tag} (${targetMember.id})`);
      logger.info(`  Target highest role: ${targetHighestRole.name} (pos: ${targetHighestRole.position})`);
      logger.info(`  Target role permissions: ${targetHighestRole.permissions.bitfield}`);
      logger.info(`  Bot highest role: ${botHighestRole.name} (pos: ${botHighestRole.position})`);
      logger.info(`  Bot role permissions: ${botHighestRole.permissions.bitfield}`);
      logger.info(`  Bot has Admin: ${botMember.permissions.has('Administrator')}`);
      logger.info(`  Bot has ModerateMembers: ${botMember.permissions.has('ModerateMembers')}`);
      logger.info(`  Target is moderatable: ${targetMember.moderatable}`);
      logger.info(`  All target roles: ${targetMember.roles.cache.map(r => `${r.name}(${r.position})`).join(', ')}`);
      logger.info(`  All bot roles: ${botMember.roles.cache.map(r => `${r.name}(${r.position})`).join(', ')}`);
      
      const embed = await errorEmbed(message.guild.id, 'Cannot Timeout',
        `${GLYPHS.ERROR} I cannot timeout this user.\n\n` +
        `**Debug Info:**\n` +
        `${GLYPHS.DOT} My highest role: \`${botHighestRole.name}\` (position: ${botHighestRole.position})\n` +
        `${GLYPHS.DOT} Their highest role: \`${targetHighestRole.name}\` (position: ${targetHighestRole.position})\n` +
        `${GLYPHS.DOT} Bot has Admin: ${botMember.permissions.has('Administrator') ? 'Yes' : 'No'}\n\n` +
        `**Issue:** ${isRoleIssue ? 'Their role is higher or equal to mine. Move my role above theirs in Server Settings → Roles.' : 'Unknown - check Discord permissions.'}`
      );
      return message.reply({ embeds: [embed] });
    }

    if (targetMember.roles.highest.position >= message.member.roles.highest.position) {
      // Allow server owner and administrators to bypass role hierarchy check
      const isOwner = message.author.id === message.guild.ownerId;
      if (!isOwner && !message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        // Log for debugging
        logger.info(`[Timeout Debug] Moderator role hierarchy check failed`);
        logger.info(`  Moderator: ${message.author.tag} (${message.author.id})`);
        logger.info(`  Moderator highest role: ${message.member.roles.highest.name} (pos: ${message.member.roles.highest.position})`);
        logger.info(`  Target: ${targetMember.user.tag} (${targetMember.id})`);
        logger.info(`  Target highest role: ${targetMember.roles.highest.name} (pos: ${targetMember.roles.highest.position})`);
        logger.info(`  Moderator has Admin: ${message.member.permissions.has(PermissionFlagsBits.Administrator)}`);
        logger.info(`  Moderator is Owner: ${isOwner}`);
        
        const embed = await errorEmbed(message.guild.id, 'Permission Denied',
          `${GLYPHS.LOCK} You cannot timeout someone with equal or higher role than you.\n\n` +
          `**Debug Info:**\n` +
          `${GLYPHS.DOT} Your highest role: \`${message.member.roles.highest.name}\` (pos: ${message.member.roles.highest.position})\n` +
          `${GLYPHS.DOT} Their highest role: \`${targetMember.roles.highest.name}\` (pos: ${targetMember.roles.highest.position})\n\n` +
          `*Server owner and Administrators can bypass this check.*`
        );
        return message.reply({ embeds: [embed] });
      }
    }

    const durationArg = args[1]?.toLowerCase();

    // Handle timeout removal
    if (durationArg === 'off' || durationArg === 'remove' || durationArg === 'clear') {
      if (!targetMember.isCommunicationDisabled()) {
        const embed = await errorEmbed(message.guild.id, 'Not Timed Out',
          `${GLYPHS.ERROR} This user is not currently timed out.`
        );
        return message.reply({ embeds: [embed] });
      }

      await targetMember.timeout(null, `Timeout removed by ${message.author.tag}`);

      const embed = await successEmbed(message.guild.id, 'Timeout Removed',
        `${GLYPHS.SUCCESS} Removed timeout from ${targetMember.user.tag}`
      );
      return message.reply({ embeds: [embed] });
    }

    if (!durationArg) {
      const embed = await errorEmbed(message.guild.id, 'Missing Duration',
        `${GLYPHS.ERROR} Please specify a duration.\n\n` +
        `Examples: \`5m\`, \`1h\`, \`1d\`, \`1w\`, \`off\``
      );
      return message.reply({ embeds: [embed] });
    }

    // Parse duration
    const durationMs = parseDuration(durationArg);

    if (!durationMs) {
      const embed = await errorEmbed(message.guild.id, 'Invalid Duration',
        `${GLYPHS.ERROR} Invalid duration format.\n\n` +
        `**Valid formats:**\n` +
        `${GLYPHS.DOT} \`5m\` - 5 minutes\n` +
        `${GLYPHS.DOT} \`1h\` - 1 hour\n` +
        `${GLYPHS.DOT} \`1d\` - 1 day\n` +
        `${GLYPHS.DOT} \`1w\` - 1 week`
      );
      return message.reply({ embeds: [embed] });
    }

    // Max timeout is 28 days (Discord limit)
    const maxTimeout = 28 * 24 * 60 * 60 * 1000;
    if (durationMs > maxTimeout) {
      const embed = await errorEmbed(message.guild.id, 'Duration Too Long',
        `${GLYPHS.ERROR} Maximum timeout duration is 28 days.`
      );
      return message.reply({ embeds: [embed] });
    }

    const reason = args.slice(2).join(' ') || 'No reason provided';

    // Update member data
    let memberData = await Member.findOne({
      userId: targetMember.user.id,
      guildId: message.guild.id
    });

    if (!memberData) {
      memberData = await Member.create({
        userId: targetMember.user.id,
        guildId: message.guild.id,
        username: targetMember.user.username,
        discriminator: targetMember.user.discriminator || '0',
        accountCreatedAt: targetMember.user.createdAt
      });
    }

    memberData.mutes.push({
      moderatorId: message.author.id,
      reason,
      duration: durationMs / 1000,
      timestamp: new Date(),
      expiresAt: new Date(Date.now() + durationMs)
    });
    await memberData.save();

    // Apply timeout
    await targetMember.timeout(durationMs, reason);

    // Create mod log
    const caseNumber = await ModLog.getNextCaseNumber(message.guild.id);
    const guildConfig = await Guild.getGuild(message.guild.id);

    const logData = {
      caseNumber,
      targetTag: targetMember.user.tag,
      targetId: targetMember.user.id,
      moderatorTag: message.author.tag,
      reason,
      duration: formatDuration(durationMs)
    };

    // Save to database
    await ModLog.create({
      guildId: message.guild.id,
      caseNumber,
      action: 'timeout',
      moderatorId: message.author.id,
      moderatorTag: message.author.tag,
      targetId: targetMember.user.id,
      targetTag: targetMember.user.tag,
      reason,
      duration: durationMs / 1000
    });

    // Send to mod log channel
    if (guildConfig.channels.modLog) {
      const modLogChannel = message.guild.channels.cache.get(guildConfig.channels.modLog);
      if (modLogChannel) {
        const logEmbed = await modLogEmbed(message.guild.id, 'timeout', logData);
        await modLogChannel.send({ embeds: [logEmbed] });
      }
    }

    // DM the user
    try {
      const dmEmbed = await errorEmbed(message.guild.id, `Timed Out in ${message.guild.name}`,
        `${GLYPHS.MUTE} You have been timed out.\n\n` +
        `**Duration:** ${formatDuration(durationMs)}\n` +
        `**Reason:** ${reason}\n` +
        `**Moderator:** ${message.author.tag}\n\n` +
        `You will be able to interact again <t:${Math.floor((Date.now() + durationMs) / 1000)}:R>`
      );
      await targetMember.send({ embeds: [dmEmbed] });
    } catch (error) {
      // User has DMs disabled
    }

    const embed = await successEmbed(message.guild.id, 'Member Timed Out',
      `${GLYPHS.MUTE} **${targetMember.user.tag}** has been timed out.\n\n` +
      `**Duration:** ${formatDuration(durationMs)}\n` +
      `**Reason:** ${reason}\n` +
      `**Case:** #${caseNumber}\n` +
      `**Expires:** <t:${Math.floor((Date.now() + durationMs) / 1000)}:R>`
    );
    message.reply({ embeds: [embed] });
  }
};

function parseDuration(str) {
  const match = str.match(/^(\d+)(s|m|h|d|w)$/i);
  if (!match) return null;

  const [, num, unit] = match;
  const multipliers = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000
  };

  return parseInt(num) * multipliers[unit.toLowerCase()];
}

function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);

  if (weeks > 0) return `${weeks} week${weeks !== 1 ? 's' : ''}`;
  if (days > 0) return `${days} day${days !== 1 ? 's' : ''}`;
  if (hours > 0) return `${hours} hour${hours !== 1 ? 's' : ''}`;
  if (minutes > 0) return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  return `${seconds} second${seconds !== 1 ? 's' : ''}`;
}
