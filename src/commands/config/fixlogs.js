import { PermissionFlagsBits, ChannelType } from 'discord.js';
import Guild from '../../models/Guild.js';
import { successEmbed, errorEmbed, infoEmbed, GLYPHS } from '../../utils/embeds.js';
import { getPrefix, hasModPerms } from '../../utils/helpers.js';
import RateLimitQueue from '../../utils/RateLimitQueue.js';

const LOG_CHANNELS = [
  { key: 'modLog', name: 'mod-log', emoji: '🔨' },
  { key: 'alertLog', name: 'alert-log', emoji: '🚨' },
  { key: 'joinLog', name: 'join-log', emoji: '📥' },
  { key: 'leaveLog', name: 'leave-log', emoji: '📤' },
  { key: 'messageLog', name: 'message-log', emoji: '💬' },
  { key: 'voiceLog', name: 'voice-log', emoji: '🔊' },
  { key: 'memberLog', name: 'member-log', emoji: '👤' },
  { key: 'serverLog', name: 'server-log', emoji: '⚙️' },
  { key: 'ticketLog', name: 'ticket-logs', emoji: '📝' },
  { key: 'botStatus', name: 'bot-status', emoji: '🤖' }
];

export default {
  name: 'fixlogs',
  description: 'Fix permissions for all log channels (make them private to admins/staff only)',
  usage: '[all|<channel-type>]',
  aliases: ['fixlogpermissions', 'logpermissions', 'fixlogchannels'],
  category: 'config',
  permissions: [PermissionFlagsBits.ManageGuild],
  cooldown: 10,

  async execute(message, args) {
    const guildId = message.guild.id;
    const prefix = await getPrefix(guildId);
    const guildConfig = await Guild.getGuild(guildId);

    // Check for moderator permissions (admin, mod role, or ManageGuild)
    if (!hasModPerms(message.member, guildConfig)) {
      return message.reply({
        embeds: [await errorEmbed(guildId, 'Permission Denied',
          `${GLYPHS.LOCK} You need Moderator/Staff permissions to fix log channel permissions.`)]
      });
    }

    // No args - show help
    if (!args[0]) {
      return showHelp(message, prefix, guildConfig);
    }

    const target = args[0].toLowerCase();

    if (target === 'all') {
      return fixAllLogChannels(message, guildConfig);
    }

    // Find specific log type
    const logType = LOG_CHANNELS.find(l =>
      l.key.toLowerCase() === target ||
      l.name.toLowerCase().replace(/-/g, '') === target.replace(/-/g, '')
    );

    if (!logType) {
      return message.reply({
        embeds: [await errorEmbed(guildId, 'Unknown Log Type',
          `${GLYPHS.ERROR} Unknown log type: \`${target}\`\n\n` +
          `**Available types:**\n` +
          LOG_CHANNELS.map(l => `${GLYPHS.DOT} \`${l.key}\``).join('\n'))]
      });
    }

    return fixSingleLogChannel(message, guildConfig, logType);
  }
};

async function showHelp(message, prefix, guildConfig) {
  const configuredLogs = [];
  const missingLogs = [];

  for (const log of LOG_CHANNELS) {
    const channelId = guildConfig.channels?.[log.key];
    if (channelId) {
      const channel = message.guild.channels.cache.get(channelId);
      if (channel) {
        configuredLogs.push(`${log.emoji} **${log.key}:** <#${channelId}>`);
      } else {
        missingLogs.push(`${log.emoji} **${log.key}:** Channel deleted`);
      }
    } else {
      missingLogs.push(`${log.emoji} **${log.key}:** Not configured`);
    }
  }

  const embed = await infoEmbed(message.guild.id, '🔧 Fix Log Channel Permissions',
    `This command fixes permissions on log channels to make them private (visible only to admins and staff).\n\n` +
    `**Usage:**\n` +
    `${GLYPHS.DOT} \`${prefix}fixlogs all\` - Fix all configured log channels\n` +
    `${GLYPHS.DOT} \`${prefix}fixlogs <type>\` - Fix a specific log channel\n\n` +
    `**Configured Logs:**\n${configuredLogs.length > 0 ? configuredLogs.join('\n') : 'None'}\n\n` +
    (missingLogs.length > 0 ? `**Not Configured:**\n${missingLogs.join('\n')}` : '')
  );

  return message.reply({ embeds: [embed] });
}

async function fixAllLogChannels(message, guildConfig) {
  const guildId = message.guild.id;
  const queue = RateLimitQueue.forDiscord();

  const statusEmbed = await infoEmbed(guildId, '🔧 Fixing Log Permissions',
    `${GLYPHS.LOADING} Processing log channels...`
  );
  const statusMsg = await message.reply({ embeds: [statusEmbed] });

  const results = {
    fixed: [],
    skipped: [],
    failed: []
  };

  // Get staff roles for permissions
  const staffRoles = [
    ...(guildConfig.roles.adminRoles || []),
    ...(guildConfig.roles.staffRoles || []),
    ...(guildConfig.roles.moderatorRoles || [])
  ].filter(Boolean);

  for (const log of LOG_CHANNELS) {
    const channelId = guildConfig.channels?.[log.key];
    if (!channelId) {
      results.skipped.push(`${log.emoji} ${log.key}: Not configured`);
      continue;
    }

    const channel = message.guild.channels.cache.get(channelId);
    if (!channel) {
      results.skipped.push(`${log.emoji} ${log.key}: Channel not found`);
      continue;
    }

    try {
      await queue.add(async () => {
        // Deny @everyone from viewing
        await channel.permissionOverwrites.edit(message.guild.id, {
          ViewChannel: false,
          SendMessages: false
        });

        // Allow bot to send
        await channel.permissionOverwrites.edit(message.client.user.id, {
          ViewChannel: true,
          SendMessages: true,
          EmbedLinks: true,
          AttachFiles: true
        });

        // Allow staff roles to view
        for (const roleId of staffRoles) {
          const role = message.guild.roles.cache.get(roleId);
          if (role) {
            await channel.permissionOverwrites.edit(roleId, {
              ViewChannel: true,
              SendMessages: false // Staff can view but not send
            });
          }
        }
      }, `fix-${log.key}`);

      results.fixed.push(`${log.emoji} ${log.key}: <#${channelId}>`);
    } catch (error) {
      results.failed.push(`${log.emoji} ${log.key}: ${error.message}`);
    }
  }

  await queue.onIdle();

  const resultEmbed = await successEmbed(guildId, '🔧 Log Permissions Fixed',
    `**Fixed (${results.fixed.length}):**\n${results.fixed.length > 0 ? results.fixed.join('\n') : 'None'}\n\n` +
    (results.skipped.length > 0 ? `**Skipped (${results.skipped.length}):**\n${results.skipped.join('\n')}\n\n` : '') +
    (results.failed.length > 0 ? `**Failed (${results.failed.length}):**\n${results.failed.join('\n')}` : '') +
    `\n\n${GLYPHS.INFO} Log channels are now private to admins and staff only.`
  );

  return statusMsg.edit({ embeds: [resultEmbed] });
}

async function fixSingleLogChannel(message, guildConfig, logType) {
  const guildId = message.guild.id;
  const channelId = guildConfig.channels?.[logType.key];

  if (!channelId) {
    return message.reply({
      embeds: [await errorEmbed(guildId, 'Not Configured',
        `${GLYPHS.ERROR} The ${logType.key} channel is not configured.\n\n` +
        `Use \`logs set ${logType.key.replace('Log', '').toLowerCase()} #channel\` to set it up.`)]
    });
  }

  const channel = message.guild.channels.cache.get(channelId);
  if (!channel) {
    return message.reply({
      embeds: [await errorEmbed(guildId, 'Channel Not Found',
        `${GLYPHS.ERROR} The configured channel for ${logType.key} no longer exists.`)]
    });
  }

  // Get staff roles for permissions
  const staffRoles = [
    ...(guildConfig.roles.adminRoles || []),
    ...(guildConfig.roles.staffRoles || []),
    ...(guildConfig.roles.moderatorRoles || [])
  ].filter(Boolean);

  try {
    // Deny @everyone from viewing
    await channel.permissionOverwrites.edit(message.guild.id, {
      ViewChannel: false,
      SendMessages: false
    });

    // Allow bot to send
    await channel.permissionOverwrites.edit(message.client.user.id, {
      ViewChannel: true,
      SendMessages: true,
      EmbedLinks: true,
      AttachFiles: true
    });

    // Allow staff roles to view
    for (const roleId of staffRoles) {
      const role = message.guild.roles.cache.get(roleId);
      if (role) {
        await channel.permissionOverwrites.edit(roleId, {
          ViewChannel: true,
          SendMessages: false
        });
      }
    }

    return message.reply({
      embeds: [await successEmbed(guildId, 'Permissions Fixed',
        `${GLYPHS.SUCCESS} Fixed permissions for ${logType.emoji} **${logType.key}** (<#${channelId}>)\n\n` +
        `${GLYPHS.DOT} Hidden from @everyone\n` +
        `${GLYPHS.DOT} Visible to admins and staff\n` +
        `${GLYPHS.DOT} Bot can send messages`)]
    });
  } catch (error) {
    return message.reply({
      embeds: [await errorEmbed(guildId, 'Failed to Fix Permissions',
        `${GLYPHS.ERROR} Could not fix permissions: ${error.message}\n\n` +
        `Make sure I have the **Manage Channels** permission.`)]
    });
  }
}
