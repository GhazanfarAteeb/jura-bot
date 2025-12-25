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
        guildConfig.features.welcomeSystem.enabled = true;
        await guildConfig.save();
        return message.reply({
          embeds: [await successEmbed(message.guild.id, 'Welcome System Enabled',
            `${GLYPHS.SUCCESS} Welcome messages are now enabled.\n\n` +
            `Make sure to set a channel: \`welcome channel #channel\``)]
        });

      case 'disable':
      case 'off':
        guildConfig.features.welcomeSystem.enabled = false;
        await guildConfig.save();
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

        guildConfig.features.welcomeSystem.channel = channel.id;
        guildConfig.channels.welcomeChannel = channel.id;
        await guildConfig.save();

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

        guildConfig.features.welcomeSystem.message = welcomeMsg;
        await guildConfig.save();

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

        guildConfig.features.welcomeSystem.embedEnabled = ['on', 'enable'].includes(embedOption);
        await guildConfig.save();

        return message.reply({
          embeds: [await successEmbed(message.guild.id, 'Embed Setting Updated',
            `${GLYPHS.SUCCESS} Welcome embeds are now **${guildConfig.features.welcomeSystem.embedEnabled ? 'enabled' : 'disabled'}**`)]
        });

      case 'dm':
        const dmOption = args[1]?.toLowerCase();

        if (!['on', 'off', 'enable', 'disable'].includes(dmOption)) {
          return message.reply({
            embeds: [await errorEmbed(message.guild.id, 'Invalid Option',
              'Use `welcome dm on` or `welcome dm off`')]
          });
        }

        guildConfig.features.welcomeSystem.dmWelcome = ['on', 'enable'].includes(dmOption);
        await guildConfig.save();

        return message.reply({
          embeds: [await successEmbed(message.guild.id, 'DM Setting Updated',
            `${GLYPHS.SUCCESS} DM welcome messages are now **${guildConfig.features.welcomeSystem.dmWelcome ? 'enabled' : 'disabled'}**`)]
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
          guildConfig.features.welcomeSystem.bannerUrl = null;
          await guildConfig.save();
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

        guildConfig.features.welcomeSystem.bannerUrl = imageUrl;
        await guildConfig.save();

        return message.reply({
          embeds: [await successEmbed(message.guild.id, 'Banner Set',
            `${GLYPHS.SUCCESS} Welcome banner has been set.`)]
        });

      default:
        return showStatus(message, guildConfig);
    }
  }
};

async function showStatus(message, guildConfig) {
  const welcome = guildConfig.features.welcomeSystem;
  const channel = welcome.channel ? message.guild.channels.cache.get(welcome.channel) : null;

  const embed = await infoEmbed(message.guild.id, '👋 Welcome System Status',
    `**Status:** ${welcome.enabled ? '✅ Enabled' : '❌ Disabled'}\n` +
    `**Channel:** ${channel ? channel : 'Not set'}\n` +
    `**Embed Mode:** ${welcome.embedEnabled ? '✅' : '❌'}\n` +
    `**DM Welcome:** ${welcome.dmWelcome ? '✅' : '❌'}\n` +
    `**Banner:** ${welcome.bannerUrl ? '✅ Set' : '❌ Not set'}\n\n` +
    `**Current Message:**\n\`\`\`${welcome.message || 'Welcome {user} to {server}!'}\`\`\`\n` +
    `**Commands:**\n` +
    `${GLYPHS.DOT} \`welcome enable/disable\` - Toggle system\n` +
    `${GLYPHS.DOT} \`welcome channel #channel\` - Set welcome channel\n` +
    `${GLYPHS.DOT} \`welcome message <text>\` - Set welcome message\n` +
    `${GLYPHS.DOT} \`welcome embed on/off\` - Toggle embed mode\n` +
    `${GLYPHS.DOT} \`welcome dm on/off\` - Toggle DM welcomes\n` +
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
    const embed = new EmbedBuilder()
      .setColor(guildConfig.embedStyle?.color || '#5865F2')
      .setTitle('👋 Welcome!')
      .setDescription(welcomeMsg)
      .setThumbnail(message.author.displayAvatarURL({ dynamic: true, size: 256 }))
      .setFooter({ text: `Member #${message.guild.memberCount}` })
      .setTimestamp();

    if (welcome.bannerUrl) {
      embed.setImage(welcome.bannerUrl);
    }

    await channel.send({ embeds: [embed] });
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
