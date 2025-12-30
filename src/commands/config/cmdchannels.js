import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import Guild from '../../models/Guild.js';
import { successEmbed, errorEmbed, infoEmbed, GLYPHS } from '../../utils/embeds.js';
import { getPrefix } from '../../utils/helpers.js';

export default {
  name: 'cmdchannels',
  description: 'Restrict bot commands to specific channels',
  usage: '<enable|disable|add|remove|bypass|list> [options]',
  aliases: ['commandchannels', 'allowedchannels', 'botchannels'],
  category: 'config',
  permissions: [PermissionFlagsBits.ManageGuild],
  cooldown: 3,

  async execute(message, args, client) {
    const prefix = await getPrefix(message.guild.id);
    const guildConfig = await Guild.getGuild(message.guild.id, message.guild.name);

    // Initialize if not exists
    if (!guildConfig.commandChannels) {
      guildConfig.commandChannels = {
        enabled: false,
        channels: [],
        bypassRoles: []
      };
    }

    const subcommand = args[0]?.toLowerCase();

    if (!subcommand) {
      const embed = new EmbedBuilder()
        .setTitle('📢 Command Channel Restrictions')
        .setColor(guildConfig.embedStyle?.color || '#5865F2')
        .setDescription('Restrict bot commands to only work in specific channels.')
        .addFields(
          { name: `${prefix}cmdchannels enable`, value: 'Enable channel restrictions', inline: true },
          { name: `${prefix}cmdchannels disable`, value: 'Disable restrictions', inline: true },
          { name: `${prefix}cmdchannels add #channel`, value: 'Add allowed channel', inline: true },
          { name: `${prefix}cmdchannels remove #channel`, value: 'Remove channel', inline: true },
          { name: `${prefix}cmdchannels bypass add @role`, value: 'Add bypass role', inline: true },
          { name: `${prefix}cmdchannels bypass remove @role`, value: 'Remove bypass role', inline: true },
          { name: `${prefix}cmdchannels list`, value: 'View current settings', inline: true }
        )
        .setFooter({ text: `Status: ${guildConfig.commandChannels.enabled ? '✅ Enabled' : '❌ Disabled'}` });

      return message.reply({ embeds: [embed] });
    }

    switch (subcommand) {
      case 'enable': {
        if (guildConfig.commandChannels.channels.length === 0) {
          const embed = await errorEmbed(message.guild.id, 'No Channels Added',
            `${GLYPHS.ERROR} Please add at least one channel first!\n\n**Usage:** \`${prefix}cmdchannels add #channel\``
          );
          return message.reply({ embeds: [embed] });
        }

        await Guild.updateGuild(message.guild.id, { $set: { 'commandChannels.enabled': true } });

        const embed = await successEmbed(message.guild.id, 'Channel Restrictions Enabled',
          `${GLYPHS.SUCCESS} Bot commands will now only work in the allowed channels.\n\n**Allowed Channels:** ${guildConfig.commandChannels.channels.length}\n**Bypass Roles:** ${guildConfig.commandChannels.bypassRoles.length}`
        );
        return message.reply({ embeds: [embed] });
      }

      case 'disable': {
        await Guild.updateGuild(message.guild.id, { $set: { 'commandChannels.enabled': false } });

        const embed = await successEmbed(message.guild.id, 'Channel Restrictions Disabled',
          `${GLYPHS.SUCCESS} Bot commands can now be used in any channel.`
        );
        return message.reply({ embeds: [embed] });
      }

      case 'add': {
        const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[1]);

        if (!channel) {
          const embed = await errorEmbed(message.guild.id, 'Channel Not Found',
            `${GLYPHS.ERROR} Please mention a valid channel!\n\n**Usage:** \`${prefix}cmdchannels add #channel\``
          );
          return message.reply({ embeds: [embed] });
        }

        if (!channel.isTextBased()) {
          const embed = await errorEmbed(message.guild.id, 'Invalid Channel Type',
            `${GLYPHS.ERROR} Please select a text channel!`
          );
          return message.reply({ embeds: [embed] });
        }

        if (guildConfig.commandChannels.channels.includes(channel.id)) {
          const embed = await errorEmbed(message.guild.id, 'Already Added',
            `${GLYPHS.ERROR} ${channel} is already in the allowed channels list!`
          );
          return message.reply({ embeds: [embed] });
        }

        await Guild.updateGuild(message.guild.id, { $push: { 'commandChannels.channels': channel.id } });

        const embed = await successEmbed(message.guild.id, 'Channel Added',
          `${GLYPHS.SUCCESS} ${channel} has been added to allowed channels!\n\n**Total Channels:** ${guildConfig.commandChannels.channels.length + 1}`
        );
        return message.reply({ embeds: [embed] });
      }

      case 'remove': {
        const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[1]);

        if (!channel) {
          const embed = await errorEmbed(message.guild.id, 'Channel Not Found',
            `${GLYPHS.ERROR} Please mention a valid channel!\n\n**Usage:** \`${prefix}cmdchannels remove #channel\``
          );
          return message.reply({ embeds: [embed] });
        }

        const index = guildConfig.commandChannels.channels.indexOf(channel.id);
        if (index === -1) {
          const embed = await errorEmbed(message.guild.id, 'Not Found',
            `${GLYPHS.ERROR} ${channel} is not in the allowed channels list!`
          );
          return message.reply({ embeds: [embed] });
        }

        await Guild.updateGuild(message.guild.id, { $pull: { 'commandChannels.channels': channel.id } });

        const embed = await successEmbed(message.guild.id, 'Channel Removed',
          `${GLYPHS.SUCCESS} ${channel} has been removed from allowed channels.\n\n**Remaining Channels:** ${guildConfig.commandChannels.channels.length - 1}`
        );
        return message.reply({ embeds: [embed] });
      }

      case 'bypass': {
        const action = args[1]?.toLowerCase();
        const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[2]);

        if (!action || !['add', 'remove', 'list'].includes(action)) {
          const embed = await errorEmbed(message.guild.id, 'Invalid Action',
            `${GLYPHS.ERROR} Valid actions: \`add\`, \`remove\`, \`list\`\n\n**Usage:** \`${prefix}cmdchannels bypass add @role\``
          );
          return message.reply({ embeds: [embed] });
        }

        if (action === 'list') {
          if (guildConfig.commandChannels.bypassRoles.length === 0) {
            const embed = await infoEmbed(message.guild.id, 'No Bypass Roles',
              `${GLYPHS.INFO} No roles can bypass channel restrictions.`
            );
            return message.reply({ embeds: [embed] });
          }

          const rolesList = guildConfig.commandChannels.bypassRoles
            .map(id => {
              const r = message.guild.roles.cache.get(id);
              return r ? r.toString() : `Unknown (${id})`;
            })
            .join('\n');

          const embed = new EmbedBuilder()
            .setTitle('🔓 Bypass Roles')
            .setColor(guildConfig.embedStyle?.color || '#5865F2')
            .setDescription(rolesList);

          return message.reply({ embeds: [embed] });
        }

        if (!role) {
          const embed = await errorEmbed(message.guild.id, 'Role Not Found',
            `${GLYPHS.ERROR} Please mention a valid role!\n\n**Usage:** \`${prefix}cmdchannels bypass ${action} @role\``
          );
          return message.reply({ embeds: [embed] });
        }

        if (action === 'add') {
          if (guildConfig.commandChannels.bypassRoles.includes(role.id)) {
            const embed = await errorEmbed(message.guild.id, 'Already Added',
              `${GLYPHS.ERROR} ${role} already bypasses channel restrictions!`
            );
            return message.reply({ embeds: [embed] });
          }

          await Guild.updateGuild(message.guild.id, { $push: { 'commandChannels.bypassRoles': role.id } });

          const embed = await successEmbed(message.guild.id, 'Bypass Role Added',
            `${GLYPHS.SUCCESS} Members with ${role} can now use commands in any channel.`
          );
          return message.reply({ embeds: [embed] });
        }

        if (action === 'remove') {
          const index = guildConfig.commandChannels.bypassRoles.indexOf(role.id);
          if (index === -1) {
            const embed = await errorEmbed(message.guild.id, 'Not Found',
              `${GLYPHS.ERROR} ${role} is not a bypass role!`
            );
            return message.reply({ embeds: [embed] });
          }

          await Guild.updateGuild(message.guild.id, { $pull: { 'commandChannels.bypassRoles': role.id } });

          const embed = await successEmbed(message.guild.id, 'Bypass Role Removed',
            `${GLYPHS.SUCCESS} ${role} no longer bypasses channel restrictions.`
          );
          return message.reply({ embeds: [embed] });
        }
        break;
      }

      case 'list': {
        const channelsList = guildConfig.commandChannels.channels.length > 0
          ? guildConfig.commandChannels.channels.map(id => {
            const ch = message.guild.channels.cache.get(id);
            return ch ? `<#${id}>` : `Unknown (${id})`;
          }).join('\n')
          : '*No channels configured*';

        const bypassList = guildConfig.commandChannels.bypassRoles.length > 0
          ? guildConfig.commandChannels.bypassRoles.map(id => {
            const r = message.guild.roles.cache.get(id);
            return r ? r.toString() : `Unknown (${id})`;
          }).join('\n')
          : '*No bypass roles*';

        const embed = new EmbedBuilder()
          .setTitle('📢 Command Channel Settings')
          .setColor(guildConfig.embedStyle?.color || '#5865F2')
          .addFields(
            { name: '📊 Status', value: guildConfig.commandChannels.enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
            { name: '📝 Total Channels', value: `${guildConfig.commandChannels.channels.length}`, inline: true },
            { name: '🔓 Bypass Roles', value: `${guildConfig.commandChannels.bypassRoles.length}`, inline: true },
            { name: '💬 Allowed Channels', value: channelsList, inline: false },
            { name: '👑 Bypass Roles', value: bypassList, inline: false }
          )
          .setFooter({ text: `Use ${prefix}cmdchannels enable/disable to toggle` });

        return message.reply({ embeds: [embed] });
      }

      default: {
        const embed = await errorEmbed(message.guild.id, 'Unknown Subcommand',
          `${GLYPHS.ERROR} Unknown subcommand: \`${subcommand}\`\n\nUse \`${prefix}cmdchannels\` to see available options.`
        );
        return message.reply({ embeds: [embed] });
      }
    }
  }
};
