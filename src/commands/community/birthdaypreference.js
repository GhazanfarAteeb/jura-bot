import { PermissionFlagsBits } from 'discord.js';
import Guild from '../../models/Guild.js';
import { successEmbed, errorEmbed, infoEmbed, GLYPHS } from '../../utils/embeds.js';

export default {
  name: 'birthdaypreference',
  aliases: ['bdpref', 'birthdaysettings', 'bdsettings'],
  description: 'Configure birthday system settings (Admin only)',
  usage: 'birthdaypreference <channel|role|message|enable|disable|status> [value]',
  category: 'config',
  permissions: {
    user: PermissionFlagsBits.Administrator
  },

  async execute(message, args) {
    const guildId = message.guild.id;
    const guildConfig = await Guild.getGuild(guildId, message.guild.name);

    // Check for admin permissions
    const hasAdminRole = guildConfig.roles.adminRoles?.some(roleId =>
      message.member.roles.cache.has(roleId)
    );

    if (!message.member.permissions.has(PermissionFlagsBits.Administrator) && !hasAdminRole) {
      return message.reply({
        embeds: [await errorEmbed(guildId, 'Permission Denied',
          `${GLYPHS.LOCK} You need Administrator permissions to configure birthday settings.`)]
      });
    }

    const action = args[0]?.toLowerCase();

    if (!action || action === 'help') {
      return showHelp(message, guildConfig);
    }

    switch (action) {
      case 'channel':
        return setChannel(message, args, guildConfig);
      case 'role':
        return setRole(message, args, guildConfig);
      case 'message':
        return setMessage(message, args, guildConfig);
      case 'enable':
      case 'on':
        return toggleSystem(message, guildConfig, true);
      case 'disable':
      case 'off':
        return toggleSystem(message, guildConfig, false);
      case 'status':
        return showStatus(message, guildConfig);
      default:
        return showHelp(message, guildConfig);
    }
  }
};

async function showHelp(message, guildConfig) {
  const bs = guildConfig.features.birthdaySystem;
  const channel = bs.channel ? `<#${bs.channel}>` : 'Not set';
  const role = bs.role ? `<@&${bs.role}>` : 'Not set';

  const embed = await infoEmbed(message.guild.id, '🎂 Birthday Settings',
    `**Current Status:** ${bs.enabled ? '✅ Enabled' : '❌ Disabled'}\n` +
    `**Channel:** ${channel}\n` +
    `**Role:** ${role}\n\n` +
    `**Commands:**\n` +
    `${GLYPHS.DOT} \`birthdaypreference channel #channel\` - Set announcement channel\n` +
    `${GLYPHS.DOT} \`birthdaypreference role @role\` - Set birthday role\n` +
    `${GLYPHS.DOT} \`birthdaypreference message <text>\` - Set custom message\n` +
    `${GLYPHS.DOT} \`birthdaypreference enable\` - Enable birthday system\n` +
    `${GLYPHS.DOT} \`birthdaypreference disable\` - Disable birthday system\n` +
    `${GLYPHS.DOT} \`birthdaypreference status\` - View current settings\n\n` +
    `**Message Variables:**\n` +
    `• \`{user}\` - Mentions the birthday person\n` +
    `• \`{username}\` - User's display name\n` +
    `• \`{age}\` - User's age (if year was provided)`
  );

  return message.reply({ embeds: [embed] });
}

async function setChannel(message, args, guildConfig) {
  const channel = message.mentions.channels.first() ||
    message.guild.channels.cache.get(args[1]?.replace(/[<#>]/g, ''));

  if (!channel) {
    return message.reply({
      embeds: [await errorEmbed(message.guild.id, 'Invalid Channel',
        'Please mention a valid channel or provide a channel ID.\n\nUsage: `birthdaypreference channel #channel`')]
    });
  }

  guildConfig.features.birthdaySystem.channel = channel.id;
  guildConfig.channels.birthdayChannel = channel.id;
  await guildConfig.save();

  return message.reply({
    embeds: [await successEmbed(message.guild.id, '🎂 Birthday Channel Set',
      `${GLYPHS.SUCCESS} Birthday announcements will now be sent to ${channel}`)]
  });
}

async function setRole(message, args, guildConfig) {
  const role = message.mentions.roles.first() ||
    message.guild.roles.cache.get(args[1]?.replace(/[<@&>]/g, ''));

  if (!role) {
    return message.reply({
      embeds: [await errorEmbed(message.guild.id, 'Invalid Role',
        'Please mention a valid role or provide a role ID.\n\nUsage: `birthdaypreference role @role`')]
    });
  }

  guildConfig.features.birthdaySystem.role = role.id;
  await guildConfig.save();

  return message.reply({
    embeds: [await successEmbed(message.guild.id, '🎂 Birthday Role Set',
      `${GLYPHS.SUCCESS} Birthday role set to ${role}\n\nThis role will be assigned to users on their birthday and when their birthday is set.`)]
  });
}

async function setMessage(message, args, guildConfig) {
  const customMessage = args.slice(1).join(' ');

  if (!customMessage) {
    return message.reply({
      embeds: [await errorEmbed(message.guild.id, 'No Message Provided',
        'Please provide a custom birthday message.\n\nUsage: `birthdaypreference message 🎉 Happy Birthday {user}! You are now {age} years old!`\n\n' +
        '**Variables:**\n• `{user}` - Mentions the user\n• `{username}` - User name\n• `{age}` - User\'s age')]
    });
  }

  guildConfig.features.birthdaySystem.message = customMessage;
  await guildConfig.save();

  const preview = customMessage
    .replace('{user}', message.author.toString())
    .replace('{username}', message.author.username)
    .replace('{age}', '25');

  return message.reply({
    embeds: [await successEmbed(message.guild.id, '🎂 Birthday Message Set',
      `${GLYPHS.SUCCESS} Custom birthday message updated!\n\n**Preview:**\n${preview}`)]
  });
}

async function toggleSystem(message, guildConfig, enabled) {
  guildConfig.features.birthdaySystem.enabled = enabled;
  await guildConfig.save();

  return message.reply({
    embeds: [await successEmbed(message.guild.id,
      enabled ? '🎂 Birthday System Enabled' : '🎂 Birthday System Disabled',
      `${GLYPHS.SUCCESS} Birthday celebrations are now ${enabled ? 'enabled' : 'disabled'}!`)]
  });
}

async function showStatus(message, guildConfig) {
  const bs = guildConfig.features.birthdaySystem;
  const channel = bs.channel ? `<#${bs.channel}>` : 'Not set';
  const role = bs.role ? `<@&${bs.role}>` : 'Not set';
  const customMessage = bs.message || '🎉 Happy Birthday {user}! 🎂';

  return message.reply({
    embeds: [await infoEmbed(message.guild.id, '🎂 Birthday System Status',
      `**Status:** ${bs.enabled ? '✅ Enabled' : '❌ Disabled'}\n` +
      `**Announcement Channel:** ${channel}\n` +
      `**Birthday Role:** ${role}\n` +
      `**Custom Message:** ${customMessage}\n\n` +
      `Use \`birthdaypreference help\` to see configuration commands.`)]
  });
}