import { PermissionFlagsBits, ChannelType, EmbedBuilder } from 'discord.js';
import Guild from '../../models/Guild.js';
import { getPrefix } from '../../utils/helpers.js';

export default {
  name: 'autopublish',
  description: 'Automatically publish messages in announcement channels',
  usage: '<enable|disable|add|remove|list>',
  aliases: ['autopub'],
  category: 'config',
  permissions: [PermissionFlagsBits.ManageGuild],
  cooldown: 5,

  async execute(message, args, client) {
    const guildId = message.guild.id;
    const prefix = await getPrefix(guildId);

    const subCommand = args[0]?.toLowerCase();

    if (!subCommand) {
      const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('📢 Auto-Publish Announcements')
        .setDescription('Automatically publish messages sent in announcement channels!')
        .addFields(
          { name: `${prefix}autopublish enable`, value: 'Enable auto-publish', inline: true },
          { name: `${prefix}autopublish disable`, value: 'Disable auto-publish', inline: true },
          { name: `${prefix}autopublish add #channel`, value: 'Add a channel', inline: true },
          { name: `${prefix}autopublish remove #channel`, value: 'Remove a channel', inline: true },
          { name: `${prefix}autopublish list`, value: 'List all channels', inline: true }
        );

      return message.reply({ embeds: [embed] });
    }

    const guildConfig = await Guild.getGuild(guildId);

    if (!guildConfig.autoPublish) {
      guildConfig.autoPublish = { enabled: false, channels: [] };
    }

    switch (subCommand) {
      case 'enable': {
        guildConfig.autoPublish.enabled = true;
        await guildConfig.save();

        const embed = new EmbedBuilder()
          .setColor('#00FF00')
          .setTitle('✅ Auto-Publish Enabled')
          .setDescription(`Messages in configured announcement channels will now be automatically published.\n\nUse \`${prefix}autopublish add #channel\` to add channels.`);

        return message.reply({ embeds: [embed] });
      }

      case 'disable': {
        guildConfig.autoPublish.enabled = false;
        await guildConfig.save();

        const embed = new EmbedBuilder()
          .setColor('#FF9900')
          .setTitle('⚠️ Auto-Publish Disabled')
          .setDescription('Auto-publish has been disabled.');

        return message.reply({ embeds: [embed] });
      }

      case 'add': {
        const channel = message.mentions.channels.first();

        if (!channel) {
          return message.reply(`❌ Please mention a channel!\n\nUsage: \`${prefix}autopublish add #channel\``);
        }

        // Check if it's an announcement channel
        if (channel.type !== ChannelType.GuildAnnouncement) {
          return message.reply(`❌ ${channel} is not an announcement channel!\n\nOnly channels with the "Announcement" type can be used.`);
        }

        if (guildConfig.autoPublish.channels.includes(channel.id)) {
          return message.reply(`⚠️ ${channel} is already in the auto-publish list!`);
        }

        guildConfig.autoPublish.channels.push(channel.id);
        await guildConfig.save();

        const embed = new EmbedBuilder()
          .setColor('#00FF00')
          .setDescription(`✅ Added ${channel} to auto-publish list!\n\nAll messages sent in that channel will be automatically published.`);

        return message.reply({ embeds: [embed] });
      }

      case 'remove': {
        const channel = message.mentions.channels.first();

        if (!channel) {
          return message.reply(`❌ Please mention a channel!\n\nUsage: \`${prefix}autopublish remove #channel\``);
        }

        const index = guildConfig.autoPublish.channels.indexOf(channel.id);
        if (index === -1) {
          return message.reply(`⚠️ ${channel} is not in the auto-publish list!`);
        }

        guildConfig.autoPublish.channels.splice(index, 1);
        await guildConfig.save();

        const embed = new EmbedBuilder()
          .setColor('#00FF00')
          .setDescription(`✅ Removed ${channel} from auto-publish list!`);

        return message.reply({ embeds: [embed] });
      }

      case 'list': {
        const channels = guildConfig.autoPublish.channels
          .map(id => {
            const channel = message.guild.channels.cache.get(id);
            return channel ? `<#${id}>` : `Unknown (${id})`;
          })
          .join('\n') || 'No channels configured';

        const embed = new EmbedBuilder()
          .setColor('#5865F2')
          .setTitle('📢 Auto-Publish Channels')
          .addFields(
            { name: 'Status', value: guildConfig.autoPublish.enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
            { name: 'Channels', value: channels }
          );

        return message.reply({ embeds: [embed] });
      }

      default:
        return message.reply(`❌ Unknown subcommand! Use \`${prefix}autopublish\` for help.`);
    }
  }
};
