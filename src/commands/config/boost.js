import { PermissionFlagsBits, EmbedBuilder, ChannelType } from 'discord.js';
import Guild from '../../models/Guild.js';
import { successEmbed, errorEmbed, infoEmbed, GLYPHS } from '../../utils/embeds.js';
import { hasModPerms, getPrefix } from '../../utils/helpers.js';
import { parseBoostMessage, buildBoostEmbed } from '../../events/client/boostHandler.js';

export default {
  name: 'boost',
  description: 'Configure boost thank you messages for server boosters',
  usage: '<enable|disable|channel|message|embed|test|...>',
  aliases: ['boostmsg', 'boostthanks', 'serverboost'],
  permissions: [PermissionFlagsBits.ManageGuild],
  cooldown: 3,

  async execute(message, args) {
    const guildConfig = await Guild.getGuild(message.guild.id, message.guild.name);
    const prefix = await getPrefix(message.guild.id);

    // Check for moderator permissions
    if (!hasModPerms(message.member, guildConfig)) {
      return message.reply({
        embeds: [await errorEmbed(message.guild.id, 'Permission Denied',
          `${GLYPHS.LOCK} You need Moderator/Staff permissions to configure boost messages.`)]
      });
    }

    if (!args[0]) {
      return showStatus(message, guildConfig, prefix);
    }

    const action = args[0].toLowerCase();

    switch (action) {
      case 'enable':
      case 'on':
        await Guild.updateGuild(message.guild.id, {
          $set: { 'features.boostSystem.enabled': true }
        });
        return message.reply({
          embeds: [await successEmbed(message.guild.id, 'Boost System Enabled',
            `${GLYPHS.SUCCESS} Boost thank you messages are now enabled.\n\n` +
            `Make sure to set a channel: \`${prefix}boost channel #channel\``)]
        });

      case 'disable':
      case 'off':
        await Guild.updateGuild(message.guild.id, {
          $set: { 'features.boostSystem.enabled': false }
        });
        return message.reply({
          embeds: [await successEmbed(message.guild.id, 'Boost System Disabled',
            `${GLYPHS.SUCCESS} Boost thank you messages are now disabled.`)]
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

        await Guild.updateGuild(message.guild.id, {
          $set: { 'features.boostSystem.channel': channel.id }
        });

        return message.reply({
          embeds: [await successEmbed(message.guild.id, 'Boost Channel Set',
            `${GLYPHS.SUCCESS} Boost thank you messages will be sent to ${channel}`)]
        });

      case 'message':
      case 'msg':
      case 'description':
      case 'desc':
        const boostMsg = args.slice(1).join(' ');

        if (!boostMsg) {
          const currentMsg = guildConfig.features?.boostSystem?.message || 'Thank you {user} for boosting {server}! 🎉';
          return message.reply({
            embeds: [await infoEmbed(message.guild.id, 'Boost Message Variables',
              `**Current Message:**\n${currentMsg}\n\n` +
              `**Available Variables:**\n` +
              `${GLYPHS.DOT} \`{user}\` - Mentions the user\n` +
              `${GLYPHS.DOT} \`{username}\` - User's username\n` +
              `${GLYPHS.DOT} \`{displayname}\` - User's display name\n` +
              `${GLYPHS.DOT} \`{tag}\` - User's tag\n` +
              `${GLYPHS.DOT} \`{id}\` - User's ID\n` +
              `${GLYPHS.DOT} \`{server}\` - Server name\n` +
              `${GLYPHS.DOT} \`{membercount}\` - Total member count\n` +
              `${GLYPHS.DOT} \`{boostcount}\` - Total boost count\n` +
              `${GLYPHS.DOT} \`{boostlevel}\` - Server boost level\n` +
              `${GLYPHS.DOT} \`{avatar}\` - User's avatar URL\n` +
              `${GLYPHS.DOT} \`\\n\` - New line\n\n` +
              `**Example:**\n\`${prefix}boost message 💎 Thank you {user} for boosting!\\nWe now have {boostcount} boosts!\``)]
          });
        }

        await Guild.updateGuild(message.guild.id, {
          $set: { 'features.boostSystem.message': boostMsg }
        });

        return message.reply({
          embeds: [await successEmbed(message.guild.id, 'Boost Message Set',
            `${GLYPHS.SUCCESS} Boost message has been updated.\n\n` +
            `**Preview:**\n${parseBoostMessage(boostMsg, message.member)}`)]
        });

      case 'embed':
        const embedOption = args[1]?.toLowerCase();

        if (!['on', 'off', 'enable', 'disable'].includes(embedOption)) {
          return message.reply({
            embeds: [await errorEmbed(message.guild.id, 'Invalid Option',
              `Use \`${prefix}boost embed on\` or \`${prefix}boost embed off\``)]
          });
        }

        const embedEnabled = ['on', 'enable'].includes(embedOption);
        await Guild.updateGuild(message.guild.id, {
          $set: { 'features.boostSystem.embedEnabled': embedEnabled }
        });

        return message.reply({
          embeds: [await successEmbed(message.guild.id, 'Embed Setting Updated',
            `${GLYPHS.SUCCESS} Boost embeds are now **${embedEnabled ? 'enabled' : 'disabled'}**`)]
        });

      case 'test':
        return sendTestBoost(message, guildConfig, prefix);

      case 'image':
      case 'banner':
        const imageUrl = args[1];

        if (!imageUrl) {
          const currentBanner = guildConfig.features?.boostSystem?.bannerUrl;
          return message.reply({
            embeds: [await infoEmbed(message.guild.id, 'Boost Banner',
              currentBanner
                ? `**Current Banner:**\n${currentBanner}`
                : `No banner set. Use \`${prefix}boost image <url>\` to set one, or \`${prefix}boost image remove\` to remove.`)]
          });
        }

        if (imageUrl === 'remove' || imageUrl === 'none') {
          await Guild.updateGuild(message.guild.id, {
            $set: { 'features.boostSystem.bannerUrl': null }
          });
          return message.reply({
            embeds: [await successEmbed(message.guild.id, 'Banner Removed',
              `${GLYPHS.SUCCESS} Boost banner has been removed.`)]
          });
        }

        if (!imageUrl.match(/^https?:\/\/.+/i)) {
          return message.reply({
            embeds: [await errorEmbed(message.guild.id, 'Invalid URL',
              'Please provide a valid image URL starting with http:// or https://')]
          });
        }

        await Guild.updateGuild(message.guild.id, {
          $set: { 'features.boostSystem.bannerUrl': imageUrl }
        });

        return message.reply({
          embeds: [await successEmbed(message.guild.id, 'Banner Set',
            `${GLYPHS.SUCCESS} Boost banner has been set.`)]
        });

      case 'thumbnail':
      case 'thumb':
        const thumbUrl = args[1];

        if (!thumbUrl) {
          return message.reply({
            embeds: [await infoEmbed(message.guild.id, 'Boost Thumbnail',
              guildConfig.features?.boostSystem?.thumbnailUrl
                ? `**Current Thumbnail:**\n${guildConfig.features.boostSystem.thumbnailUrl}`
                : 'No custom thumbnail set.\n\n' +
                `\`${prefix}boost thumbnail <url>\` - Set custom thumbnail\n` +
                `\`${prefix}boost thumbnail avatar\` - Use user's avatar\n` +
                `\`${prefix}boost thumbnail server\` - Use server icon\n` +
                `\`${prefix}boost thumbnail remove\` - Remove thumbnail`)]
          });
        }

        if (thumbUrl === 'remove' || thumbUrl === 'none' || thumbUrl === 'off') {
          await Guild.updateGuild(message.guild.id, {
            $set: { 'features.boostSystem.thumbnailUrl': null, 'features.boostSystem.thumbnailType': null }
          });
          return message.reply({
            embeds: [await successEmbed(message.guild.id, 'Thumbnail Removed',
              `${GLYPHS.SUCCESS} Boost thumbnail has been removed.`)]
          });
        }

        if (thumbUrl === 'avatar' || thumbUrl === 'user') {
          await Guild.updateGuild(message.guild.id, {
            $set: { 'features.boostSystem.thumbnailType': 'avatar', 'features.boostSystem.thumbnailUrl': null }
          });
          return message.reply({
            embeds: [await successEmbed(message.guild.id, 'Thumbnail Set',
              `${GLYPHS.SUCCESS} Thumbnail will show the user's avatar.`)]
          });
        }

        if (thumbUrl === 'server' || thumbUrl === 'guild') {
          await Guild.updateGuild(message.guild.id, {
            $set: { 'features.boostSystem.thumbnailType': 'server', 'features.boostSystem.thumbnailUrl': null }
          });
          return message.reply({
            embeds: [await successEmbed(message.guild.id, 'Thumbnail Set',
              `${GLYPHS.SUCCESS} Thumbnail will show the server icon.`)]
          });
        }

        if (!thumbUrl.match(/^https?:\/\/.+/i)) {
          return message.reply({
            embeds: [await errorEmbed(message.guild.id, 'Invalid URL',
              'Please provide a valid URL, or use `avatar`, `server`, or `remove`.')]
          });
        }

        await Guild.updateGuild(message.guild.id, {
          $set: { 'features.boostSystem.thumbnailUrl': thumbUrl, 'features.boostSystem.thumbnailType': 'custom' }
        });

        return message.reply({
          embeds: [await successEmbed(message.guild.id, 'Thumbnail Set',
            `${GLYPHS.SUCCESS} Boost thumbnail has been set.`)]
        });

      case 'title':
        const titleText = args.slice(1).join(' ');

        if (!titleText) {
          return message.reply({
            embeds: [await infoEmbed(message.guild.id, 'Embed Title',
              `**Current Title:**\n${guildConfig.features?.boostSystem?.embedTitle || 'Default decorative style'}\n\n` +
              `Use \`${prefix}boost title <text>\` to set a custom title.\n` +
              `Use \`${prefix}boost title reset\` for default style.\n` +
              `Use \`${prefix}boost title none\` to remove title entirely.\n\n` +
              `**Variables:** {username}, {server}, {boostcount}`)]
          });
        }

        if (titleText === 'reset' || titleText === 'default') {
          await Guild.updateGuild(message.guild.id, {
            $set: { 'features.boostSystem.embedTitle': null }
          });
          return message.reply({
            embeds: [await successEmbed(message.guild.id, 'Title Reset',
              `${GLYPHS.SUCCESS} Boost embed title reset to default decorative style.`)]
          });
        }

        if (titleText === 'none' || titleText === 'remove') {
          await Guild.updateGuild(message.guild.id, {
            $set: { 'features.boostSystem.embedTitle': ' ' }
          });
          return message.reply({
            embeds: [await successEmbed(message.guild.id, 'Title Removed',
              `${GLYPHS.SUCCESS} Boost embed title has been removed.`)]
          });
        }

        await Guild.updateGuild(message.guild.id, {
          $set: { 'features.boostSystem.embedTitle': titleText }
        });

        return message.reply({
          embeds: [await successEmbed(message.guild.id, 'Title Set',
            `${GLYPHS.SUCCESS} Boost embed title set to: ${titleText}`)]
        });

      case 'footer':
        const footerText = args.slice(1).join(' ');

        if (!footerText) {
          return message.reply({
            embeds: [await infoEmbed(message.guild.id, 'Embed Footer',
              `**Current Footer:**\n${guildConfig.features?.boostSystem?.footerText || 'Boost #X (default)'}\n\n` +
              `Use \`${prefix}boost footer <text>\` to set a custom footer.\n` +
              `Use \`${prefix}boost footer reset\` for default.\n` +
              `Use \`${prefix}boost footer none\` to remove footer.\n\n` +
              `**Variables:** {username}, {boostcount}, {boostlevel}`)]
          });
        }

        if (footerText === 'reset' || footerText === 'default') {
          await Guild.updateGuild(message.guild.id, {
            $set: { 'features.boostSystem.footerText': null }
          });
          return message.reply({
            embeds: [await successEmbed(message.guild.id, 'Footer Reset',
              `${GLYPHS.SUCCESS} Boost footer reset to default.`)]
          });
        }

        if (footerText === 'none' || footerText === 'remove') {
          await Guild.updateGuild(message.guild.id, {
            $set: { 'features.boostSystem.footerText': ' ' }
          });
          return message.reply({
            embeds: [await successEmbed(message.guild.id, 'Footer Removed',
              `${GLYPHS.SUCCESS} Boost footer has been removed.`)]
          });
        }

        await Guild.updateGuild(message.guild.id, {
          $set: { 'features.boostSystem.footerText': footerText }
        });

        return message.reply({
          embeds: [await successEmbed(message.guild.id, 'Footer Set',
            `${GLYPHS.SUCCESS} Boost footer set to: ${footerText}`)]
        });

      case 'color':
        const colorHex = args[1];

        if (!colorHex) {
          return message.reply({
            embeds: [await infoEmbed(message.guild.id, 'Embed Color',
              `**Current Color:**\n${guildConfig.features?.boostSystem?.embedColor || '#f47fff'}\n\n` +
              `Use \`${prefix}boost color #HEX\` to set a custom color.\n` +
              `Use \`${prefix}boost color reset\` for default pink.`)]
          });
        }

        if (colorHex === 'reset' || colorHex === 'default') {
          await Guild.updateGuild(message.guild.id, {
            $set: { 'features.boostSystem.embedColor': '#f47fff' }
          });
          return message.reply({
            embeds: [await successEmbed(message.guild.id, 'Color Reset',
              `${GLYPHS.SUCCESS} Boost embed color reset to default pink.`)]
          });
        }

        if (!colorHex.match(/^#?[0-9A-Fa-f]{6}$/)) {
          return message.reply({
            embeds: [await errorEmbed(message.guild.id, 'Invalid Color',
              'Please provide a valid hex color code (e.g., #f47fff)')]
          });
        }

        const normalizedColor = colorHex.startsWith('#') ? colorHex : `#${colorHex}`;
        await Guild.updateGuild(message.guild.id, {
          $set: { 'features.boostSystem.embedColor': normalizedColor }
        });

        return message.reply({
          embeds: [await successEmbed(message.guild.id, 'Color Set',
            `${GLYPHS.SUCCESS} Boost embed color set to: ${normalizedColor}`)]
        });

      case 'mention':
        const mentionOption = args[1]?.toLowerCase();

        if (!['on', 'off', 'enable', 'disable'].includes(mentionOption)) {
          return message.reply({
            embeds: [await errorEmbed(message.guild.id, 'Invalid Option',
              `Use \`${prefix}boost mention on\` or \`${prefix}boost mention off\``)]
          });
        }

        const mentionEnabled = ['on', 'enable'].includes(mentionOption);
        await Guild.updateGuild(message.guild.id, {
          $set: { 'features.boostSystem.mentionUser': mentionEnabled }
        });

        return message.reply({
          embeds: [await successEmbed(message.guild.id, 'Mention Setting Updated',
            `${GLYPHS.SUCCESS} User mention above embed is now **${mentionEnabled ? 'enabled' : 'disabled'}**`)]
        });

      case 'greeting':
        const greetingText = args.slice(1).join(' ');

        if (!greetingText) {
          return message.reply({
            embeds: [await infoEmbed(message.guild.id, 'Greeting Text',
              `**Current Greeting:**\n${guildConfig.features?.boostSystem?.greetingText || '💎 {user} just boosted the server!'}\n\n` +
              `This is the text that appears above the embed (when mention is enabled).\n\n` +
              `Use \`${prefix}boost greeting <text>\` to customize.\n` +
              `**Variables:** {user}, {username}, {server}`)]
          });
        }

        await Guild.updateGuild(message.guild.id, {
          $set: { 'features.boostSystem.greetingText': greetingText }
        });

        return message.reply({
          embeds: [await successEmbed(message.guild.id, 'Greeting Set',
            `${GLYPHS.SUCCESS} Greeting text set to: ${greetingText}`)]
        });

      case 'preview':
        return showPreview(message, guildConfig);

      case 'help':
        return showHelp(message, prefix);

      default:
        return message.reply({
          embeds: [await errorEmbed(message.guild.id, 'Unknown Option',
            `Unknown option: \`${action}\`\n\nUse \`${prefix}boost help\` for available commands.`)]
        });
    }
  }
};

async function showStatus(message, guildConfig, prefix) {
  const boost = guildConfig.features?.boostSystem || {};
  const channel = boost.channel ? message.guild.channels.cache.get(boost.channel) : null;

  const embed = new EmbedBuilder()
    .setColor(boost.embedColor || '#f47fff')
    .setTitle('💎 Boost Thank You System')
    .setDescription('Send thank you messages when someone boosts your server!')
    .addFields(
      { name: '▸ Status', value: boost.enabled ? '`✅ Enabled`' : '`❌ Disabled`', inline: true },
      { name: '▸ Channel', value: channel ? `${channel}` : '`Not set`', inline: true },
      { name: '▸ Embed', value: boost.embedEnabled !== false ? '`✅ On`' : '`❌ Off`', inline: true },
      { name: '▸ Message', value: `\`\`\`${(boost.message || 'Thank you {user} for boosting {server}! 🎉').slice(0, 100)}\`\`\``, inline: false }
    )
    .addFields(
      {
        name: '📝 Commands', value:
          `\`${prefix}boost enable\` - Enable boost messages\n` +
          `\`${prefix}boost disable\` - Disable boost messages\n` +
          `\`${prefix}boost channel #channel\` - Set boost channel\n` +
          `\`${prefix}boost message <text>\` - Set thank you message\n` +
          `\`${prefix}boost test\` - Send a test message\n` +
          `\`${prefix}boost help\` - Show all options`, inline: false
      }
    )
    .setFooter({ text: `Use ${prefix}boost help for all customization options` });

  return message.reply({ embeds: [embed] });
}

async function showHelp(message, prefix) {
  const helpEmbed = new EmbedBuilder()
    .setColor('#f47fff')
    .setTitle('💎 Boost Message Configuration')
    .setDescription('All available commands for customizing boost thank you messages.')
    .addFields(
      {
        name: '🔧 Basic Setup', value:
          `\`${prefix}boost enable\` - Enable boost messages\n` +
          `\`${prefix}boost disable\` - Disable boost messages\n` +
          `\`${prefix}boost channel #channel\` - Set boost channel\n` +
          `\`${prefix}boost message <text>\` - Set thank you message`, inline: false
      },
      {
        name: '🎨 Embed Customization', value:
          `\`${prefix}boost embed on/off\` - Toggle embed mode\n` +
          `\`${prefix}boost color #hex\` - Set embed color\n` +
          `\`${prefix}boost title <text>\` - Set embed title\n` +
          `\`${prefix}boost footer <text>\` - Set embed footer\n` +
          `\`${prefix}boost image <url>\` - Set banner image\n` +
          `\`${prefix}boost thumbnail <type>\` - Set thumbnail`, inline: false
      },
      {
        name: '💬 Content Options', value:
          `\`${prefix}boost mention on/off\` - Toggle user ping\n` +
          `\`${prefix}boost greeting <text>\` - Text above embed`, inline: false
      },
      {
        name: '🔍 Preview & Test', value:
          `\`${prefix}boost test\` - Send test message to channel\n` +
          `\`${prefix}boost preview\` - Preview in current channel`, inline: false
      }
    );

  const varsEmbed = new EmbedBuilder()
    .setColor('#f47fff')
    .setTitle('📋 Available Variables')
    .setDescription(
      '`{user}` - Mentions the user\n' +
      '`{username}` - User\'s username\n' +
      '`{displayname}` - User\'s display name\n' +
      '`{tag}` - User\'s tag\n' +
      '`{id}` - User\'s ID\n' +
      '`{server}` - Server name\n' +
      '`{membercount}` - Total member count\n' +
      '`{boostcount}` - Total boost count\n' +
      '`{boostlevel}` - Server boost level (0-3)\n' +
      '`{avatar}` - User\'s avatar URL\n' +
      '`\\n` - New line'
    );

  return message.reply({ embeds: [helpEmbed, varsEmbed] });
}

async function showPreview(message, guildConfig) {
  const boost = guildConfig.features?.boostSystem || {};
  const { embed, content } = buildBoostEmbed(message.member, boost, guildConfig);

  await message.reply({
    embeds: [await infoEmbed(message.guild.id, 'Boost Preview',
      'Here\'s how your boost message will look:')]
  });

  await message.channel.send({ content, embeds: embed ? [embed] : undefined });
}

async function sendTestBoost(message, guildConfig, prefix) {
  const boost = guildConfig.features?.boostSystem || {};
  const channel = boost.channel ? message.guild.channels.cache.get(boost.channel) : message.channel;

  if (!channel) {
    return message.reply({
      embeds: [await errorEmbed(message.guild.id, 'No Channel',
        `Boost channel is not set. Use \`${prefix}boost channel #channel\` to set one.`)]
    });
  }

  const { embed, content } = buildBoostEmbed(message.member, boost, guildConfig);

  if (embed) {
    await channel.send({ content, embeds: [embed] });
  } else {
    const boostMsg = parseBoostMessage(boost.message || 'Thank you {user} for boosting {server}! 🎉', message.member);
    await channel.send(content || boostMsg);
  }

  return message.reply({
    embeds: [await successEmbed(message.guild.id, 'Test Sent',
      `${GLYPHS.SUCCESS} Test boost message sent to ${channel}`)]
  });
}
