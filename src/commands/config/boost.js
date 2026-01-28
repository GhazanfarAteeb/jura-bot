import { PermissionFlagsBits, EmbedBuilder, ChannelType } from 'discord.js';
import Guild from '../../models/Guild.js';
import BoosterRole from '../../models/BoosterRole.js';
import { successEmbed, errorEmbed, infoEmbed, GLYPHS } from '../../utils/embeds.js';
import { hasModPerms, getPrefix } from '../../utils/helpers.js';
import { parseBoostMessage, buildBoostEmbed } from '../../events/client/boostHandler.js';

export default {
  name: 'boost',
  description: 'Configure server boost appreciation protocols, Master',
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

      case 'author':
        const authorOption = args[1]?.toLowerCase();

        if (!authorOption) {
          return message.reply({
            embeds: [await infoEmbed(message.guild.id, 'Author Settings',
              `**Current:** ${guildConfig.features?.boostSystem?.authorType || 'username (with avatar)'}\n\n` +
              `\`${prefix}boost author username\` - Show username with avatar\n` +
              `\`${prefix}boost author displayname\` - Show display name with avatar\n` +
              `\`${prefix}boost author server\` - Show server name with icon\n` +
              `\`${prefix}boost author none\` - No author section`)]
          });
        }

        const validAuthorTypes = ['username', 'displayname', 'display', 'server', 'guild', 'none', 'remove'];
        if (!validAuthorTypes.includes(authorOption)) {
          return message.reply({
            embeds: [await errorEmbed(message.guild.id, 'Invalid Option',
              'Valid options: `username`, `displayname`, `server`, `none`')]
          });
        }

        let authorType = authorOption;
        if (authorOption === 'display') authorType = 'displayname';
        if (authorOption === 'guild') authorType = 'server';
        if (authorOption === 'remove') authorType = 'none';

        await Guild.updateGuild(message.guild.id, {
          $set: { 'features.boostSystem.authorType': authorType }
        });

        return message.reply({
          embeds: [await successEmbed(message.guild.id, 'Author Setting Updated',
            `${GLYPHS.SUCCESS} Author section set to: **${authorType}**`)]
        });

      case 'timestamp':
        const timestampOption = args[1]?.toLowerCase();

        if (!['on', 'off', 'enable', 'disable'].includes(timestampOption)) {
          return message.reply({
            embeds: [await errorEmbed(message.guild.id, 'Invalid Option',
              `Use \`${prefix}boost timestamp on\` or \`${prefix}boost timestamp off\``)]
          });
        }

        const timestampEnabled = ['on', 'enable'].includes(timestampOption);
        await Guild.updateGuild(message.guild.id, {
          $set: { 'features.boostSystem.showTimestamp': timestampEnabled }
        });

        return message.reply({
          embeds: [await successEmbed(message.guild.id, 'Timestamp Setting Updated',
            `${GLYPHS.SUCCESS} Timestamp is now **${timestampEnabled ? 'enabled' : 'disabled'}**`)]
        });

      case 'reset':
        await Guild.updateGuild(message.guild.id, {
          $set: {
            'features.boostSystem': {
              enabled: false,
              channel: null,
              message: null,
              embedEnabled: true,
              embedColor: '#f47fff',
              embedTitle: null,
              bannerUrl: null,
              thumbnailUrl: null,
              thumbnailType: 'avatar',
              footerText: null,
              showTimestamp: true,
              mentionUser: true,
              greetingText: null,
              authorType: 'username'
            }
          }
        });

        return message.reply({
          embeds: [await successEmbed(message.guild.id, 'Boost System Reset',
            `${GLYPHS.SUCCESS} All boost message settings have been reset to defaults.`)]
        });

      // Booster Role System commands
      case 'role':
      case 'setrole':
        return setBoosterRole(message, args, guildConfig, prefix);

      case 'give':
      case 'assign':
        return giveBoosterRole(message, args, guildConfig, prefix);

      case 'take':
      case 'revoke':
        return removeBoosterRole(message, args, guildConfig, prefix);

      case 'list':
      case 'active':
        return listActiveBoosterRoles(message, guildConfig, prefix);

      case 'duration':
      case 'time':
        return setRoleDuration(message, args, guildConfig, prefix);

      case 'clearrole':
        return clearBoosterRole(message, guildConfig, prefix);

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
  const boosterRole = guildConfig.features?.boosterRoleSystem || {};
  const channel = boost.channel ? message.guild.channels.cache.get(boost.channel) : null;
  const role = boosterRole.roleId ? message.guild.roles.cache.get(boosterRole.roleId) : null;

  const embed = new EmbedBuilder()
    .setColor(boost.embedColor || '#f47fff')
    .setTitle('『 Boost Thank You System 』')
    .setDescription(
      `**▸ Status:** ${boost.enabled ? '◉ Active' : '○ Inactive'}\n` +
      `**▸ Channel:** ${channel || 'Not configured'}\n` +
      `**▸ Embed Mode:** ${boost.embedEnabled !== false ? '◉' : '○'}\n` +
      `**▸ Mention User:** ${boost.mentionUser !== false ? '◉' : '○'}\n` +
      `**▸ Timestamp:** ${boost.showTimestamp !== false ? '◉' : '○'}\n\n` +
      `**▸ Color:** ${boost.embedColor || '#f47fff'}\n` +
      `**▸ Title:** ${boost.embedTitle ? 'Custom' : 'Default decorative'}\n` +
      `**▸ Author:** ${boost.authorType || 'username'}\n` +
      `**▸ Thumbnail:** ${boost.thumbnailType || boost.thumbnailUrl || 'avatar'}\n` +
      `**▸ Banner:** ${boost.bannerUrl ? '◉ Set' : '○ Not set'}\n\n` +
      `**▸ Temp Role:** ${role || 'Not set'}\n` +
      `**▸ Role Duration:** ${boosterRole.duration || 24} hours\n\n` +
      `**Current Message:**\n\`\`\`${(boost.message || 'Thank you {user} for boosting {server}! 🎉').slice(0, 100)}\`\`\`\n` +
      `Type \`${prefix}boost help\` for all commands.`
    )
    .setFooter({ text: `Use ${prefix}boost help for all customization options` });

  return message.reply({ embeds: [embed] });
}

async function showHelp(message, prefix) {
  const helpEmbed = new EmbedBuilder()
    .setColor('#f47fff')
    .setTitle('『 Boost Commands 』')
    .setDescription('All available commands for customizing boost thank you messages.')
    .addFields(
      {
        name: '🔧 Basic Setup', value:
          `${GLYPHS.DOT} \`${prefix}boost enable/disable\` - Toggle system\n` +
          `${GLYPHS.DOT} \`${prefix}boost channel #channel\` - Set boost channel\n` +
          `${GLYPHS.DOT} \`${prefix}boost test\` - Test boost message\n` +
          `${GLYPHS.DOT} \`${prefix}boost preview\` - Preview current settings\n` +
          `${GLYPHS.DOT} \`${prefix}boost reset\` - Reset all settings`, inline: false
      },
      {
        name: '📝 Content', value:
          `${GLYPHS.DOT} \`${prefix}boost message <text>\` - Embed description\n` +
          `${GLYPHS.DOT} \`${prefix}boost greeting <text>\` - Text above embed\n` +
          `${GLYPHS.DOT} \`${prefix}boost title <text>\` - Embed title\n` +
          `${GLYPHS.DOT} \`${prefix}boost footer <text>\` - Footer text`, inline: false
      },
      {
        name: '🎨 Appearance', value:
          `${GLYPHS.DOT} \`${prefix}boost color #HEX\` - Embed color\n` +
          `${GLYPHS.DOT} \`${prefix}boost image <url>\` - Banner image\n` +
          `${GLYPHS.DOT} \`${prefix}boost thumbnail <url|avatar|server>\`\n` +
          `${GLYPHS.DOT} \`${prefix}boost author <username|displayname|server|none>\``, inline: false
      },
      {
        name: '⚙️ Toggles', value:
          `${GLYPHS.DOT} \`${prefix}boost embed on/off\` - Toggle embed mode\n` +
          `${GLYPHS.DOT} \`${prefix}boost mention on/off\` - Ping user above embed\n` +
          `${GLYPHS.DOT} \`${prefix}boost timestamp on/off\` - Show timestamp`, inline: false
      },
      {
        name: '🎭 Temporary Booster Role', value:
          `${GLYPHS.DOT} \`${prefix}boost role @role\` - Set temp booster role\n` +
          `${GLYPHS.DOT} \`${prefix}boost give @user [reason]\` - Give role to user\n` +
          `${GLYPHS.DOT} \`${prefix}boost take @user\` - Remove role from user\n` +
          `${GLYPHS.DOT} \`${prefix}boost duration <hours>\` - Set role duration\n` +
          `${GLYPHS.DOT} \`${prefix}boost list\` - Show active booster roles\n` +
          `${GLYPHS.DOT} \`${prefix}boost clearrole\` - Remove role config`, inline: false
      }
    );

  const varsEmbed = new EmbedBuilder()
    .setColor('#f47fff')
    .setTitle('『 Variables 』')
    .setDescription(
      `Use these in message, title, footer, or greeting:\n\n` +
      `${GLYPHS.DOT} \`{user}\` - Mentions the user (@user)\n` +
      `${GLYPHS.DOT} \`{username}\` - Username\n` +
      `${GLYPHS.DOT} \`{displayname}\` - Display name\n` +
      `${GLYPHS.DOT} \`{tag}\` - User's tag\n` +
      `${GLYPHS.DOT} \`{id}\` - User's ID\n` +
      `${GLYPHS.DOT} \`{server}\` - Server name\n` +
      `${GLYPHS.DOT} \`{membercount}\` - Member count\n` +
      `${GLYPHS.DOT} \`{boostcount}\` - Total boost count\n` +
      `${GLYPHS.DOT} \`{boostlevel}\` - Server boost level (0-3)\n` +
      `${GLYPHS.DOT} \`{avatar}\` - Avatar URL\n` +
      `${GLYPHS.DOT} \`\\n\` - New line`
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

// ============================================
// Booster Role System Functions
// ============================================

async function setBoosterRole(message, args, guildConfig, prefix) {
  const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[1]);

  if (!role) {
    return message.reply({
      embeds: [await errorEmbed(message.guild.id, 'Role Not Found',
        `${GLYPHS.ERROR} Please mention a valid role!\n\n**Usage:** \`${prefix}boost role @role\``)]
    });
  }

  // Check role hierarchy
  if (role.position >= message.guild.members.me.roles.highest.position) {
    return message.reply({
      embeds: [await errorEmbed(message.guild.id, 'Role Too High',
        `${GLYPHS.ERROR} I cannot manage ${role} because it's higher than or equal to my highest role.`)]
    });
  }

  if (role.managed) {
    return message.reply({
      embeds: [await errorEmbed(message.guild.id, 'Managed Role',
        `${GLYPHS.ERROR} ${role} is managed by an integration and cannot be assigned manually.`)]
    });
  }

  await Guild.updateGuild(message.guild.id, {
    $set: {
      'features.boosterRoleSystem.roleId': role.id,
      'features.boosterRoleSystem.enabled': true
    }
  });

  const duration = guildConfig.features?.boosterRoleSystem?.duration || 24;

  return message.reply({
    embeds: [await successEmbed(message.guild.id, 'Booster Role Set',
      `${GLYPHS.SUCCESS} The temporary booster role has been set to ${role}.\n\n` +
      `Users given this role will have it automatically removed after **${duration} hours**.`)]
  });
}

async function giveBoosterRole(message, args, guildConfig, prefix) {
  const boosterRoleId = guildConfig.features?.boosterRoleSystem?.roleId;

  if (!boosterRoleId) {
    return message.reply({
      embeds: [await errorEmbed(message.guild.id, 'No Role Configured',
        `${GLYPHS.ERROR} No booster role has been configured!\n\n**Usage:** \`${prefix}boost role @role\``)]
    });
  }

  if (!guildConfig.features?.boosterRoleSystem?.enabled) {
    return message.reply({
      embeds: [await errorEmbed(message.guild.id, 'System Disabled',
        `${GLYPHS.ERROR} The booster role system is disabled!\n\nSet a role first: \`${prefix}boost role @role\``)]
    });
  }

  const member = message.mentions.members.first() || await message.guild.members.fetch(args[1]).catch(() => null);

  if (!member) {
    return message.reply({
      embeds: [await errorEmbed(message.guild.id, 'User Not Found',
        `${GLYPHS.ERROR} Please mention a valid user!\n\n**Usage:** \`${prefix}boost give @user [reason]\``)]
    });
  }

  const role = message.guild.roles.cache.get(boosterRoleId);

  if (!role) {
    return message.reply({
      embeds: [await errorEmbed(message.guild.id, 'Role Not Found',
        `${GLYPHS.ERROR} The configured booster role no longer exists. Please set a new one.`)]
    });
  }

  // Check if user already has the role
  if (member.roles.cache.has(boosterRoleId)) {
    // Update the expiry time
    const duration = (guildConfig.features?.boosterRoleSystem?.duration || 24) * 60 * 60 * 1000;
    const reason = args.slice(2).join(' ') || null;

    await BoosterRole.addBoosterRole(
      message.guild.id,
      member.id,
      boosterRoleId,
      duration,
      message.author.id,
      reason
    );

    const expiresAt = new Date(Date.now() + duration);
    return message.reply({
      embeds: [await infoEmbed(message.guild.id, 'Role Extended',
        `${GLYPHS.INFO} ${member}'s booster role duration has been extended!\n\n` +
        `**Expires:** <t:${Math.floor(expiresAt.getTime() / 1000)}:R>`)]
    });
  }

  try {
    // Add the role to the user
    await member.roles.add(role);

    // Add to database for tracking
    const duration = (guildConfig.features?.boosterRoleSystem?.duration || 24) * 60 * 60 * 1000;
    const reason = args.slice(2).join(' ') || null;

    await BoosterRole.addBoosterRole(
      message.guild.id,
      member.id,
      boosterRoleId,
      duration,
      message.author.id,
      reason
    );

    const expiresAt = new Date(Date.now() + duration);

    return message.reply({
      embeds: [await successEmbed(message.guild.id, 'Booster Role Given',
        `${GLYPHS.SUCCESS} Successfully gave ${role} to ${member}!\n\n` +
        `**Expires:** <t:${Math.floor(expiresAt.getTime() / 1000)}:F> (<t:${Math.floor(expiresAt.getTime() / 1000)}:R>)` +
        (reason ? `\n**Reason:** ${reason}` : ''))]
    });
  } catch (error) {
    console.error('Error giving booster role:', error);
    return message.reply({
      embeds: [await errorEmbed(message.guild.id, 'Error',
        `${GLYPHS.ERROR} Failed to give the booster role. Make sure I have the proper permissions.`)]
    });
  }
}

async function removeBoosterRole(message, args, guildConfig, prefix) {
  const boosterRoleId = guildConfig.features?.boosterRoleSystem?.roleId;

  if (!boosterRoleId) {
    return message.reply({
      embeds: [await errorEmbed(message.guild.id, 'No Role Configured',
        `${GLYPHS.ERROR} No booster role has been configured!`)]
    });
  }

  const member = message.mentions.members.first() || await message.guild.members.fetch(args[1]).catch(() => null);

  if (!member) {
    return message.reply({
      embeds: [await errorEmbed(message.guild.id, 'User Not Found',
        `${GLYPHS.ERROR} Please mention a valid user!\n\n**Usage:** \`${prefix}boost take @user\``)]
    });
  }

  const role = message.guild.roles.cache.get(boosterRoleId);

  if (!member.roles.cache.has(boosterRoleId)) {
    return message.reply({
      embeds: [await errorEmbed(message.guild.id, 'No Role',
        `${GLYPHS.ERROR} ${member} doesn't have the booster role.`)]
    });
  }

  try {
    // Remove the role from the user
    if (role) {
      await member.roles.remove(role);
    }

    // Remove from database
    await BoosterRole.removeBoosterRole(message.guild.id, member.id, boosterRoleId);

    return message.reply({
      embeds: [await successEmbed(message.guild.id, 'Booster Role Removed',
        `${GLYPHS.SUCCESS} Successfully removed the booster role from ${member}.`)]
    });
  } catch (error) {
    console.error('Error removing booster role:', error);
    return message.reply({
      embeds: [await errorEmbed(message.guild.id, 'Error',
        `${GLYPHS.ERROR} Failed to remove the booster role. Make sure I have the proper permissions.`)]
    });
  }
}

async function listActiveBoosterRoles(message, guildConfig, prefix) {
  const activeRoles = await BoosterRole.getGuildBoosterRoles(message.guild.id);

  if (activeRoles.length === 0) {
    return message.reply({
      embeds: [await infoEmbed(message.guild.id, 'No Active Booster Roles',
        `${GLYPHS.INFO} There are no active temporary booster roles in this server.`)]
    });
  }

  const fields = [];
  for (const entry of activeRoles.slice(0, 25)) {
    const member = await message.guild.members.fetch(entry.userId).catch(() => null);
    const role = message.guild.roles.cache.get(entry.roleId);
    const expiresTimestamp = Math.floor(entry.expiresAt.getTime() / 1000);

    fields.push({
      name: member ? member.user.tag : `User ID: ${entry.userId}`,
      value: `**Role:** ${role ? role.toString() : 'Unknown'}\n` +
        `**Expires:** <t:${expiresTimestamp}:R>\n` +
        (entry.reason ? `**Reason:** ${entry.reason}` : ''),
      inline: true
    });
  }

  const embed = new EmbedBuilder()
    .setTitle(`${GLYPHS.SPARKLE} Active Booster Roles`)
    .setColor(guildConfig.embedStyle?.color || '#5865F2')
    .setDescription(`Showing ${activeRoles.length} active booster role(s)`)
    .addFields(fields)
    .setFooter({ text: 'Roles are automatically removed when they expire' });

  return message.reply({ embeds: [embed] });
}

async function setRoleDuration(message, args, guildConfig, prefix) {
  const hours = parseInt(args[1]);

  if (isNaN(hours) || hours < 1 || hours > 720) {
    return message.reply({
      embeds: [await errorEmbed(message.guild.id, 'Invalid Duration',
        `${GLYPHS.ERROR} Please provide a valid duration between 1 and 720 hours (30 days).\n\n` +
        `**Usage:** \`${prefix}boost duration <hours>\``)]
    });
  }

  await Guild.updateGuild(message.guild.id, {
    $set: { 'features.boosterRoleSystem.duration': hours }
  });

  return message.reply({
    embeds: [await successEmbed(message.guild.id, 'Duration Updated',
      `${GLYPHS.SUCCESS} Booster role duration has been set to **${hours} hours**.\n\n` +
      `This will apply to new role assignments. Existing assignments will keep their original expiry time.`)]
  });
}

async function clearBoosterRole(message, guildConfig, prefix) {
  await Guild.updateGuild(message.guild.id, {
    $unset: { 'features.boosterRoleSystem.roleId': '' },
    $set: { 'features.boosterRoleSystem.enabled': false }
  });

  return message.reply({
    embeds: [await successEmbed(message.guild.id, 'Booster Role Cleared',
      `${GLYPHS.SUCCESS} The booster role configuration has been cleared.\n\n` +
      `**Note:** Existing role assignments will still be tracked and removed when they expire.`)]
  });
}
