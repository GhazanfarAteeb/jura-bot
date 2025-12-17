import { PermissionFlagsBits } from 'discord.js';
import Member from '../../models/Member.js';
import ModLog from '../../models/ModLog.js';
import Guild from '../../models/Guild.js';
import { successEmbed, errorEmbed, modLogEmbed, GLYPHS } from '../../utils/embeds.js';

export default {
  name: 'warn',
  description: 'Warn a member',
  usage: '<@user|user_id> [reason]',
  aliases: ['warning'],
  permissions: {
    user: PermissionFlagsBits.ModerateMembers,
    client: PermissionFlagsBits.ModerateMembers
  },
  cooldown: 2,

  async execute(message, args) {
    if (!args[0]) {
      const embed = await errorEmbed(message.guild.id, 'Invalid Usage',
        `${GLYPHS.ARROW_RIGHT} Usage: \`warn <@user|user_id> [reason]\``
      );
      return message.reply({ embeds: [embed] });
    }

    // Parse user
    const userId = args[0].replace(/[<@!>]/g, '');
    const targetMember = await message.guild.members.fetch(userId).catch(() => null);

    if (!targetMember) {
      const embed = await errorEmbed(message.guild.id, 'User Not Found',
        `${GLYPHS.ERROR} Could not find that user.`
      );
      return message.reply({ embeds: [embed] });
    }

    // Check hierarchy
    if (targetMember.roles.highest.position >= message.member.roles.highest.position) {
      const embed = await errorEmbed(message.guild.id, 'Permission Denied',
        `${GLYPHS.LOCK} You cannot warn someone with equal or higher role than you.`
      );
      return message.reply({ embeds: [embed] });
    }

    const reason = args.slice(1).join(' ') || 'No reason provided';

    // Add warning to member data
    let memberData = await Member.findOne({
      userId: targetMember.user.id,
      guildId: message.guild.id
    });

    if (!memberData) {
      memberData = await Member.create({
        userId: targetMember.user.id,
        guildId: message.guild.id,
        username: targetMember.user.username,
        discriminator: targetMember.user.discriminator,
        accountCreatedAt: targetMember.user.createdAt
      });
    }

    memberData.warnings.push({
      moderatorId: message.author.id,
      moderatorTag: message.author.tag,
      reason,
      timestamp: new Date()
    });
    await memberData.save();

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

    // Save to database
    await ModLog.create({
      guildId: message.guild.id,
      caseNumber,
      action: 'warn',
      moderatorId: message.author.id,
      moderatorTag: message.author.tag,
      targetId: targetMember.user.id,
      targetTag: targetMember.user.tag,
      reason
    });

    // Send to mod log channel
    if (guildConfig.channels.modLog) {
      const modLogChannel = message.guild.channels.cache.get(guildConfig.channels.modLog);
      if (modLogChannel) {
        const logEmbed = await modLogEmbed(message.guild.id, 'warn', logData);
        await modLogChannel.send({ embeds: [logEmbed] });
      }
    }

    // DM the user
    try {
      const dmEmbed = await errorEmbed(message.guild.id, `Warning in ${message.guild.name}`,
        `${GLYPHS.WARN} You have been warned.\n\n` +
        `**Reason:** ${reason}\n` +
        `**Moderator:** ${message.author.tag}\n\n` +
        `**Total Warnings:** ${memberData.warnings.length}`
      );
      await targetMember.send({ embeds: [dmEmbed] });
    } catch (error) {
      // User has DMs disabled
    }

    // Confirm to moderator
    const embed = await successEmbed(message.guild.id, 'Member Warned',
      `${GLYPHS.ARROW_RIGHT} **${targetMember.user.tag}** has been warned.\n` +
      `${GLYPHS.ARROW_RIGHT} **Case #${caseNumber}**\n` +
      `${GLYPHS.ARROW_RIGHT} **Total Warnings:** ${memberData.warnings.length}`
    );
    return message.reply({ embeds: [embed] });
  }
};
