import { EmbedBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';
import Guild from '../../models/Guild.js';
import { successEmbed, errorEmbed, infoEmbed, GLYPHS } from '../../utils/embeds.js';
import { getPrefix, hasModPerms } from '../../utils/helpers.js';

const LOG_TYPES = {
  mod: { name: 'Moderation Log', emoji: '🔨', field: 'modLog', description: 'Bans, kicks, warns, timeouts' },
  message: { name: 'Message Log', emoji: '💬', field: 'messageLog', description: 'Message edits and deletes' },
  voice: { name: 'Voice Log', emoji: '🔊', field: 'voiceLog', description: 'Voice channel activity' },
  member: { name: 'Member Log', emoji: '👤', field: 'memberLog', description: 'Role changes, nicknames, bans' },
  server: { name: 'Server Log', emoji: '⚙️', field: 'serverLog', description: 'Channel, role, server changes' },
  join: { name: 'Join Log', emoji: '📥', field: 'joinLog', description: 'Member joins' },
  leave: { name: 'Leave Log', emoji: '📤', field: 'leaveLog', description: 'Member leaves' },
  alert: { name: 'Alert Log', emoji: '🚨', field: 'alertLog', description: 'Security alerts' },
  ticket: { name: 'Ticket Log', emoji: '🎫', field: 'ticketLog', description: 'Ticket activity' }
};

export default {
  name: 'logs',
  description: 'Configure logging channels',
  usage: 'logs | logs set <type> #channel | logs disable <type> | logs all #channel',
  category: 'config',
  aliases: ['logging', 'setlog', 'logchannel'],
  permissions: [PermissionFlagsBits.ManageGuild],
  cooldown: 5,

  async execute(message, args) {
    const guildId = message.guild.id;
    const guildConfig = await Guild.getGuild(guildId);

    // Check for moderator permissions (admin, mod role, or ManageGuild)
    if (!hasModPerms(message.member, guildConfig)) {
      return message.reply({
        embeds: [await errorEmbed(guildId, 'Permission Denied',
          `${GLYPHS.LOCK} You need Moderator/Staff permissions to configure logging.`)]
      });
    }

    const subCommand = args[0]?.toLowerCase();

    // No args - show current config
    if (!subCommand) {
      return this.showConfig(message, guildConfig, guildId);
    }

    switch (subCommand) {
      case 'set':
        return this.setLog(message, args.slice(1), guildConfig, guildId);
      case 'disable':
      case 'remove':
        return this.disableLog(message, args.slice(1), guildConfig, guildId);
      case 'all':
        return this.setAllLogs(message, args.slice(1), guildConfig, guildId);
      case 'list':
      case 'types':
        return this.listTypes(message, guildId);
      default:
        // Try to interpret as log type
        if (LOG_TYPES[subCommand]) {
          return this.setLog(message, args, guildConfig, guildId);
        }
        return this.showConfig(message, guildConfig, guildId);
    }
  },

  async showConfig(message, guildConfig, guildId) {
    const prefix = await getPrefix(guildId);
    const logStatus = Object.entries(LOG_TYPES).map(([key, log]) => {
      const channelId = guildConfig.channels[log.field];
      const channel = channelId ? message.guild.channels.cache.get(channelId) : null;
      const status = channel ? `${channel}` : '○ Not configured';
      return `${log.emoji} **${log.name}:** ${status}`;
    }).join('\n');

    const embed = new EmbedBuilder()
      .setColor('#00CED1')
      .setTitle('『 Logging Configuration 』')
      .setDescription(
        `**Current Log Channels:**\n\n${logStatus}\n\n` +
        `**Commands:**\n` +
        `${GLYPHS.ARROW_RIGHT} \`${prefix}logs set <type> #channel\`\n` +
        `${GLYPHS.ARROW_RIGHT} \`${prefix}logs disable <type>\`\n` +
        `${GLYPHS.ARROW_RIGHT} \`${prefix}logs all #channel\` - Set all to one channel\n` +
        `${GLYPHS.ARROW_RIGHT} \`${prefix}logs list\` - View all log types`
      )
      .setFooter({ text: `Use ${prefix}setup to auto-create all log channels` })
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  },

  async setLog(message, args, guildConfig, guildId) {
    const logType = args[0]?.toLowerCase();
    const channel = message.mentions.channels.first() ||
      message.guild.channels.cache.get(args[1]);
    const prefix = await getPrefix(guildId);

    if (!logType || !LOG_TYPES[logType]) {
      const types = Object.keys(LOG_TYPES).join(', ');
      const embed = await errorEmbed(guildId, 'Invalid Log Type',
        `${GLYPHS.ERROR} Please specify a valid log type.\n\n` +
        `**Available types:** ${types}\n\n` +
        `**Usage:** \`${prefix}logs set <type> #channel\``
      );
      return message.reply({ embeds: [embed] });
    }

    if (!channel) {
      const embed = await errorEmbed(guildId, 'No Channel',
        `${GLYPHS.ERROR} Please mention a channel.\n\n` +
        `**Usage:** \`${prefix}logs set ${logType} #channel\``
      );
      return message.reply({ embeds: [embed] });
    }

    if (channel.type !== ChannelType.GuildText) {
      const embed = await errorEmbed(guildId, 'Invalid Channel',
        `${GLYPHS.ERROR} Please select a text channel.`
      );
      return message.reply({ embeds: [embed] });
    }

    const log = LOG_TYPES[logType];
    guildConfig.channels[log.field] = channel.id;
    await guildConfig.save();

    // Clear cache
    if (global.guildCache) global.guildCache.delete(guildId);

    const embed = await successEmbed(guildId, 'Log Channel Set',
      `${GLYPHS.SUCCESS} ${log.emoji} **${log.name}** will now be sent to ${channel}.\n\n` +
      `**Logs:** ${log.description}`
    );
    return message.reply({ embeds: [embed] });
  },

  async disableLog(message, args, guildConfig, guildId) {
    const logType = args[0]?.toLowerCase();
    const prefix = await getPrefix(guildId);

    if (!logType || !LOG_TYPES[logType]) {
      const types = Object.keys(LOG_TYPES).join(', ');
      const embed = await errorEmbed(guildId, 'Invalid Log Type',
        `${GLYPHS.ERROR} Please specify a valid log type.\n\n` +
        `**Available types:** ${types}\n\n` +
        `**Usage:** \`${prefix}logs disable <type>\``
      );
      return message.reply({ embeds: [embed] });
    }

    const log = LOG_TYPES[logType];
    guildConfig.channels[log.field] = null;
    await guildConfig.save();

    // Clear cache
    if (global.guildCache) global.guildCache.delete(guildId);

    const embed = await successEmbed(guildId, 'Log Disabled',
      `${GLYPHS.SUCCESS} ${log.emoji} **${log.name}** has been disabled.`
    );
    return message.reply({ embeds: [embed] });
  },

  async setAllLogs(message, args, guildConfig, guildId) {
    const channel = message.mentions.channels.first() ||
      message.guild.channels.cache.get(args[0]);
    const prefix = await getPrefix(guildId);

    if (!channel) {
      const embed = await errorEmbed(guildId, 'No Channel',
        `${GLYPHS.ERROR} Please mention a channel.\n\n` +
        `**Usage:** \`${prefix}logs all #channel\``
      );
      return message.reply({ embeds: [embed] });
    }

    if (channel.type !== ChannelType.GuildText) {
      const embed = await errorEmbed(guildId, 'Invalid Channel',
        `${GLYPHS.ERROR} Please select a text channel.`
      );
      return message.reply({ embeds: [embed] });
    }

    // Set all log channels
    for (const [key, log] of Object.entries(LOG_TYPES)) {
      guildConfig.channels[log.field] = channel.id;
    }
    await guildConfig.save();

    // Clear cache
    if (global.guildCache) global.guildCache.delete(guildId);

    const embed = await successEmbed(guildId, 'All Logs Set',
      `${GLYPHS.SUCCESS} All log types will now be sent to ${channel}.\n\n` +
      `**Enabled:**\n` +
      Object.values(LOG_TYPES).map(l => `${l.emoji} ${l.name}`).join('\n')
    );
    return message.reply({ embeds: [embed] });
  },

  async listTypes(message, guildId) {
    const prefix = await getPrefix(guildId);
    const typeList = Object.entries(LOG_TYPES).map(([key, log]) =>
      `${log.emoji} **${key}** - ${log.name}\n   └ ${log.description}`
    ).join('\n\n');

    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('📋 Log Types')
      .setDescription(typeList)
      .setFooter({ text: `Use ${prefix}logs set <type> #channel to configure` })
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  }
};
