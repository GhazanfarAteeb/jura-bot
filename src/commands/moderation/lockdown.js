import { PermissionFlagsBits, ChannelType } from 'discord.js';
import Guild from '../../models/Guild.js';
import { successEmbed, errorEmbed, infoEmbed, GLYPHS } from '../../utils/embeds.js';

export default {
  name: 'lockdown',
  description: 'Lock or unlock the server during emergencies',
  usage: '<on|off> [reason]',
  aliases: ['lock', 'unlock'],
  permissions: {
    user: PermissionFlagsBits.Administrator
  },
  cooldown: 10,

  async execute(message, args) {
    const guildConfig = await Guild.getGuild(message.guild.id, message.guild.name);

    // Check for admin role
    const hasAdminRole = guildConfig.roles.adminRoles?.some(roleId =>
      message.member.roles.cache.has(roleId)
    );

    if (!message.member.permissions.has(PermissionFlagsBits.Administrator) && !hasAdminRole) {
      return message.reply({
        embeds: [await errorEmbed(message.guild.id, 'Permission Denied',
          `${GLYPHS.LOCK} You need Administrator permissions to use this command.`)]
      });
    }

    if (!args[0]) {
      const isLocked = guildConfig.security?.lockdownActive;
      return message.reply({
        embeds: [await infoEmbed(message.guild.id, 'Lockdown Status',
          `**Status:** ${isLocked ? '🔒 LOCKED' : '🔓 Unlocked'}\n\n` +
          `**Usage:**\n` +
          `${GLYPHS.DOT} \`lockdown on [reason]\` - Lock the server\n` +
          `${GLYPHS.DOT} \`lockdown off\` - Unlock the server`)]
      });
    }

    const action = args[0].toLowerCase();
    const reason = args.slice(1).join(' ') || 'No reason provided';

    if (action === 'on' || action === 'enable' || action === 'lock') {
      // Enable lockdown
      guildConfig.security = guildConfig.security || {};
      guildConfig.security.lockdownActive = true;
      guildConfig.security.lockdownReason = reason;
      guildConfig.security.lockdownBy = message.author.id;
      guildConfig.security.lockdownAt = new Date();
      await guildConfig.save();

      // Lock all text channels
      const textChannels = message.guild.channels.cache.filter(
        c => c.type === ChannelType.GuildText
      );

      let lockedCount = 0;
      const statusMsg = await message.reply({
        embeds: [await infoEmbed(message.guild.id, '🔒 Locking Server...',
          `Locking ${textChannels.size} channels...`)]
      });

      for (const [, channel] of textChannels) {
        try {
          await channel.permissionOverwrites.edit(message.guild.id, {
            SendMessages: false
          }, { reason: `[Lockdown] ${reason}` });
          lockedCount++;
        } catch (error) {
          // Channel might not be editable
        }
      }

      await statusMsg.edit({
        embeds: [await successEmbed(message.guild.id, '🔒 Server Lockdown Enabled',
          `${GLYPHS.SUCCESS} Locked **${lockedCount}** channels.\n\n` +
          `**Reason:** ${reason}\n` +
          `**By:** ${message.author.tag}\n\n` +
          `Use \`${await getPrefix(message.guild.id)}lockdown off\` to unlock the server.`)]
      });

      // Announce in alert channel
      if (guildConfig.channels.alertLog && guildConfig.channels.alertLog !== message.channel.id) {
        const alertChannel = message.guild.channels.cache.get(guildConfig.channels.alertLog);
        if (alertChannel) {
          const staffMention = guildConfig.roles.staffRoles?.length > 0
            ? guildConfig.roles.staffRoles.map(r => `<@&${r}>`).join(' ')
            : '';

          await alertChannel.send({
            content: staffMention,
            embeds: [await errorEmbed(message.guild.id, '🔒 SERVER LOCKDOWN ACTIVATED',
              `**Activated By:** ${message.author.tag}\n` +
              `**Reason:** ${reason}\n` +
              `**Channels Locked:** ${lockedCount}\n\n` +
              `${GLYPHS.WARNING} All text channels are now locked.`)]
          });
        }
      }

    } else if (action === 'off' || action === 'disable' || action === 'unlock') {
      // Disable lockdown
      guildConfig.security = guildConfig.security || {};
      guildConfig.security.lockdownActive = false;
      await guildConfig.save();

      // Unlock all text channels
      const textChannels = message.guild.channels.cache.filter(
        c => c.type === ChannelType.GuildText
      );

      let unlockedCount = 0;
      const statusMsg = await message.reply({
        embeds: [await infoEmbed(message.guild.id, '🔓 Unlocking Server...',
          `Unlocking ${textChannels.size} channels...`)]
      });

      for (const [, channel] of textChannels) {
        try {
          await channel.permissionOverwrites.edit(message.guild.id, {
            SendMessages: null
          }, { reason: 'Lockdown ended' });
          unlockedCount++;
        } catch (error) {
          // Channel might not be editable
        }
      }

      await statusMsg.edit({
        embeds: [await successEmbed(message.guild.id, '🔓 Server Lockdown Disabled',
          `${GLYPHS.SUCCESS} Unlocked **${unlockedCount}** channels.\n\n` +
          `Server is now back to normal operation.`)]
      });

      // Announce in alert channel
      if (guildConfig.channels.alertLog && guildConfig.channels.alertLog !== message.channel.id) {
        const alertChannel = message.guild.channels.cache.get(guildConfig.channels.alertLog);
        if (alertChannel) {
          await alertChannel.send({
            embeds: [await successEmbed(message.guild.id, '🔓 SERVER LOCKDOWN ENDED',
              `**Ended By:** ${message.author.tag}\n` +
              `**Channels Unlocked:** ${unlockedCount}`)]
          });
        }
      }

    } else {
      return message.reply({
        embeds: [await errorEmbed(message.guild.id, 'Invalid Action',
          `${GLYPHS.ERROR} Use \`on\` or \`off\`.\n\n` +
          `**Usage:**\n` +
          `${GLYPHS.DOT} \`lockdown on [reason]\` - Lock the server\n` +
          `${GLYPHS.DOT} \`lockdown off\` - Unlock the server`)]
      });
    }
  }
};

async function getPrefix(guildId) {
  const guildConfig = await Guild.getGuild(guildId);
  return guildConfig.prefix || '!';
}
