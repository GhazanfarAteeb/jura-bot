import { PermissionFlagsBits, EmbedBuilder, ChannelType } from 'discord.js';
import Guild from '../../models/Guild.js';
import { successEmbed, errorEmbed, infoEmbed, GLYPHS } from '../../utils/embeds.js';
import { hasModPerms, getPrefix } from '../../utils/helpers.js';

export default {
  name: 'levelup',
  description: 'Configure level up announcement messages',
  usage: '<enable|disable|channel|message|embed|test|...>',
  aliases: ['lvlup', 'levelupmsg', 'lvlupmsg'],
  permissions: [PermissionFlagsBits.ManageGuild],
  cooldown: 3,

  async execute(message, args) {
    const guildConfig = await Guild.getGuild(message.guild.id, message.guild.name);
    const prefix = await getPrefix(message.guild.id);

    // Check for moderator permissions
    if (!hasModPerms(message.member, guildConfig)) {
      return message.reply({
        embeds: [await errorEmbed(message.guild.id, 'Permission Denied',
          `${GLYPHS.LOCK} You need Moderator/Staff permissions to configure level up messages.`)]
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
          $set: { 'features.levelSystem.announceLevelUp': true }
        });
        return message.reply({
          embeds: [await successEmbed(message.guild.id, 'Level Up Announcements Enabled',
            `${GLYPHS.SUCCESS} Level up announcements are now enabled.`)]
        });

      case 'disable':
      case 'off':
        await Guild.updateGuild(message.guild.id, {
          $set: { 'features.levelSystem.announceLevelUp': false }
        });
        return message.reply({
          embeds: [await successEmbed(message.guild.id, 'Level Up Announcements Disabled',
            `${GLYPHS.SUCCESS} Level up announcements are now disabled.`)]
        });

      case 'channel':
        const channel = message.mentions.channels.first() ||
          message.guild.channels.cache.get(args[1]);

        if (args[1] === 'current' || args[1] === 'same') {
          await Guild.updateGuild(message.guild.id, {
            $set: { 'features.levelSystem.levelUpChannel': null }
          });
          return message.reply({
            embeds: [await successEmbed(message.guild.id, 'Level Up Channel Set',
              `${GLYPHS.SUCCESS} Level up messages will be sent in the same channel where the user leveled up.`)]
          });
        }

        if (!channel) {
          return message.reply({
            embeds: [await infoEmbed(message.guild.id, 'Level Up Channel',
              `**Current:** ${guildConfig.features?.levelSystem?.levelUpChannel ? `<#${guildConfig.features.levelSystem.levelUpChannel}>` : 'Same channel (default)'}\n\n` +
              `**Usage:**\n` +
              `\`${prefix}levelup channel #channel\` - Set specific channel\n` +
              `\`${prefix}levelup channel current\` - Use same channel as message`)]
          });
        }

        if (channel.type !== ChannelType.GuildText) {
          return message.reply({
            embeds: [await errorEmbed(message.guild.id, 'Invalid Channel',
              'Please select a text channel.')]
          });
        }

        await Guild.updateGuild(message.guild.id, {
          $set: {
            'features.levelSystem.levelUpChannel': channel.id,
            'channels.levelUpChannel': channel.id
          }
        });

        return message.reply({
          embeds: [await successEmbed(message.guild.id, 'Level Up Channel Set',
            `${GLYPHS.SUCCESS} Level up messages will be sent to ${channel}`)]
        });

      case 'message':
      case 'msg':
      case 'description':
      case 'desc':
        const lvlMsg = args.slice(1).join(' ');

        if (!lvlMsg) {
          const currentMsg = guildConfig.features?.levelSystem?.levelUpMessage || '🎉 Congratulations {user}! You reached level {level}!';
          return message.reply({
            embeds: [await infoEmbed(message.guild.id, 'Level Up Message Variables',
              `**Current Message:**\n${currentMsg}\n\n` +
              `**Available Variables:**\n` +
              `${GLYPHS.DOT} \`{user}\` - Mentions the user\n` +
              `${GLYPHS.DOT} \`{username}\` - User's username\n` +
              `${GLYPHS.DOT} \`{displayname}\` - User's display name\n` +
              `${GLYPHS.DOT} \`{level}\` - New level reached\n` +
              `${GLYPHS.DOT} \`{oldlevel}\` - Previous level\n` +
              `${GLYPHS.DOT} \`{xp}\` - Total XP\n` +
              `${GLYPHS.DOT} \`{nextxp}\` - XP needed for next level\n` +
              `${GLYPHS.DOT} \`{server}\` - Server name\n` +
              `${GLYPHS.DOT} \`\\n\` - New line\n\n` +
              `**Example:**\n\`${prefix}levelup message 🎉 {user} leveled up to level {level}!\``)]
          });
        }

        await Guild.updateGuild(message.guild.id, {
          $set: { 'features.levelSystem.levelUpMessage': lvlMsg }
        });

        return message.reply({
          embeds: [await successEmbed(message.guild.id, 'Level Up Message Set',
            `${GLYPHS.SUCCESS} Level up message has been updated.\n\n` +
            `**Preview:**\n${parseLevelMessage(lvlMsg, message.member, 5, 4, 1250, 1500)}`)]
        });

      case 'embed':
        const embedOption = args[1]?.toLowerCase();

        if (!['on', 'off', 'enable', 'disable'].includes(embedOption)) {
          return message.reply({
            embeds: [await errorEmbed(message.guild.id, 'Invalid Option',
              `Use \`${prefix}levelup embed on\` or \`${prefix}levelup embed off\``)]
          });
        }

        const embedEnabled = ['on', 'enable'].includes(embedOption);
        await Guild.updateGuild(message.guild.id, {
          $set: { 'features.levelSystem.embedEnabled': embedEnabled }
        });

        return message.reply({
          embeds: [await successEmbed(message.guild.id, 'Embed Setting Updated',
            `${GLYPHS.SUCCESS} Level up embeds are now **${embedEnabled ? 'enabled' : 'disabled'}**`)]
        });

      case 'test':
        return sendTestLevelUp(message, guildConfig, prefix);

      case 'image':
      case 'banner':
        const imageUrl = args[1];

        if (!imageUrl) {
          const currentBanner = guildConfig.features?.levelSystem?.bannerUrl;
          return message.reply({
            embeds: [await infoEmbed(message.guild.id, 'Level Up Banner',
              currentBanner
                ? `**Current Banner:**\n${currentBanner}`
                : `No banner set. Use \`${prefix}levelup image <url>\` to set one, or \`${prefix}levelup image remove\` to remove.`)]
          });
        }

        if (imageUrl === 'remove' || imageUrl === 'none') {
          await Guild.updateGuild(message.guild.id, {
            $set: { 'features.levelSystem.bannerUrl': null }
          });
          return message.reply({
            embeds: [await successEmbed(message.guild.id, 'Banner Removed',
              `${GLYPHS.SUCCESS} Level up banner has been removed.`)]
          });
        }

        if (!imageUrl.match(/^https?:\/\/.+/i)) {
          return message.reply({
            embeds: [await errorEmbed(message.guild.id, 'Invalid URL',
              'Please provide a valid image URL starting with http:// or https://')]
          });
        }

        await Guild.updateGuild(message.guild.id, {
          $set: { 'features.levelSystem.bannerUrl': imageUrl }
        });

        return message.reply({
          embeds: [await successEmbed(message.guild.id, 'Banner Set',
            `${GLYPHS.SUCCESS} Level up banner has been set.`)]
        });

      case 'thumbnail':
      case 'thumb':
        const thumbUrl = args[1];

        if (!thumbUrl) {
          return message.reply({
            embeds: [await infoEmbed(message.guild.id, 'Level Up Thumbnail',
              guildConfig.features?.levelSystem?.thumbnailUrl
                ? `**Current Thumbnail:**\n${guildConfig.features.levelSystem.thumbnailUrl}`
                : 'No custom thumbnail set (defaults to user avatar).\n\n' +
                `\`${prefix}levelup thumbnail <url>\` - Set custom thumbnail\n` +
                `\`${prefix}levelup thumbnail avatar\` - Use user's avatar\n` +
                `\`${prefix}levelup thumbnail server\` - Use server icon\n` +
                `\`${prefix}levelup thumbnail remove\` - Remove thumbnail`)]
          });
        }

        if (thumbUrl === 'remove' || thumbUrl === 'none' || thumbUrl === 'off') {
          await Guild.updateGuild(message.guild.id, {
            $set: { 'features.levelSystem.thumbnailUrl': null, 'features.levelSystem.thumbnailType': null }
          });
          return message.reply({
            embeds: [await successEmbed(message.guild.id, 'Thumbnail Removed',
              `${GLYPHS.SUCCESS} Level up thumbnail has been removed.`)]
          });
        }

        if (thumbUrl === 'avatar' || thumbUrl === 'user') {
          await Guild.updateGuild(message.guild.id, {
            $set: { 'features.levelSystem.thumbnailType': 'avatar', 'features.levelSystem.thumbnailUrl': null }
          });
          return message.reply({
            embeds: [await successEmbed(message.guild.id, 'Thumbnail Set',
              `${GLYPHS.SUCCESS} Thumbnail will show the user's avatar.`)]
          });
        }

        if (thumbUrl === 'server' || thumbUrl === 'guild') {
          await Guild.updateGuild(message.guild.id, {
            $set: { 'features.levelSystem.thumbnailType': 'server', 'features.levelSystem.thumbnailUrl': null }
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
          $set: { 'features.levelSystem.thumbnailUrl': thumbUrl, 'features.levelSystem.thumbnailType': 'custom' }
        });

        return message.reply({
          embeds: [await successEmbed(message.guild.id, 'Thumbnail Set',
            `${GLYPHS.SUCCESS} Level up thumbnail has been set.`)]
        });

      case 'title':
        const titleText = args.slice(1).join(' ');

        if (!titleText) {
          return message.reply({
            embeds: [await infoEmbed(message.guild.id, 'Embed Title',
              `**Current Title:**\n${guildConfig.features?.levelSystem?.embedTitle || 'Default: 🎉 Level Up!'}\n\n` +
              `Use \`${prefix}levelup title <text>\` to set a custom title.\n` +
              `Use \`${prefix}levelup title reset\` for default.\n` +
              `Use \`${prefix}levelup title none\` to remove title.\n\n` +
              `**Variables:** {username}, {level}`)]
          });
        }

        if (titleText === 'reset' || titleText === 'default') {
          await Guild.updateGuild(message.guild.id, {
            $set: { 'features.levelSystem.embedTitle': null }
          });
          return message.reply({
            embeds: [await successEmbed(message.guild.id, 'Title Reset',
              `${GLYPHS.SUCCESS} Level up embed title reset to default.`)]
          });
        }

        if (titleText === 'none' || titleText === 'remove') {
          await Guild.updateGuild(message.guild.id, {
            $set: { 'features.levelSystem.embedTitle': ' ' }
          });
          return message.reply({
            embeds: [await successEmbed(message.guild.id, 'Title Removed',
              `${GLYPHS.SUCCESS} Level up embed title has been removed.`)]
          });
        }

        await Guild.updateGuild(message.guild.id, {
          $set: { 'features.levelSystem.embedTitle': titleText }
        });

        return message.reply({
          embeds: [await successEmbed(message.guild.id, 'Title Set',
            `${GLYPHS.SUCCESS} Level up embed title set to: ${titleText}`)]
        });

      case 'footer':
        const footerText = args.slice(1).join(' ');

        if (!footerText) {
          return message.reply({
            embeds: [await infoEmbed(message.guild.id, 'Embed Footer',
              `**Current Footer:**\n${guildConfig.features?.levelSystem?.footerText || 'Default: XP progress'}\n\n` +
              `Use \`${prefix}levelup footer <text>\` to set a custom footer.\n` +
              `Use \`${prefix}levelup footer reset\` for default.\n` +
              `Use \`${prefix}levelup footer none\` to remove footer.\n\n` +
              `**Variables:** {xp}, {nextxp}, {level}`)]
          });
        }

        if (footerText === 'reset' || footerText === 'default') {
          await Guild.updateGuild(message.guild.id, {
            $set: { 'features.levelSystem.footerText': null }
          });
          return message.reply({
            embeds: [await successEmbed(message.guild.id, 'Footer Reset',
              `${GLYPHS.SUCCESS} Level up footer reset to default.`)]
          });
        }

        if (footerText === 'none' || footerText === 'remove') {
          await Guild.updateGuild(message.guild.id, {
            $set: { 'features.levelSystem.footerText': ' ' }
          });
          return message.reply({
            embeds: [await successEmbed(message.guild.id, 'Footer Removed',
              `${GLYPHS.SUCCESS} Level up footer has been removed.`)]
          });
        }

        await Guild.updateGuild(message.guild.id, {
          $set: { 'features.levelSystem.footerText': footerText }
        });

        return message.reply({
          embeds: [await successEmbed(message.guild.id, 'Footer Set',
            `${GLYPHS.SUCCESS} Level up footer set to: ${footerText}`)]
        });

      case 'color':
        const colorHex = args[1];

        if (!colorHex) {
          return message.reply({
            embeds: [await infoEmbed(message.guild.id, 'Embed Color',
              `**Current Color:**\n${guildConfig.features?.levelSystem?.embedColor || '#FFD700'}\n\n` +
              `Use \`${prefix}levelup color #HEX\` to set a custom color.\n` +
              `Use \`${prefix}levelup color reset\` for default gold.`)]
          });
        }

        if (colorHex === 'reset' || colorHex === 'default') {
          await Guild.updateGuild(message.guild.id, {
            $set: { 'features.levelSystem.embedColor': '#FFD700' }
          });
          return message.reply({
            embeds: [await successEmbed(message.guild.id, 'Color Reset',
              `${GLYPHS.SUCCESS} Level up embed color reset to default gold.`)]
          });
        }

        if (!colorHex.match(/^#?[0-9A-Fa-f]{6}$/)) {
          return message.reply({
            embeds: [await errorEmbed(message.guild.id, 'Invalid Color',
              'Please provide a valid hex color code (e.g., #FFD700)')]
          });
        }

        const normalizedColor = colorHex.startsWith('#') ? colorHex : `#${colorHex}`;
        await Guild.updateGuild(message.guild.id, {
          $set: { 'features.levelSystem.embedColor': normalizedColor }
        });

        return message.reply({
          embeds: [await successEmbed(message.guild.id, 'Color Set',
            `${GLYPHS.SUCCESS} Level up embed color set to: ${normalizedColor}`)]
        });

      case 'mention':
        const mentionOption = args[1]?.toLowerCase();

        if (!['on', 'off', 'enable', 'disable'].includes(mentionOption)) {
          return message.reply({
            embeds: [await errorEmbed(message.guild.id, 'Invalid Option',
              `Use \`${prefix}levelup mention on\` or \`${prefix}levelup mention off\``)]
          });
        }

        const mentionEnabled = ['on', 'enable'].includes(mentionOption);
        await Guild.updateGuild(message.guild.id, {
          $set: { 'features.levelSystem.mentionUser': mentionEnabled }
        });

        return message.reply({
          embeds: [await successEmbed(message.guild.id, 'Mention Setting Updated',
            `${GLYPHS.SUCCESS} User mention in level up messages is now **${mentionEnabled ? 'enabled' : 'disabled'}**`)]
        });

      case 'progress':
        const progressOption = args[1]?.toLowerCase();

        if (!['on', 'off', 'enable', 'disable'].includes(progressOption)) {
          return message.reply({
            embeds: [await errorEmbed(message.guild.id, 'Invalid Option',
              `Use \`${prefix}levelup progress on\` or \`${prefix}levelup progress off\``)]
          });
        }

        const showProgress = ['on', 'enable'].includes(progressOption);
        await Guild.updateGuild(message.guild.id, {
          $set: { 'features.levelSystem.showProgress': showProgress }
        });

        return message.reply({
          embeds: [await successEmbed(message.guild.id, 'Progress Setting Updated',
            `${GLYPHS.SUCCESS} XP progress bar is now **${showProgress ? 'enabled' : 'disabled'}**`)]
        });

      case 'preview':
        return showPreview(message, guildConfig);

      case 'help':
        return showHelp(message, prefix);

      default:
        return message.reply({
          embeds: [await errorEmbed(message.guild.id, 'Unknown Option',
            `Unknown option: \`${action}\`\n\nUse \`${prefix}levelup help\` for available commands.`)]
        });
    }
  }
};

async function showStatus(message, guildConfig, prefix) {
  const level = guildConfig.features?.levelSystem || {};
  const channel = level.levelUpChannel ? message.guild.channels.cache.get(level.levelUpChannel) : null;

  const embed = new EmbedBuilder()
    .setColor(level.embedColor || '#FFD700')
    .setTitle('🎉 Level Up Announcement System')
    .setDescription('Celebrate when members level up!')
    .addFields(
      { name: '▸ Status', value: level.announceLevelUp !== false ? '`✅ Enabled`' : '`❌ Disabled`', inline: true },
      { name: '▸ Channel', value: channel ? `${channel}` : '`Same channel`', inline: true },
      { name: '▸ Embed', value: level.embedEnabled !== false ? '`✅ On`' : '`❌ Off`', inline: true },
      { name: '▸ Message', value: `\`\`\`${(level.levelUpMessage || '🎉 Congratulations {user}! You reached level {level}!').slice(0, 100)}\`\`\``, inline: false }
    )
    .addFields(
      {
        name: '📝 Commands', value:
          `\`${prefix}levelup enable\` - Enable level up messages\n` +
          `\`${prefix}levelup disable\` - Disable level up messages\n` +
          `\`${prefix}levelup channel #channel\` - Set announcement channel\n` +
          `\`${prefix}levelup message <text>\` - Set level up message\n` +
          `\`${prefix}levelup test\` - Send a test message\n` +
          `\`${prefix}levelup help\` - Show all options`, inline: false
      }
    )
    .setFooter({ text: `Use ${prefix}levelup help for all customization options` });

  return message.reply({ embeds: [embed] });
}

async function showHelp(message, prefix) {
  const helpEmbed = new EmbedBuilder()
    .setColor('#FFD700')
    .setTitle('🎉 Level Up Message Configuration')
    .setDescription('All available commands for customizing level up announcements.')
    .addFields(
      {
        name: '🔧 Basic Setup', value:
          `\`${prefix}levelup enable\` - Enable announcements\n` +
          `\`${prefix}levelup disable\` - Disable announcements\n` +
          `\`${prefix}levelup channel #channel\` - Set channel\n` +
          `\`${prefix}levelup channel current\` - Use same channel\n` +
          `\`${prefix}levelup message <text>\` - Set message`, inline: false
      },
      {
        name: '🎨 Embed Customization', value:
          `\`${prefix}levelup embed on/off\` - Toggle embed mode\n` +
          `\`${prefix}levelup color #hex\` - Set embed color\n` +
          `\`${prefix}levelup title <text>\` - Set embed title\n` +
          `\`${prefix}levelup footer <text>\` - Set embed footer\n` +
          `\`${prefix}levelup image <url>\` - Set banner image\n` +
          `\`${prefix}levelup thumbnail <type>\` - Set thumbnail`, inline: false
      },
      {
        name: '⚙️ Display Options', value:
          `\`${prefix}levelup mention on/off\` - Toggle user ping\n` +
          `\`${prefix}levelup progress on/off\` - Show XP progress`, inline: false
      },
      {
        name: '🔍 Preview & Test', value:
          `\`${prefix}levelup test\` - Send test to channel\n` +
          `\`${prefix}levelup preview\` - Preview here`, inline: false
      }
    );

  const varsEmbed = new EmbedBuilder()
    .setColor('#FFD700')
    .setTitle('📋 Available Variables')
    .setDescription(
      '`{user}` - Mentions the user\n' +
      '`{username}` - User\'s username\n' +
      '`{displayname}` - User\'s display name\n' +
      '`{level}` - New level reached\n' +
      '`{oldlevel}` - Previous level\n' +
      '`{xp}` - Total XP\n' +
      '`{nextxp}` - XP needed for next level\n' +
      '`{server}` - Server name\n' +
      '`\\n` - New line'
    );

  return message.reply({ embeds: [helpEmbed, varsEmbed] });
}

async function showPreview(message, guildConfig) {
  const level = guildConfig.features?.levelSystem || {};
  const embed = buildLevelUpEmbed(message.member, level, guildConfig, 5, 4, 1250, 1500);

  await message.reply({
    embeds: [await infoEmbed(message.guild.id, 'Level Up Preview',
      'Here\'s how your level up message will look:')]
  });

  await message.channel.send({ embeds: [embed] });
}

async function sendTestLevelUp(message, guildConfig, prefix) {
  const level = guildConfig.features?.levelSystem || {};
  const channel = level.levelUpChannel ? message.guild.channels.cache.get(level.levelUpChannel) : message.channel;

  if (!channel) {
    return message.reply({
      embeds: [await errorEmbed(message.guild.id, 'No Channel',
        `Level up channel not found. Use \`${prefix}levelup channel #channel\` to set one.`)]
    });
  }

  if (level.embedEnabled !== false) {
    const embed = buildLevelUpEmbed(message.member, level, guildConfig, 5, 4, 1250, 1500);
    await channel.send({ embeds: [embed] });
  } else {
    const lvlMsg = parseLevelMessage(
      level.levelUpMessage || '🎉 Congratulations {user}! You reached level {level}!',
      message.member, 5, 4, 1250, 1500
    );
    await channel.send(lvlMsg);
  }

  return message.reply({
    embeds: [await successEmbed(message.guild.id, 'Test Sent',
      `${GLYPHS.SUCCESS} Test level up message sent to ${channel}`)]
  });
}

/**
 * Build the level up embed based on settings
 */
function buildLevelUpEmbed(member, level, guildConfig, newLevel, oldLevel, totalXp, nextLevelXp) {
  const lvlMsg = parseLevelMessage(
    level.levelUpMessage || '🎉 Congratulations {user}! You reached level {level}!',
    member, newLevel, oldLevel, totalXp, nextLevelXp
  );

  const embed = new EmbedBuilder()
    .setColor(level.embedColor || '#FFD700');

  // Author section - show user info
  embed.setAuthor({
    name: member.user.username,
    iconURL: member.user.displayAvatarURL({ dynamic: true, size: 128 })
  });

  // Title
  const title = level.embedTitle;
  if (title && title.trim() && title !== ' ') {
    embed.setTitle(parseLevelMessage(title, member, newLevel, oldLevel, totalXp, nextLevelXp));
  } else if (title !== ' ') {
    embed.setTitle('🎉 Level Up!');
  }

  // Description
  embed.setDescription(lvlMsg);

  // Thumbnail
  if (level.thumbnailType === 'server') {
    embed.setThumbnail(member.guild.iconURL({ dynamic: true, size: 256 }));
  } else if (level.thumbnailUrl) {
    embed.setThumbnail(level.thumbnailUrl);
  } else {
    // Default to avatar
    embed.setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }));
  }

  // Show progress
  if (level.showProgress !== false) {
    const progress = Math.round((totalXp / nextLevelXp) * 100);
    const progressBar = createProgressBar(progress);
    embed.addFields(
      { name: '▸ Progress to Next Level', value: `${progressBar} ${progress}%`, inline: false }
    );
  }

  // Footer
  const footerText = level.footerText;
  if (footerText && footerText.trim() && footerText !== ' ') {
    embed.setFooter({ text: parseLevelMessage(footerText, member, newLevel, oldLevel, totalXp, nextLevelXp) });
  } else if (footerText !== ' ') {
    embed.setFooter({ text: `${totalXp.toLocaleString()} / ${nextLevelXp.toLocaleString()} XP` });
  }

  // Timestamp
  if (level.showTimestamp !== false) {
    embed.setTimestamp();
  }

  // Banner image
  if (level.bannerUrl) {
    embed.setImage(level.bannerUrl);
  }

  return embed;
}

/**
 * Parse level up message with variables
 */
function parseLevelMessage(msg, member, newLevel, oldLevel, totalXp, nextLevelXp) {
  return msg
    .replace(/{user}/gi, `<@${member.user.id}>`)
    .replace(/{username}/gi, member.user.username)
    .replace(/{displayname}/gi, member.displayName || member.user.displayName || member.user.username)
    .replace(/{level}/gi, newLevel.toString())
    .replace(/{oldlevel}/gi, oldLevel.toString())
    .replace(/{xp}/gi, totalXp.toLocaleString())
    .replace(/{nextxp}/gi, nextLevelXp.toLocaleString())
    .replace(/{server}/gi, member.guild.name)
    .replace(/\\n/g, '\n');
}

function createProgressBar(percent, length = 10) {
  const filled = Math.round((percent / 100) * length);
  const empty = length - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

export { parseLevelMessage, buildLevelUpEmbed };
