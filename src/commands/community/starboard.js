import { PermissionFlagsBits, ChannelType, EmbedBuilder } from 'discord.js';
import Guild from '../../models/Guild.js';
import StarboardEntry from '../../models/StarboardEntry.js';
import { successEmbed, errorEmbed, infoEmbed, GLYPHS } from '../../utils/embeds.js';

export default {
  name: 'starboard',
  description: 'Configure the starboard feature',
  usage: '<enable|disable|channel|threshold|emoji|stats>',
  aliases: ['star', 'sb'],
  permissions: {
    user: PermissionFlagsBits.ManageGuild
  },
  cooldown: 3,

  async execute(message, args) {
    const guildConfig = await Guild.getGuild(message.guild.id, message.guild.name);

    // Initialize starboard settings if not exist
    if (!guildConfig.features.starboard) {
      guildConfig.features.starboard = {
        enabled: false,
        channel: null,
        threshold: 3,
        emoji: '⭐',
        selfStar: false,
        ignoredChannels: []
      };
      await guildConfig.save();
    }

    if (!args[0]) {
      return showStatus(message, guildConfig);
    }

    const action = args[0].toLowerCase();

    switch (action) {
      case 'enable':
      case 'on':
        if (!guildConfig.features.starboard.channel) {
          return message.reply({
            embeds: [await errorEmbed(message.guild.id, 'No Channel Set',
              'Please set a starboard channel first: `starboard channel #channel`')]
          });
        }
        guildConfig.features.starboard.enabled = true;
        await guildConfig.save();
        return message.reply({
          embeds: [await successEmbed(message.guild.id, 'Starboard Enabled',
            `${GLYPHS.SUCCESS} Starboard is now enabled!`)]
        });

      case 'disable':
      case 'off':
        guildConfig.features.starboard.enabled = false;
        await guildConfig.save();
        return message.reply({
          embeds: [await successEmbed(message.guild.id, 'Starboard Disabled',
            `${GLYPHS.SUCCESS} Starboard is now disabled.`)]
        });

      case 'channel':
        const channel = message.mentions.channels.first() ||
          message.guild.channels.cache.get(args[1]);

        if (!channel) {
          return message.reply({
            embeds: [await errorEmbed(message.guild.id, 'No Channel',
              'Please mention a channel or provide a channel ID.')]
          });
        }

        if (channel.type !== ChannelType.GuildText) {
          return message.reply({
            embeds: [await errorEmbed(message.guild.id, 'Invalid Channel',
              'Please select a text channel.')]
          });
        }

        guildConfig.features.starboard.channel = channel.id;
        await guildConfig.save();
        return message.reply({
          embeds: [await successEmbed(message.guild.id, 'Starboard Channel Set',
            `${GLYPHS.SUCCESS} Starboard channel set to ${channel}`)]
        });

      case 'threshold':
      case 'limit':
        const threshold = parseInt(args[1]);
        if (isNaN(threshold) || threshold < 1 || threshold > 100) {
          return message.reply({
            embeds: [await errorEmbed(message.guild.id, 'Invalid Threshold',
              'Threshold must be between 1 and 100.')]
          });
        }
        guildConfig.features.starboard.threshold = threshold;
        await guildConfig.save();
        return message.reply({
          embeds: [await successEmbed(message.guild.id, 'Threshold Updated',
            `${GLYPHS.SUCCESS} Messages now need ${threshold} ${guildConfig.features.starboard.emoji} to be starred.`)]
        });

      case 'emoji':
        const emoji = args[1];
        if (!emoji) {
          return message.reply({
            embeds: [await errorEmbed(message.guild.id, 'No Emoji',
              'Please provide an emoji.')]
          });
        }
        guildConfig.features.starboard.emoji = emoji;
        await guildConfig.save();
        return message.reply({
          embeds: [await successEmbed(message.guild.id, 'Emoji Updated',
            `${GLYPHS.SUCCESS} Starboard emoji set to ${emoji}`)]
        });

      case 'selfstar':
        const selfOption = args[1]?.toLowerCase();
        if (!['on', 'off', 'enable', 'disable'].includes(selfOption)) {
          return message.reply({
            embeds: [await errorEmbed(message.guild.id, 'Invalid Option',
              'Use `starboard selfstar on` or `starboard selfstar off`')]
          });
        }
        guildConfig.features.starboard.selfStar = ['on', 'enable'].includes(selfOption);
        await guildConfig.save();
        return message.reply({
          embeds: [await successEmbed(message.guild.id, 'Self-Star Updated',
            `${GLYPHS.SUCCESS} Users can ${guildConfig.features.starboard.selfStar ? 'now' : 'no longer'} star their own messages.`)]
        });

      case 'ignore':
        const ignoreChannel = message.mentions.channels.first() ||
          message.guild.channels.cache.get(args[1]);
        if (!ignoreChannel) {
          return message.reply({
            embeds: [await errorEmbed(message.guild.id, 'No Channel',
              'Please mention a channel to ignore.')]
          });
        }

        if (!guildConfig.features.starboard.ignoredChannels) {
          guildConfig.features.starboard.ignoredChannels = [];
        }

        if (guildConfig.features.starboard.ignoredChannels.includes(ignoreChannel.id)) {
          return message.reply({
            embeds: [await errorEmbed(message.guild.id, 'Already Ignored',
              'This channel is already ignored.')]
          });
        }

        guildConfig.features.starboard.ignoredChannels.push(ignoreChannel.id);
        await guildConfig.save();
        return message.reply({
          embeds: [await successEmbed(message.guild.id, 'Channel Ignored',
            `${GLYPHS.SUCCESS} ${ignoreChannel} will be ignored by starboard.`)]
        });

      case 'unignore':
        const unignoreChannel = message.mentions.channels.first() ||
          message.guild.channels.cache.get(args[1]);
        if (!unignoreChannel) {
          return message.reply({
            embeds: [await errorEmbed(message.guild.id, 'No Channel',
              'Please mention a channel to unignore.')]
          });
        }

        guildConfig.features.starboard.ignoredChannels =
          (guildConfig.features.starboard.ignoredChannels || [])
            .filter(id => id !== unignoreChannel.id);
        await guildConfig.save();
        return message.reply({
          embeds: [await successEmbed(message.guild.id, 'Channel Unignored',
            `${GLYPHS.SUCCESS} ${unignoreChannel} will no longer be ignored.`)]
        });

      case 'stats':
      case 'top':
        return showStats(message);

      default:
        return showStatus(message, guildConfig);
    }
  }
};

async function showStatus(message, guildConfig) {
  const sb = guildConfig.features.starboard;
  const channel = sb?.channel ? message.guild.channels.cache.get(sb.channel) : null;
  const ignoredCount = sb?.ignoredChannels?.length || 0;

  const embed = await infoEmbed(message.guild.id, '『 Starboard Settings 』',
    `**▸ Status:** ${sb?.enabled ? '◉ Active' : '○ Inactive'}\n` +
    `**▸ Channel:** ${channel || 'Not configured'}\n` +
    `**▸ Threshold:** ${sb?.threshold || 3} reactions\n` +
    `**▸ Emoji:** ${sb?.emoji || '⭐'}\n` +
    `**▸ Self-Star:** ${sb?.selfStar ? '◉ Allowed' : '○ Disabled'}\n` +
    `**▸ Ignored Channels:** ${ignoredCount}\n\n` +
    `**Commands:**\n` +
    `${GLYPHS.DOT} \`starboard enable/disable\` - Toggle starboard\n` +
    `${GLYPHS.DOT} \`starboard channel #channel\` - Set channel\n` +
    `${GLYPHS.DOT} \`starboard threshold <num>\` - Set reaction threshold\n` +
    `${GLYPHS.DOT} \`starboard emoji <emoji>\` - Set star emoji\n` +
    `${GLYPHS.DOT} \`starboard selfstar on/off\` - Allow self-starring\n` +
    `${GLYPHS.DOT} \`starboard ignore #channel\` - Ignore a channel\n` +
    `${GLYPHS.DOT} \`starboard stats\` - View top starred messages`
  );

  return message.reply({ embeds: [embed] });
}

async function showStats(message) {
  const topStarred = await StarboardEntry.getTopStarred(message.guild.id, 10);

  if (topStarred.length === 0) {
    return message.reply({
      embeds: [await infoEmbed(message.guild.id, '⭐ Starboard Stats',
        'No messages have been starred yet!')]
    });
  }

  const statsList = topStarred.map((entry, i) =>
    `**${i + 1}.** ⭐ ${entry.starCount} - <@${entry.authorId}>\n` +
    `   [Jump to message](https://discord.com/channels/${message.guild.id}/${entry.originalChannelId}/${entry.originalMessageId})`
  ).join('\n\n');

  const embed = await infoEmbed(message.guild.id, '⭐ Top Starred Messages', statsList);
  return message.reply({ embeds: [embed] });
}
