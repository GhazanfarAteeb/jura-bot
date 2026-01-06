import { PermissionFlagsBits, EmbedBuilder, ChannelType } from 'discord.js';
import Guild from '../../models/Guild.js';
import { successEmbed, errorEmbed, infoEmbed, GLYPHS } from '../../utils/embeds.js';

export default {
  name: 'welcome',
  description: 'Configure welcome messages for new members',
  usage: '<enable|disable|channel|message|embed|dm|test>',
  aliases: ['welcomemsg', 'greet'],
  permissions: {
    user: PermissionFlagsBits.ManageGuild
  },
  cooldown: 3,

  async execute(message, args) {
    const guildConfig = await Guild.getGuild(message.guild.id, message.guild.name);

    if (!args[0]) {
      return showStatus(message, guildConfig);
    }

    const action = args[0].toLowerCase();

    switch (action) {
      case 'enable':
      case 'on':
        await Guild.updateGuild(message.guild.id, {
          $set: { 'features.welcomeSystem.enabled': true }
        });
        return message.reply({
          embeds: [await successEmbed(message.guild.id, 'Welcome System Enabled',
            `${GLYPHS.SUCCESS} Welcome messages are now enabled.\n\n` +
            `Make sure to set a channel: \`welcome channel #channel\``)]
        });

      case 'disable':
      case 'off':
        await Guild.updateGuild(message.guild.id, {
          $set: { 'features.welcomeSystem.enabled': false }
        });
        return message.reply({
          embeds: [await successEmbed(message.guild.id, 'Welcome System Disabled',
            `${GLYPHS.SUCCESS} Welcome messages are now disabled.`)]
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
          $set: {
            'features.welcomeSystem.channel': channel.id,
            'channels.welcomeChannel': channel.id
          }
        });

        return message.reply({
          embeds: [await successEmbed(message.guild.id, 'Welcome Channel Set',
            `${GLYPHS.SUCCESS} Welcome messages will be sent to ${channel}`)]
        });

      case 'message':
      case 'msg':
        const welcomeMsg = args.slice(1).join(' ');

        if (!welcomeMsg) {
          return message.reply({
            embeds: [await infoEmbed(message.guild.id, 'Welcome Message Variables',
              `**Current Message:**\n${guildConfig.features.welcomeSystem.message || 'Not set'}\n\n` +
              `**Available Variables:**\n` +
              `${GLYPHS.DOT} \`{user}\` - Mentions the user\n` +
              `${GLYPHS.DOT} \`{username}\` - User's username\n` +
              `${GLYPHS.DOT} \`{tag}\` - User's tag (username#0000)\n` +
              `${GLYPHS.DOT} \`{server}\` - Server name\n` +
              `${GLYPHS.DOT} \`{membercount}\` - Total member count\n` +
              `${GLYPHS.DOT} \`{usercreated}\` - Account creation date\n` +
              `${GLYPHS.DOT} \`\\n\` - New line\n\n` +
              `**Example:**\n\`welcome message Welcome {user} to {server}! You are member #{membercount}!\``)]
          });
        }

        await Guild.updateGuild(message.guild.id, {
          $set: { 'features.welcomeSystem.message': welcomeMsg }
        });

        return message.reply({
          embeds: [await successEmbed(message.guild.id, 'Welcome Message Set',
            `${GLYPHS.SUCCESS} Welcome message has been updated.\n\n` +
            `**Preview:**\n${parseWelcomeMessage(welcomeMsg, message.member)}`)]
        });

      case 'embed':
        const embedOption = args[1]?.toLowerCase();

        if (!['on', 'off', 'enable', 'disable'].includes(embedOption)) {
          return message.reply({
            embeds: [await errorEmbed(message.guild.id, 'Invalid Option',
              'Use `welcome embed on` or `welcome embed off`')]
          });
        }

        const embedEnabled = ['on', 'enable'].includes(embedOption);
        await Guild.updateGuild(message.guild.id, {
          $set: { 'features.welcomeSystem.embedEnabled': embedEnabled }
        });

        return message.reply({
          embeds: [await successEmbed(message.guild.id, 'Embed Setting Updated',
            `${GLYPHS.SUCCESS} Welcome embeds are now **${embedEnabled ? 'enabled' : 'disabled'}**`)]
        });

      case 'dm':
        const dmOption = args[1]?.toLowerCase();

        if (!['on', 'off', 'enable', 'disable'].includes(dmOption)) {
          return message.reply({
            embeds: [await errorEmbed(message.guild.id, 'Invalid Option',
              'Use `welcome dm on` or `welcome dm off`')]
          });
        }

        const dmEnabled = ['on', 'enable'].includes(dmOption);
        await Guild.updateGuild(message.guild.id, {
          $set: { 'features.welcomeSystem.dmWelcome': dmEnabled }
        });

        return message.reply({
          embeds: [await successEmbed(message.guild.id, 'DM Setting Updated',
            `${GLYPHS.SUCCESS} DM welcome messages are now **${dmEnabled ? 'enabled' : 'disabled'}**`)]
        });

      case 'test':
        return sendTestWelcome(message, guildConfig);

      case 'image':
      case 'banner':
        const imageUrl = args[1];

        if (!imageUrl) {
          // Show current image
          return message.reply({
            embeds: [await infoEmbed(message.guild.id, 'Welcome Banner',
              guildConfig.features.welcomeSystem.bannerUrl
                ? `**Current Banner:**\n${guildConfig.features.welcomeSystem.bannerUrl}`
                : 'No banner set. Use `welcome image <url>` to set one, or `welcome image remove` to remove.')]
          });
        }

        if (imageUrl === 'remove' || imageUrl === 'none') {
          await Guild.updateGuild(message.guild.id, {
            $set: { 'features.welcomeSystem.bannerUrl': null }
          });
          return message.reply({
            embeds: [await successEmbed(message.guild.id, 'Banner Removed',
              `${GLYPHS.SUCCESS} Welcome banner has been removed.`)]
          });
        }

        // Validate URL
        if (!imageUrl.match(/^https?:\/\/.+\.(png|jpg|jpeg|gif|webp)(\?.*)?$/i)) {
          return message.reply({
            embeds: [await errorEmbed(message.guild.id, 'Invalid URL',
              'Please provide a valid image URL (png, jpg, gif, webp).')]
          });
        }

        await Guild.updateGuild(message.guild.id, {
          $set: { 'features.welcomeSystem.bannerUrl': imageUrl }
        });

        return message.reply({
          embeds: [await successEmbed(message.guild.id, 'Banner Set',
            `${GLYPHS.SUCCESS} Welcome banner has been set.`)]
        });

      case 'title':
        const titleText = args.slice(1).join(' ');

        if (!titleText) {
          return message.reply({
            embeds: [await infoEmbed(message.guild.id, 'Embed Title',
              `**Current Title:**\n${guildConfig.features.welcomeSystem.embedTitle || 'Default decorative stars'}\n\n` +
              `Use \`welcome title <text>\` to set a custom title, or \`welcome title reset\` for default.`)]
          });
        }

        if (titleText === 'reset' || titleText === 'default') {
          await Guild.updateGuild(message.guild.id, {
            $set: { 'features.welcomeSystem.embedTitle': null }
          });
          return message.reply({
            embeds: [await successEmbed(message.guild.id, 'Title Reset',
              `${GLYPHS.SUCCESS} Welcome embed title reset to default decorative style.`)]
          });
        }

        await Guild.updateGuild(message.guild.id, {
          $set: { 'features.welcomeSystem.embedTitle': titleText }
        });

        return message.reply({
          embeds: [await successEmbed(message.guild.id, 'Title Set',
            `${GLYPHS.SUCCESS} Welcome embed title set to:\n${titleText}`)]
        });

      case 'color':
        const colorValue = args[1];

        if (!colorValue) {
          return message.reply({
            embeds: [await infoEmbed(message.guild.id, 'Embed Color',
              `**Current Color:** ${guildConfig.features.welcomeSystem.embedColor || 'Default'}\n\n` +
              `Use \`welcome color #HEX\` to set (e.g., \`welcome color #5432A6\`)`)]
          });
        }

        if (!colorValue.match(/^#?[0-9A-Fa-f]{6}$/)) {
          return message.reply({
            embeds: [await errorEmbed(message.guild.id, 'Invalid Color',
              'Please provide a valid hex color (e.g., `#5432A6`)')]
          });
        }

        const hex = colorValue.startsWith('#') ? colorValue : `#${colorValue}`;
        await Guild.updateGuild(message.guild.id, {
          $set: { 'features.welcomeSystem.embedColor': hex }
        });

        return message.reply({
          embeds: [await successEmbed(message.guild.id, 'Color Set',
            `${GLYPHS.SUCCESS} Welcome embed color set to \`${hex}\``)]
        });

      case 'mention':
        const mentionOption = args[1]?.toLowerCase();

        if (!['on', 'off', 'enable', 'disable'].includes(mentionOption)) {
          return message.reply({
            embeds: [await errorEmbed(message.guild.id, 'Invalid Option',
              'Use `welcome mention on` or `welcome mention off`\n\n' +
              'When enabled, sends "welcome, @user!" above the embed (Mimu style).')]
          });
        }

        const mentionEnabled = ['on', 'enable'].includes(mentionOption);
        await Guild.updateGuild(message.guild.id, {
          $set: { 'features.welcomeSystem.mentionUser': mentionEnabled }
        });

        return message.reply({
          embeds: [await successEmbed(message.guild.id, 'Mention Setting Updated',
            `${GLYPHS.SUCCESS} User mention above embed is now **${mentionEnabled ? 'enabled' : 'disabled'}**`)]
        });

      default:
        return showStatus(message, guildConfig);
    }
  }
};

async function showStatus(message, guildConfig) {
  const welcome = guildConfig.features.welcomeSystem;
  const channel = welcome.channel ? message.guild.channels.cache.get(welcome.channel) : null;

  const embed = await infoEmbed(message.guild.id, '『 Welcome System Status 』',
    `**▸ Status:** ${welcome.enabled ? '◉ Active' : '○ Inactive'}\n` +
    `**▸ Channel:** ${channel ? channel : 'Not configured'}\n` +
    `**▸ Embed Mode:** ${welcome.embedEnabled ? '◉' : '○'}\n` +
    `**▸ DM Welcome:** ${welcome.dmWelcome ? '◉' : '○'}\n` +
    `**▸ Mention User:** ${welcome.mentionUser ? '◉' : '○'}\n` +
    `**▸ Banner:** ${welcome.bannerUrl ? '◉ Set' : '○ Not set'}\n` +
    `**▸ Color:** ${welcome.embedColor || 'Default'}\n` +
    `**▸ Title:** ${welcome.embedTitle ? 'Custom' : 'Decorative stars'}\n\n` +
    `**Current Message:**\n\`\`\`${welcome.message || 'Welcome {user} to {server}!'}\`\`\`\n` +
    `**Commands:**\n` +
    `${GLYPHS.DOT} \`welcome enable/disable\` - Toggle system\n` +
    `${GLYPHS.DOT} \`welcome channel #channel\` - Set welcome channel\n` +
    `${GLYPHS.DOT} \`welcome message <text>\` - Set embed description\n` +
    `${GLYPHS.DOT} \`welcome embed on/off\` - Toggle embed mode\n` +
    `${GLYPHS.DOT} \`welcome dm on/off\` - Toggle DM welcomes\n` +
    `${GLYPHS.DOT} \`welcome mention on/off\` - "welcome, @user!" above embed\n` +
    `${GLYPHS.DOT} \`welcome title <text>\` - Set embed title\n` +
    `${GLYPHS.DOT} \`welcome color #HEX\` - Set embed color\n` +
    `${GLYPHS.DOT} \`welcome image <url>\` - Set banner image\n` +
    `${GLYPHS.DOT} \`welcome test\` - Test welcome message`
  );

  return message.reply({ embeds: [embed] });
}

async function sendTestWelcome(message, guildConfig) {
  const welcome = guildConfig.features.welcomeSystem;
  const channel = welcome.channel ? message.guild.channels.cache.get(welcome.channel) : message.channel;

  if (!channel) {
    return message.reply({
      embeds: [await errorEmbed(message.guild.id, 'No Channel',
        'Welcome channel is not set. Use `welcome channel #channel` to set one.')]
    });
  }

  const welcomeMsg = parseWelcomeMessage(welcome.message || 'Welcome {user} to {server}!', message.member);

  if (welcome.embedEnabled) {
    // Decorative title with stars (Mimu style)
    const decorativeTitle = '˚　　　　✦　　　.　　. 　 ˚　.　　　　　 . ✦　　　 　˚　　　　 . ★⋆. ࿐࿔  　　　.　　 　　˚　　 　　*　　 　　✦　　　.　　.　　　✦　˚ 　　　　 ˚　.˚　　　　✦　　　.　　. 　 ˚　.　　　　 　　 　　　　        ੈ✧̣̇˳·˖✶   ✦';
    
    const embed = new EmbedBuilder()
      .setColor(welcome.embedColor || guildConfig.embedStyle?.color || '#5865F2')
      .setAuthor({
        name: message.author.username,
        iconURL: message.author.displayAvatarURL({ dynamic: true, size: 128 })
      })
      .setTitle(welcome.embedTitle || decorativeTitle)
      .setDescription(welcomeMsg)
      .setFooter({ text: `Member #${message.guild.memberCount}` })
      .setTimestamp();

    if (welcome.bannerUrl) {
      embed.setImage(welcome.bannerUrl);
    }

    // Send with optional mention outside embed
    const content = welcome.mentionUser ? `welcome, ${message.author}!` : undefined;
    await channel.send({ content, embeds: [embed] });
  } else {
    await channel.send(welcomeMsg);
  }

  return message.reply({
    embeds: [await successEmbed(message.guild.id, 'Test Sent',
      `${GLYPHS.SUCCESS} Test welcome message sent to ${channel}`)]
  });
}

/**
 * Parse welcome message with variables
 */
function parseWelcomeMessage(msg, member) {
  return msg
    .replace(/{user}/gi, `<@${member.user.id}>`)
    .replace(/{username}/gi, member.user.username)
    .replace(/{tag}/gi, member.user.tag)
    .replace(/{server}/gi, member.guild.name)
    .replace(/{membercount}/gi, member.guild.memberCount.toString())
    .replace(/{usercreated}/gi, `<t:${Math.floor(member.user.createdTimestamp / 1000)}:D>`)
    .replace(/\\n/g, '\n');
}

export { parseWelcomeMessage };
