import { PermissionFlagsBits, EmbedBuilder, ChannelType } from 'discord.js';
import Guild from '../../models/Guild.js';
import { successEmbed, errorEmbed, infoEmbed, GLYPHS } from '../../utils/embeds.js';
import { hasModPerms, getPrefix } from '../../utils/helpers.js';

export default {
  name: 'goodbye',
  description: 'Configure goodbye messages for when members leave',
  usage: '<enable|disable|channel|message|embed|test|...>',
  aliases: ['leave', 'leavemsg', 'farewell'],
  permissions: [PermissionFlagsBits.ManageGuild],
  cooldown: 3,

  async execute(message, args) {
    const guildConfig = await Guild.getGuild(message.guild.id, message.guild.name);
    const prefix = await getPrefix(message.guild.id);

    // Check for moderator permissions
    if (!hasModPerms(message.member, guildConfig)) {
      return message.reply({
        embeds: [await errorEmbed(message.guild.id, 'Permission Denied',
          `${GLYPHS.LOCK} You need Moderator/Staff permissions to configure goodbye messages.`)]
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
          $set: { 'features.leaveSystem.enabled': true }
        });
        return message.reply({
          embeds: [await successEmbed(message.guild.id, 'Goodbye System Enabled',
            `${GLYPHS.SUCCESS} Goodbye messages are now enabled.\n\n` +
            `Make sure to set a channel: \`${prefix}goodbye channel #channel\``)]
        });

      case 'disable':
      case 'off':
        await Guild.updateGuild(message.guild.id, {
          $set: { 'features.leaveSystem.enabled': false }
        });
        return message.reply({
          embeds: [await successEmbed(message.guild.id, 'Goodbye System Disabled',
            `${GLYPHS.SUCCESS} Goodbye messages are now disabled.`)]
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
          $set: { 'features.leaveSystem.channel': channel.id }
        });

        return message.reply({
          embeds: [await successEmbed(message.guild.id, 'Goodbye Channel Set',
            `${GLYPHS.SUCCESS} Goodbye messages will be sent to ${channel}`)]
        });

      case 'message':
      case 'msg':
      case 'description':
      case 'desc':
        const leaveMsg = args.slice(1).join(' ');

        if (!leaveMsg) {
          const currentMsg = guildConfig.features?.leaveSystem?.message || 'Goodbye {username}! We hope to see you again.';
          return message.reply({
            embeds: [await infoEmbed(message.guild.id, 'Goodbye Message Variables',
              `**Current Message:**\n${currentMsg}\n\n` +
              `**Available Variables:**\n` +
              `${GLYPHS.DOT} \`{user}\` - Mentions the user (won't ping after leave)\n` +
              `${GLYPHS.DOT} \`{username}\` - User's username\n` +
              `${GLYPHS.DOT} \`{displayname}\` - User's display name\n` +
              `${GLYPHS.DOT} \`{tag}\` - User's tag\n` +
              `${GLYPHS.DOT} \`{id}\` - User's ID\n` +
              `${GLYPHS.DOT} \`{server}\` - Server name\n` +
              `${GLYPHS.DOT} \`{membercount}\` - Current member count\n` +
              `${GLYPHS.DOT} \`{joindate}\` - When they joined\n` +
              `${GLYPHS.DOT} \`{duration}\` - How long they were here\n` +
              `${GLYPHS.DOT} \`\\n\` - New line\n\n` +
              `**Example:**\n\`${prefix}goodbye message Goodbye {username}!\\nWe now have {membercount} members.\``)]
          });
        }

        await Guild.updateGuild(message.guild.id, {
          $set: { 'features.leaveSystem.message': leaveMsg }
        });

        return message.reply({
          embeds: [await successEmbed(message.guild.id, 'Goodbye Message Set',
            `${GLYPHS.SUCCESS} Goodbye message has been updated.\n\n` +
            `**Preview:**\n${parseLeaveMessage(leaveMsg, message.member)}`)]
        });

      case 'embed':
        const embedOption = args[1]?.toLowerCase();

        if (!['on', 'off', 'enable', 'disable'].includes(embedOption)) {
          return message.reply({
            embeds: [await errorEmbed(message.guild.id, 'Invalid Option',
              `Use \`${prefix}goodbye embed on\` or \`${prefix}goodbye embed off\``)]
          });
        }

        const embedEnabled = ['on', 'enable'].includes(embedOption);
        await Guild.updateGuild(message.guild.id, {
          $set: { 'features.leaveSystem.embedEnabled': embedEnabled }
        });

        return message.reply({
          embeds: [await successEmbed(message.guild.id, 'Embed Setting Updated',
            `${GLYPHS.SUCCESS} Goodbye embeds are now **${embedEnabled ? 'enabled' : 'disabled'}**`)]
        });

      case 'test':
        return sendTestGoodbye(message, guildConfig, prefix);

      case 'image':
      case 'banner':
        const imageUrl = args[1];

        if (!imageUrl) {
          const currentBanner = guildConfig.features?.leaveSystem?.bannerUrl;
          return message.reply({
            embeds: [await infoEmbed(message.guild.id, 'Goodbye Banner',
              currentBanner
                ? `**Current Banner:**\n${currentBanner}`
                : `No banner set. Use \`${prefix}goodbye image <url>\` to set one, or \`${prefix}goodbye image remove\` to remove.`)]
          });
        }

        if (imageUrl === 'remove' || imageUrl === 'none') {
          await Guild.updateGuild(message.guild.id, {
            $set: { 'features.leaveSystem.bannerUrl': null }
          });
          return message.reply({
            embeds: [await successEmbed(message.guild.id, 'Banner Removed',
              `${GLYPHS.SUCCESS} Goodbye banner has been removed.`)]
          });
        }

        if (!imageUrl.match(/^https?:\/\/.+/i)) {
          return message.reply({
            embeds: [await errorEmbed(message.guild.id, 'Invalid URL',
              'Please provide a valid image URL starting with http:// or https://')]
          });
        }

        await Guild.updateGuild(message.guild.id, {
          $set: { 'features.leaveSystem.bannerUrl': imageUrl }
        });

        return message.reply({
          embeds: [await successEmbed(message.guild.id, 'Banner Set',
            `${GLYPHS.SUCCESS} Goodbye banner has been set.`)]
        });

      case 'thumbnail':
      case 'thumb':
        const thumbUrl = args[1];

        if (!thumbUrl) {
          return message.reply({
            embeds: [await infoEmbed(message.guild.id, 'Goodbye Thumbnail',
              guildConfig.features?.leaveSystem?.thumbnailUrl
                ? `**Current Thumbnail:**\n${guildConfig.features.leaveSystem.thumbnailUrl}`
                : 'No custom thumbnail set.\n\n' +
                `\`${prefix}goodbye thumbnail <url>\` - Set custom thumbnail\n` +
                `\`${prefix}goodbye thumbnail avatar\` - Use user's avatar\n` +
                `\`${prefix}goodbye thumbnail server\` - Use server icon\n` +
                `\`${prefix}goodbye thumbnail remove\` - Remove thumbnail`)]
          });
        }

        if (thumbUrl === 'remove' || thumbUrl === 'none' || thumbUrl === 'off') {
          await Guild.updateGuild(message.guild.id, {
            $set: { 'features.leaveSystem.thumbnailUrl': null, 'features.leaveSystem.thumbnailType': null }
          });
          return message.reply({
            embeds: [await successEmbed(message.guild.id, 'Thumbnail Removed',
              `${GLYPHS.SUCCESS} Goodbye thumbnail has been removed.`)]
          });
        }

        if (thumbUrl === 'avatar' || thumbUrl === 'user') {
          await Guild.updateGuild(message.guild.id, {
            $set: { 'features.leaveSystem.thumbnailType': 'avatar', 'features.leaveSystem.thumbnailUrl': null }
          });
          return message.reply({
            embeds: [await successEmbed(message.guild.id, 'Thumbnail Set',
              `${GLYPHS.SUCCESS} Thumbnail will show the user's avatar.`)]
          });
        }

        if (thumbUrl === 'server' || thumbUrl === 'guild') {
          await Guild.updateGuild(message.guild.id, {
            $set: { 'features.leaveSystem.thumbnailType': 'server', 'features.leaveSystem.thumbnailUrl': null }
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
          $set: { 'features.leaveSystem.thumbnailUrl': thumbUrl, 'features.leaveSystem.thumbnailType': 'custom' }
        });

        return message.reply({
          embeds: [await successEmbed(message.guild.id, 'Thumbnail Set',
            `${GLYPHS.SUCCESS} Goodbye thumbnail has been set.`)]
        });

      case 'title':
        const titleText = args.slice(1).join(' ');

        if (!titleText) {
          return message.reply({
            embeds: [await infoEmbed(message.guild.id, 'Embed Title',
              `**Current Title:**\n${guildConfig.features?.leaveSystem?.embedTitle || 'Default: 👋 Goodbye!'}\n\n` +
              `Use \`${prefix}goodbye title <text>\` to set a custom title.\n` +
              `Use \`${prefix}goodbye title reset\` for default.\n` +
              `Use \`${prefix}goodbye title none\` to remove title.\n\n` +
              `**Variables:** {username}, {server}, {membercount}`)]
          });
        }

        if (titleText === 'reset' || titleText === 'default') {
          await Guild.updateGuild(message.guild.id, {
            $set: { 'features.leaveSystem.embedTitle': null }
          });
          return message.reply({
            embeds: [await successEmbed(message.guild.id, 'Title Reset',
              `${GLYPHS.SUCCESS} Goodbye embed title reset to default.`)]
          });
        }

        if (titleText === 'none' || titleText === 'remove') {
          await Guild.updateGuild(message.guild.id, {
            $set: { 'features.leaveSystem.embedTitle': ' ' }
          });
          return message.reply({
            embeds: [await successEmbed(message.guild.id, 'Title Removed',
              `${GLYPHS.SUCCESS} Goodbye embed title has been removed.`)]
          });
        }

        await Guild.updateGuild(message.guild.id, {
          $set: { 'features.leaveSystem.embedTitle': titleText }
        });

        return message.reply({
          embeds: [await successEmbed(message.guild.id, 'Title Set',
            `${GLYPHS.SUCCESS} Goodbye embed title set to: ${titleText}`)]
        });

      case 'footer':
        const footerText = args.slice(1).join(' ');

        if (!footerText) {
          return message.reply({
            embeds: [await infoEmbed(message.guild.id, 'Embed Footer',
              `**Current Footer:**\n${guildConfig.features?.leaveSystem?.footerText || 'Default: member count'}\n\n` +
              `Use \`${prefix}goodbye footer <text>\` to set a custom footer.\n` +
              `Use \`${prefix}goodbye footer reset\` for default.\n` +
              `Use \`${prefix}goodbye footer none\` to remove footer.\n\n` +
              `**Variables:** {username}, {membercount}`)]
          });
        }

        if (footerText === 'reset' || footerText === 'default') {
          await Guild.updateGuild(message.guild.id, {
            $set: { 'features.leaveSystem.footerText': null }
          });
          return message.reply({
            embeds: [await successEmbed(message.guild.id, 'Footer Reset',
              `${GLYPHS.SUCCESS} Goodbye footer reset to default.`)]
          });
        }

        if (footerText === 'none' || footerText === 'remove') {
          await Guild.updateGuild(message.guild.id, {
            $set: { 'features.leaveSystem.footerText': ' ' }
          });
          return message.reply({
            embeds: [await successEmbed(message.guild.id, 'Footer Removed',
              `${GLYPHS.SUCCESS} Goodbye footer has been removed.`)]
          });
        }

        await Guild.updateGuild(message.guild.id, {
          $set: { 'features.leaveSystem.footerText': footerText }
        });

        return message.reply({
          embeds: [await successEmbed(message.guild.id, 'Footer Set',
            `${GLYPHS.SUCCESS} Goodbye footer set to: ${footerText}`)]
        });

      case 'color':
        const colorHex = args[1];

        if (!colorHex) {
          return message.reply({
            embeds: [await infoEmbed(message.guild.id, 'Embed Color',
              `**Current Color:**\n${guildConfig.features?.leaveSystem?.embedColor || '#FF4757'}\n\n` +
              `Use \`${prefix}goodbye color #HEX\` to set a custom color.\n` +
              `Use \`${prefix}goodbye color reset\` for default red.`)]
          });
        }

        if (colorHex === 'reset' || colorHex === 'default') {
          await Guild.updateGuild(message.guild.id, {
            $set: { 'features.leaveSystem.embedColor': '#FF4757' }
          });
          return message.reply({
            embeds: [await successEmbed(message.guild.id, 'Color Reset',
              `${GLYPHS.SUCCESS} Goodbye embed color reset to default red.`)]
          });
        }

        if (!colorHex.match(/^#?[0-9A-Fa-f]{6}$/)) {
          return message.reply({
            embeds: [await errorEmbed(message.guild.id, 'Invalid Color',
              'Please provide a valid hex color code (e.g., #FF4757)')]
          });
        }

        const normalizedColor = colorHex.startsWith('#') ? colorHex : `#${colorHex}`;
        await Guild.updateGuild(message.guild.id, {
          $set: { 'features.leaveSystem.embedColor': normalizedColor }
        });

        return message.reply({
          embeds: [await successEmbed(message.guild.id, 'Color Set',
            `${GLYPHS.SUCCESS} Goodbye embed color set to: ${normalizedColor}`)]
        });

      case 'joindate':
        const joinOption = args[1]?.toLowerCase();

        if (!['on', 'off', 'enable', 'disable'].includes(joinOption)) {
          return message.reply({
            embeds: [await errorEmbed(message.guild.id, 'Invalid Option',
              `Use \`${prefix}goodbye joindate on\` or \`${prefix}goodbye joindate off\``)]
          });
        }

        const showJoinDate = ['on', 'enable'].includes(joinOption);
        await Guild.updateGuild(message.guild.id, {
          $set: { 'features.leaveSystem.showJoinDate': showJoinDate }
        });

        return message.reply({
          embeds: [await successEmbed(message.guild.id, 'Join Date Setting Updated',
            `${GLYPHS.SUCCESS} Showing join date is now **${showJoinDate ? 'enabled' : 'disabled'}**`)]
        });

      case 'preview':
        return showPreview(message, guildConfig);

      case 'help':
        return showHelp(message, prefix);

      default:
        return message.reply({
          embeds: [await errorEmbed(message.guild.id, 'Unknown Option',
            `Unknown option: \`${action}\`\n\nUse \`${prefix}goodbye help\` for available commands.`)]
        });
    }
  }
};

async function showStatus(message, guildConfig, prefix) {
  const leave = guildConfig.features?.leaveSystem || {};
  const channel = leave.channel ? message.guild.channels.cache.get(leave.channel) : null;

  const embed = new EmbedBuilder()
    .setColor(leave.embedColor || '#FF4757')
    .setTitle('👋 Goodbye Message System')
    .setDescription('Send farewell messages when members leave your server!')
    .addFields(
      { name: '▸ Status', value: leave.enabled ? '`✅ Enabled`' : '`❌ Disabled`', inline: true },
      { name: '▸ Channel', value: channel ? `${channel}` : '`Not set`', inline: true },
      { name: '▸ Embed', value: leave.embedEnabled !== false ? '`✅ On`' : '`❌ Off`', inline: true },
      { name: '▸ Message', value: `\`\`\`${(leave.message || 'Goodbye {username}! We hope to see you again.').slice(0, 100)}\`\`\``, inline: false }
    )
    .addFields(
      { name: '📝 Commands', value:
        `\`${prefix}goodbye enable\` - Enable goodbye messages\n` +
        `\`${prefix}goodbye disable\` - Disable goodbye messages\n` +
        `\`${prefix}goodbye channel #channel\` - Set goodbye channel\n` +
        `\`${prefix}goodbye message <text>\` - Set farewell message\n` +
        `\`${prefix}goodbye test\` - Send a test message\n` +
        `\`${prefix}goodbye help\` - Show all options`, inline: false }
    )
    .setFooter({ text: `Use ${prefix}goodbye help for all customization options` });

  return message.reply({ embeds: [embed] });
}

async function showHelp(message, prefix) {
  const helpEmbed = new EmbedBuilder()
    .setColor('#FF4757')
    .setTitle('👋 Goodbye Message Configuration')
    .setDescription('All available commands for customizing goodbye messages.')
    .addFields(
      { name: '🔧 Basic Setup', value:
        `\`${prefix}goodbye enable\` - Enable goodbye messages\n` +
        `\`${prefix}goodbye disable\` - Disable goodbye messages\n` +
        `\`${prefix}goodbye channel #channel\` - Set goodbye channel\n` +
        `\`${prefix}goodbye message <text>\` - Set farewell message`, inline: false },
      { name: '🎨 Embed Customization', value:
        `\`${prefix}goodbye embed on/off\` - Toggle embed mode\n` +
        `\`${prefix}goodbye color #hex\` - Set embed color\n` +
        `\`${prefix}goodbye title <text>\` - Set embed title\n` +
        `\`${prefix}goodbye footer <text>\` - Set embed footer\n` +
        `\`${prefix}goodbye image <url>\` - Set banner image\n` +
        `\`${prefix}goodbye thumbnail <type>\` - Set thumbnail`, inline: false },
      { name: '⚙️ Display Options', value:
        `\`${prefix}goodbye joindate on/off\` - Show when they joined`, inline: false },
      { name: '🔍 Preview & Test', value:
        `\`${prefix}goodbye test\` - Send test message to channel\n` +
        `\`${prefix}goodbye preview\` - Preview in current channel`, inline: false }
    );

  const varsEmbed = new EmbedBuilder()
    .setColor('#FF4757')
    .setTitle('📋 Available Variables')
    .setDescription(
      '`{user}` - Mentions the user\n' +
      '`{username}` - User\'s username\n' +
      '`{displayname}` - User\'s display name\n' +
      '`{tag}` - User\'s tag\n' +
      '`{id}` - User\'s ID\n' +
      '`{server}` - Server name\n' +
      '`{membercount}` - Current member count\n' +
      '`{joindate}` - When they joined\n' +
      '`{duration}` - How long they were here\n' +
      '`\\n` - New line'
    );

  return message.reply({ embeds: [helpEmbed, varsEmbed] });
}

async function showPreview(message, guildConfig) {
  const leave = guildConfig.features?.leaveSystem || {};
  const embed = buildLeaveEmbed(message.member, leave, guildConfig);

  await message.reply({
    embeds: [await infoEmbed(message.guild.id, 'Goodbye Preview',
      'Here\'s how your goodbye message will look:')]
  });

  await message.channel.send({ embeds: [embed] });
}

async function sendTestGoodbye(message, guildConfig, prefix) {
  const leave = guildConfig.features?.leaveSystem || {};
  const channel = leave.channel ? message.guild.channels.cache.get(leave.channel) : message.channel;

  if (!channel) {
    return message.reply({
      embeds: [await errorEmbed(message.guild.id, 'No Channel',
        `Goodbye channel is not set. Use \`${prefix}goodbye channel #channel\` to set one.`)]
    });
  }

  if (leave.embedEnabled !== false) {
    const embed = buildLeaveEmbed(message.member, leave, guildConfig);
    await channel.send({ embeds: [embed] });
  } else {
    const leaveMsg = parseLeaveMessage(leave.message || 'Goodbye {username}! We hope to see you again.', message.member);
    await channel.send(leaveMsg);
  }

  return message.reply({
    embeds: [await successEmbed(message.guild.id, 'Test Sent',
      `${GLYPHS.SUCCESS} Test goodbye message sent to ${channel}`)]
  });
}

/**
 * Build the goodbye embed based on settings
 */
function buildLeaveEmbed(member, leave, guildConfig) {
  const leaveMsg = parseLeaveMessage(leave.message || 'Goodbye {username}! We hope to see you again.', member);

  const embed = new EmbedBuilder()
    .setColor(leave.embedColor || '#FF4757');

  // Author section - show user info
  embed.setAuthor({
    name: member.user.username,
    iconURL: member.user.displayAvatarURL({ dynamic: true, size: 128 })
  });

  // Title
  const title = leave.embedTitle;
  if (title && title.trim() && title !== ' ') {
    embed.setTitle(parseLeaveMessage(title, member));
  } else if (title !== ' ') {
    embed.setTitle('👋 Goodbye!');
  }

  // Description
  embed.setDescription(leaveMsg);

  // Thumbnail
  if (leave.thumbnailType === 'avatar') {
    embed.setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }));
  } else if (leave.thumbnailType === 'server') {
    embed.setThumbnail(member.guild.iconURL({ dynamic: true, size: 256 }));
  } else if (leave.thumbnailUrl) {
    embed.setThumbnail(leave.thumbnailUrl);
  }

  // Show join date field
  if (leave.showJoinDate !== false && member.joinedTimestamp) {
    const joinedAt = Math.floor(member.joinedTimestamp / 1000);
    embed.addFields(
      { name: '▸ Joined', value: `<t:${joinedAt}:R>`, inline: true },
      { name: '▸ Member Count', value: `${member.guild.memberCount}`, inline: true }
    );
  } else if (leave.showMemberCount !== false) {
    embed.addFields(
      { name: '▸ Member Count', value: `${member.guild.memberCount}`, inline: true }
    );
  }

  // Footer
  const footerText = leave.footerText;
  if (footerText && footerText.trim() && footerText !== ' ') {
    embed.setFooter({ text: parseLeaveMessage(footerText, member) });
  } else if (footerText !== ' ') {
    embed.setFooter({ text: `Now at ${member.guild.memberCount} members` });
  }

  // Timestamp
  if (leave.showTimestamp !== false) {
    embed.setTimestamp();
  }

  // Banner image
  if (leave.bannerUrl) {
    embed.setImage(leave.bannerUrl);
  }

  return embed;
}

/**
 * Parse leave message with variables
 */
function parseLeaveMessage(msg, member) {
  const joinedTimestamp = member.joinedTimestamp ? Math.floor(member.joinedTimestamp / 1000) : null;
  const duration = joinedTimestamp ? getDuration(member.joinedTimestamp) : 'Unknown';

  return msg
    .replace(/{user}/gi, `<@${member.user.id}>`)
    .replace(/{username}/gi, member.user.username)
    .replace(/{displayname}/gi, member.displayName || member.user.displayName || member.user.username)
    .replace(/{tag}/gi, member.user.tag)
    .replace(/{id}/gi, member.user.id)
    .replace(/{server}/gi, member.guild.name)
    .replace(/{membercount}/gi, member.guild.memberCount.toString())
    .replace(/{joindate}/gi, joinedTimestamp ? `<t:${joinedTimestamp}:D>` : 'Unknown')
    .replace(/{duration}/gi, duration)
    .replace(/{avatar}/gi, member.user.displayAvatarURL({ dynamic: true, size: 256 }))
    .replace(/\\n/g, '\n');
}

function getDuration(joinedTimestamp) {
  const diff = Date.now() - joinedTimestamp;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days > 365) {
    const years = Math.floor(days / 365);
    return `${years} year${years > 1 ? 's' : ''}`;
  } else if (days > 30) {
    const months = Math.floor(days / 30);
    return `${months} month${months > 1 ? 's' : ''}`;
  } else if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''}`;
  } else {
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  }
}

export { parseLeaveMessage, buildLeaveEmbed };
