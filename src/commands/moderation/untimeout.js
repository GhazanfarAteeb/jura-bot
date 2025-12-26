import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import ModLog from '../../models/ModLog.js';
import Guild from '../../models/Guild.js';
import { successEmbed, errorEmbed, modLogEmbed, GLYPHS } from '../../utils/embeds.js';

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
    const targetMember = await message.guild.members.fetch(userId).catch(() => null);

    if (!targetMember) {
      const embed = await errorEmbed(message.guild.id, 'User Not Found',
        `${GLYPHS.ERROR} Could not find that user.`
      );
      return message.reply({ embeds: [embed] });
    }

    if (!targetMember.moderatable) {
      const embed = await errorEmbed(message.guild.id, 'Cannot Modify',
        `${GLYPHS.ERROR} I cannot modify this user. They may have a higher role than me.`
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

      if (modLogChannel) {
        const logChannel = message.guild.channels.cache.get(modLogChannel);
        if (logChannel) {
          const logEmbed = await modLogEmbed(message.guild.id, {
            action: 'UNTIMEOUT',
            moderator: message.author,
            target: targetMember.user,
            reason: reason
          });
          logEmbed.setColor(0x57F287); // Green for removal
          await logChannel.send({ embeds: [logEmbed] }).catch(() => {});
        }
      }

      // Create mod log entry
      await ModLog.create({
        guildId: message.guild.id,
        moderatorId: message.author.id,
        moderatorTag: message.author.tag,
        targetId: targetMember.id,
        targetTag: targetMember.user.tag,
        action: 'UNTIMEOUT',
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
    const targetMember = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (!targetMember) {
      const embed = await errorEmbed(interaction.guild.id, 'User Not Found',
        `${GLYPHS.ERROR} Could not find that user in this server.`
      );
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (!targetMember.moderatable) {
      const embed = await errorEmbed(interaction.guild.id, 'Cannot Modify',
        `${GLYPHS.ERROR} I cannot modify this user. They may have a higher role than me.`
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

      if (modLogChannel) {
        const logChannel = interaction.guild.channels.cache.get(modLogChannel);
        if (logChannel) {
          const logEmbed = await modLogEmbed(interaction.guild.id, {
            action: 'UNTIMEOUT',
            moderator: interaction.user,
            target: targetMember.user,
            reason: reason
          });
          logEmbed.setColor(0x57F287);
          await logChannel.send({ embeds: [logEmbed] }).catch(() => {});
        }
      }

      // Create mod log entry
      await ModLog.create({
        guildId: interaction.guild.id,
        moderatorId: interaction.user.id,
        moderatorTag: interaction.user.tag,
        targetId: targetMember.id,
        targetTag: targetMember.user.tag,
        action: 'UNTIMEOUT',
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
