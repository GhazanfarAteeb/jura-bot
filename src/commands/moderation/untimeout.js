import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import ModLog from '../../models/ModLog.js';
import Guild from '../../models/Guild.js';
import { successEmbed, errorEmbed, modLogEmbed, GLYPHS } from '../../utils/embeds.js';
import logger from '../../utils/logger.js';

export default {
  name: 'untimeout',
  description: 'Remove timeout from a member',
  usage: '<@user|user_id> [reason]',
  aliases: ['unmute', 'removetimeout', 'cleartimeout'],
  permissions: {
    user: PermissionFlagsBits.ModerateMembers,
    client: PermissionFlagsBits.ModerateMembers
  },
  cooldown: 3,

  // Slash command data
  slashCommand: true,
  data: new SlashCommandBuilder()
    .setName('untimeout')
    .setDescription('Remove timeout from a member')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to remove timeout from')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for removing the timeout')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(message, args) {
    if (!args[0]) {
      const embed = await errorEmbed(message.guild.id, 'Invalid Usage',
        `${GLYPHS.ARROW_RIGHT} Usage: \`untimeout <@user|user_id> [reason]\`\n\n` +
        `**Examples:**\n` +
        `${GLYPHS.DOT} \`!untimeout @User\`\n` +
        `${GLYPHS.DOT} \`!unmute @User Appeal accepted\``
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

    // Check if target is the server owner (owners can't be timed out anyway)
    if (targetMember.id === message.guild.ownerId) {
      const embed = await errorEmbed(message.guild.id, 'Cannot Modify Owner',
        `${GLYPHS.ERROR} The server owner cannot be timed out or have timeouts removed.`
      );
      return message.reply({ embeds: [embed] });
    }

    if (!targetMember.moderatable) {
      const botMember = message.guild.members.me;
      const isRoleIssue = targetMember.roles.highest.position >= botMember.roles.highest.position;
      
      // Log detailed permission info for debugging
      logger.warn(`[Untimeout Debug] Cannot modify user in ${message.guild.name}`);
      logger.warn(`  Target: ${targetMember.user.tag} (${targetMember.id})`);
      logger.warn(`  Target highest role: ${targetMember.roles.highest.name} (pos: ${targetMember.roles.highest.position})`);
      logger.warn(`  Target role permissions: ${targetMember.roles.highest.permissions.bitfield}`);
      logger.warn(`  Bot highest role: ${botMember.roles.highest.name} (pos: ${botMember.roles.highest.position})`);
      logger.warn(`  Bot role permissions: ${botMember.roles.highest.permissions.bitfield}`);
      logger.warn(`  Bot has Admin: ${botMember.permissions.has('Administrator')}`);
      logger.warn(`  Bot has ModerateMembers: ${botMember.permissions.has('ModerateMembers')}`);
      logger.warn(`  Target is moderatable: ${targetMember.moderatable}`);
      logger.warn(`  All target roles: ${targetMember.roles.cache.map(r => `${r.name}(${r.position})`).join(', ')}`);
      logger.warn(`  All bot roles: ${botMember.roles.cache.map(r => `${r.name}(${r.position})`).join(', ')}`);
      
      const embed = await errorEmbed(message.guild.id, 'Cannot Modify',
        `${GLYPHS.ERROR} I cannot modify this user.\n\n` +
        `**Debug Info:**\n` +
        `${GLYPHS.DOT} My highest role: \`${botMember.roles.highest.name}\` (pos: ${botMember.roles.highest.position})\n` +
        `${GLYPHS.DOT} Their highest role: \`${targetMember.roles.highest.name}\` (pos: ${targetMember.roles.highest.position})\n` +
        `${GLYPHS.DOT} Bot has Admin: ${botMember.permissions.has('Administrator') ? 'Yes' : 'No'}\n\n` +
        `**Issue:** ${isRoleIssue ? 'Their role is higher or equal to mine.' : 'Unknown - check Discord permissions.'}`
      );
      return message.reply({ embeds: [embed] });
    }

    // Check if user is actually timed out
    if (!targetMember.isCommunicationDisabled()) {
      const embed = await errorEmbed(message.guild.id, 'Not Timed Out',
        `${GLYPHS.ERROR} ${targetMember.user.tag} is not currently timed out.`
      );
      return message.reply({ embeds: [embed] });
    }

    const reason = args.slice(1).join(' ') || 'No reason provided';

    try {
      // Remove the timeout
      await targetMember.timeout(null, `${reason} | Removed by ${message.author.tag}`);

      // Log to mod log channel
      const guildConfig = await Guild.getGuild(message.guild.id, message.guild.name);
      const modLogChannel = guildConfig.channels?.modLogChannel;

      // Get next case number
      const caseNumber = await ModLog.getNextCaseNumber(message.guild.id);

      if (modLogChannel) {
        const logChannel = message.guild.channels.cache.get(modLogChannel);
        if (logChannel) {
          const logEmbed = await modLogEmbed(message.guild.id, 'untimeout', {
            caseNumber,
            moderatorTag: message.author.tag,
            targetTag: targetMember.user.tag,
            targetId: targetMember.id,
            reason: reason
          });
          logEmbed.setColor(0x57F287); // Green for removal
          await logChannel.send({ embeds: [logEmbed] }).catch(() => { });
        }
      }

      // Create mod log entry
      await ModLog.create({
        guildId: message.guild.id,
        caseNumber,
        moderatorId: message.author.id,
        moderatorTag: message.author.tag,
        targetId: targetMember.id,
        targetTag: targetMember.user.tag,
        action: 'untimeout',
        reason: reason
      });

      // Try to DM the user
      try {
        const dmEmbed = await successEmbed(message.guild.id, '🔔 Timeout Removed',
          `Your timeout in **${message.guild.name}** has been removed.\n\n` +
          `**Reason:** ${reason}\n` +
          `**Removed by:** ${message.author.tag}`
        );
        await targetMember.send({ embeds: [dmEmbed] });
      } catch (err) {
        // User has DMs disabled
      }

      const embed = await successEmbed(message.guild.id, '🔔 Timeout Removed',
        `${GLYPHS.SUCCESS} Successfully removed timeout from **${targetMember.user.tag}**\n\n` +
        `**Reason:** ${reason}`
      );
      return message.reply({ embeds: [embed] });

    } catch (error) {
      console.error('Error removing timeout:', error);
      const embed = await errorEmbed(message.guild.id, 'Error',
        `${GLYPHS.ERROR} Failed to remove timeout. Please try again.`
      );
      return message.reply({ embeds: [embed] });
    }
  },

  // Slash command execution
  async executeSlash(interaction) {
    // Force fetch member for fresh data
    const userId = interaction.options.getUser('user')?.id;
    const targetMember = userId 
      ? await interaction.guild.members.fetch({ user: userId, force: true }).catch(() => null)
      : null;
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (!targetMember) {
      const embed = await errorEmbed(interaction.guild.id, 'User Not Found',
        `${GLYPHS.ERROR} Could not find that user in this server.`
      );
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (!targetMember.moderatable) {
      const botMember = interaction.guild.members.me;
      const embed = await errorEmbed(interaction.guild.id, 'Cannot Modify',
        `${GLYPHS.ERROR} I cannot modify this user.\n\n` +
        `**Possible reasons:**\n` +
        `${GLYPHS.DOT} My highest role: \`${botMember.roles.highest.name}\` (pos: ${botMember.roles.highest.position})\n` +
        `${GLYPHS.DOT} Their highest role: \`${targetMember.roles.highest.name}\` (pos: ${targetMember.roles.highest.position})`
      );
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // Check if user is actually timed out
    if (!targetMember.isCommunicationDisabled()) {
      const embed = await errorEmbed(interaction.guild.id, 'Not Timed Out',
        `${GLYPHS.ERROR} ${targetMember.user.tag} is not currently timed out.`
      );
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    try {
      // Remove the timeout
      await targetMember.timeout(null, `${reason} | Removed by ${interaction.user.tag}`);

      // Log to mod log channel
      const guildConfig = await Guild.getGuild(interaction.guild.id, interaction.guild.name);
      const modLogChannel = guildConfig.channels?.modLogChannel;

      // Get next case number
      const caseNumber = await ModLog.getNextCaseNumber(interaction.guild.id);

      if (modLogChannel) {
        const logChannel = interaction.guild.channels.cache.get(modLogChannel);
        if (logChannel) {
          const logEmbed = await modLogEmbed(interaction.guild.id, 'untimeout', {
            caseNumber,
            moderatorTag: interaction.user.tag,
            targetTag: targetMember.user.tag,
            targetId: targetMember.id,
            reason: reason
          });
          logEmbed.setColor(0x57F287);
          await logChannel.send({ embeds: [logEmbed] }).catch(() => { });
        }
      }

      // Create mod log entry
      await ModLog.create({
        guildId: interaction.guild.id,
        caseNumber,
        moderatorId: interaction.user.id,
        moderatorTag: interaction.user.tag,
        targetId: targetMember.id,
        targetTag: targetMember.user.tag,
        action: 'untimeout',
        reason: reason
      });

      // Try to DM the user
      try {
        const dmEmbed = await successEmbed(interaction.guild.id, '🔔 Timeout Removed',
          `Your timeout in **${interaction.guild.name}** has been removed.\n\n` +
          `**Reason:** ${reason}\n` +
          `**Removed by:** ${interaction.user.tag}`
        );
        await targetMember.send({ embeds: [dmEmbed] });
      } catch (err) {
        // User has DMs disabled
      }

      const embed = await successEmbed(interaction.guild.id, '🔔 Timeout Removed',
        `${GLYPHS.SUCCESS} Successfully removed timeout from **${targetMember.user.tag}**\n\n` +
        `**Reason:** ${reason}`
      );
      return interaction.reply({ embeds: [embed] });

    } catch (error) {
      console.error('Error removing timeout:', error);
      const embed = await errorEmbed(interaction.guild.id, 'Error',
        `${GLYPHS.ERROR} Failed to remove timeout. Please try again.`
      );
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
  }
};
