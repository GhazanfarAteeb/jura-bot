import { PermissionFlagsBits, ChannelType } from 'discord.js';
import Guild from '../../models/Guild.js';
import { successEmbed, errorEmbed, infoEmbed, GLYPHS } from '../../utils/embeds.js';
import { getRandomFooter } from '../../utils/raphael.js';

export default {
  name: 'lockdown',
  description: 'Lock or unlock the server during emergencies (text, voice, threads)',
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
        embeds: [await errorEmbed(message.guild.id, 'Authorization Denied',
          `**Warning:** Administrator privileges required, Master.`)]
      });
    }

    if (!args[0]) {
      const isLocked = guildConfig.security?.lockdownActive;
      return message.reply({
        embeds: [await infoEmbed(message.guild.id, 'Security Protocol Status',
          `**Status:** ${isLocked ? '◉ SECURED' : '○ Open'}\n\n` +
          `**Commands:**\n` +
          `◇ \`lockdown on [reason]\` — Activate security protocol\n` +
          `◇ \`lockdown off\` — Deactivate security protocol`)]
      });
    }

    const action = args[0].toLowerCase();
    const reason = args.slice(1).join(' ') || 'No reason provided';

    if (action === 'on' || action === 'enable' || action === 'lock') {
      // Check if already locked
      if (guildConfig.security?.lockdownActive) {
        return message.reply({
          embeds: [await errorEmbed(message.guild.id, 'Protocol Active',
            `**Notice:** Security protocol is already engaged, Master.\n` +
            `Use \`lockdown off\` to disengage first.`)]
        });
      }

      // Get all lockable channels
      const textChannels = message.guild.channels.cache.filter(
        c => c.type === ChannelType.GuildText || c.type === ChannelType.GuildAnnouncement
      );
      const voiceChannels = message.guild.channels.cache.filter(
        c => c.type === ChannelType.GuildVoice || c.type === ChannelType.GuildStageVoice
      );

      const totalChannels = textChannels.size + voiceChannels.size;

      const statusMsg = await message.reply({
        embeds: [await infoEmbed(message.guild.id, 'Initiating Security Protocol...',
          `Preserving permissions and securing ${totalChannels} channels...`)]
      });

      // Save current permissions before locking
      const savedPermissions = [];

      // Save and lock text channels
      let lockedTextCount = 0;
      for (const [, channel] of textChannels) {
        try {
          // Get current @everyone overwrites
          const everyoneOverwrite = channel.permissionOverwrites.cache.get(message.guild.id);
          const currentPerms = everyoneOverwrite ? {
            SendMessages: everyoneOverwrite.allow.has(PermissionFlagsBits.SendMessages) ? true :
              everyoneOverwrite.deny.has(PermissionFlagsBits.SendMessages) ? false : null,
            CreatePublicThreads: everyoneOverwrite.allow.has(PermissionFlagsBits.CreatePublicThreads) ? true :
              everyoneOverwrite.deny.has(PermissionFlagsBits.CreatePublicThreads) ? false : null,
            CreatePrivateThreads: everyoneOverwrite.allow.has(PermissionFlagsBits.CreatePrivateThreads) ? true :
              everyoneOverwrite.deny.has(PermissionFlagsBits.CreatePrivateThreads) ? false : null,
            SendMessagesInThreads: everyoneOverwrite.allow.has(PermissionFlagsBits.SendMessagesInThreads) ? true :
              everyoneOverwrite.deny.has(PermissionFlagsBits.SendMessagesInThreads) ? false : null,
            AddReactions: everyoneOverwrite.allow.has(PermissionFlagsBits.AddReactions) ? true :
              everyoneOverwrite.deny.has(PermissionFlagsBits.AddReactions) ? false : null
          } : {
            SendMessages: null,
            CreatePublicThreads: null,
            CreatePrivateThreads: null,
            SendMessagesInThreads: null,
            AddReactions: null
          };

          savedPermissions.push({
            channelId: channel.id,
            channelType: 'text',
            permissions: currentPerms
          });

          // Apply lockdown permissions
          await channel.permissionOverwrites.edit(message.guild.id, {
            SendMessages: false,
            CreatePublicThreads: false,
            CreatePrivateThreads: false,
            SendMessagesInThreads: false,
            AddReactions: false
          }, { reason: `[Lockdown] ${reason}` });
          lockedTextCount++;
        } catch (error) {
          // Channel might not be editable
        }
      }

      // Save and lock voice channels
      let lockedVoiceCount = 0;
      for (const [, channel] of voiceChannels) {
        try {
          // Get current @everyone overwrites
          const everyoneOverwrite = channel.permissionOverwrites.cache.get(message.guild.id);
          const currentPerms = everyoneOverwrite ? {
            Connect: everyoneOverwrite.allow.has(PermissionFlagsBits.Connect) ? true :
              everyoneOverwrite.deny.has(PermissionFlagsBits.Connect) ? false : null,
            Speak: everyoneOverwrite.allow.has(PermissionFlagsBits.Speak) ? true :
              everyoneOverwrite.deny.has(PermissionFlagsBits.Speak) ? false : null,
            Stream: everyoneOverwrite.allow.has(PermissionFlagsBits.Stream) ? true :
              everyoneOverwrite.deny.has(PermissionFlagsBits.Stream) ? false : null,
            UseVAD: everyoneOverwrite.allow.has(PermissionFlagsBits.UseVAD) ? true :
              everyoneOverwrite.deny.has(PermissionFlagsBits.UseVAD) ? false : null
          } : {
            Connect: null,
            Speak: null,
            Stream: null,
            UseVAD: null
          };

          savedPermissions.push({
            channelId: channel.id,
            channelType: 'voice',
            permissions: currentPerms
          });

          // Apply lockdown permissions
          await channel.permissionOverwrites.edit(message.guild.id, {
            Connect: false,
            Speak: false,
            Stream: false,
            UseVAD: false
          }, { reason: `[Lockdown] ${reason}` });
          lockedVoiceCount++;
        } catch (error) {
          // Channel might not be editable
        }
      }

      // Save lockdown state and permissions to database
      await Guild.updateGuild(message.guild.id, {
        $set: {
          'security.lockdownActive': true,
          'security.lockdownReason': reason,
          'security.lockdownBy': message.author.id,
          'security.lockdownAt': new Date(),
          'security.lockdownPermissions': savedPermissions
        }
      });

      // Disconnect all members from voice channels
      for (const [, channel] of voiceChannels) {
        try {
          for (const [, member] of channel.members) {
            if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
              await member.voice.disconnect(`[Lockdown] ${reason}`).catch(() => { });
            }
          }
        } catch (error) {
          // Ignore errors
        }
      }

      await statusMsg.edit({
        embeds: [await successEmbed(message.guild.id, 'Security Protocol Engaged',
          `**Confirmed:** Secured **${lockedTextCount}** text channels and **${lockedVoiceCount}** voice channels, Master.\n\n` +
          `**Permissions Preserved:** ${savedPermissions.length} channels\n` +
          `**Active Restrictions:**\n` +
          `◇ Text: Messages, threads, and reactions disabled\n` +
          `◇ Voice: Connect, speak, and stream disabled\n\n` +
          `**Reason:** ${reason}\n` +
          `**Authority:** ${message.author.tag}\n\n` +
          `Use \`${await getPrefix(message.guild.id)}lockdown off\` to disengage protocol.`)]
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
            embeds: [await errorEmbed(message.guild.id, 'Security Protocol Activated',
              `**Initiated By:** ${message.author.tag}\n` +
              `**Reason:** ${reason}\n` +
              `**Text Channels Secured:** ${lockedTextCount}\n` +
              `**Voice Channels Secured:** ${lockedVoiceCount}\n\n` +
              `**Alert:** All channels are now restricted (text, voice & threads disabled).`)]
          });
        }
      }

    } else if (action === 'off' || action === 'disable' || action === 'unlock') {
      // Check if lockdown is active
      if (!guildConfig.security?.lockdownActive) {
        return message.reply({
          embeds: [await errorEmbed(message.guild.id, 'No Active Protocol',
            `**Notice:** Security protocol is not currently engaged, Master.`)]
        });
      }

      const savedPermissions = guildConfig.security.lockdownPermissions || [];
      const hasSavedPerms = savedPermissions.length > 0;

      const statusMsg = await message.reply({
        embeds: [await infoEmbed(message.guild.id, 'Disengaging Security Protocol...',
          hasSavedPerms
            ? `Restoring ${savedPermissions.length} preserved channel permissions...`
            : `Resetting channel permissions to default state...`)]
      });

      let restoredTextCount = 0;
      let restoredVoiceCount = 0;

      if (hasSavedPerms) {
        // Restore saved permissions
        for (const saved of savedPermissions) {
          const channel = message.guild.channels.cache.get(saved.channelId);
          if (!channel) continue;

          try {
            // Filter out null values - null means "inherit" which requires removing the overwrite
            // We need to set non-null values and then remove the null ones
            const permissionsToSet = {};
            const permissionsToRemove = [];

            for (const [key, value] of Object.entries(saved.permissions)) {
              if (value === null) {
                permissionsToRemove.push(key);
              } else {
                permissionsToSet[key] = value;
              }
            }

            // First, set the explicit permissions (true/false values)
            if (Object.keys(permissionsToSet).length > 0) {
              await channel.permissionOverwrites.edit(message.guild.id, permissionsToSet, {
                reason: 'Lockdown ended - restoring original permissions'
              });
            }

            // For null values, we need to reset them to neutral (inherit from role)
            // The only way to do this is to edit with the permission set to null
            // But discord.js requires us to use permissionOverwrites.edit with null values
            // to actually remove specific permission overwrites
            if (permissionsToRemove.length > 0) {
              const resetPerms = {};
              for (const perm of permissionsToRemove) {
                resetPerms[perm] = null;
              }
              await channel.permissionOverwrites.edit(message.guild.id, resetPerms, {
                reason: 'Lockdown ended - resetting inherited permissions'
              });
            }

            if (saved.channelType === 'text') {
              restoredTextCount++;
            } else {
              restoredVoiceCount++;
            }
          } catch (error) {
            // Channel might not be editable or was deleted
          }
        }
      } else {
        // Fallback: reset to null if no saved permissions
        const textChannels = message.guild.channels.cache.filter(
          c => c.type === ChannelType.GuildText || c.type === ChannelType.GuildAnnouncement
        );
        const voiceChannels = message.guild.channels.cache.filter(
          c => c.type === ChannelType.GuildVoice || c.type === ChannelType.GuildStageVoice
        );

        for (const [, channel] of textChannels) {
          try {
            await channel.permissionOverwrites.edit(message.guild.id, {
              SendMessages: null,
              CreatePublicThreads: null,
              CreatePrivateThreads: null,
              SendMessagesInThreads: null,
              AddReactions: null
            }, { reason: 'Lockdown ended' });
            restoredTextCount++;
          } catch (error) { }
        }

        for (const [, channel] of voiceChannels) {
          try {
            await channel.permissionOverwrites.edit(message.guild.id, {
              Connect: null,
              Speak: null,
              Stream: null,
              UseVAD: null
            }, { reason: 'Lockdown ended' });
            restoredVoiceCount++;
          } catch (error) { }
        }
      }

      // Clear lockdown state
      await Guild.updateGuild(message.guild.id, {
        $set: {
          'security.lockdownActive': false,
          'security.lockdownPermissions': []
        }
      });

      await statusMsg.edit({
        embeds: [await successEmbed(message.guild.id, '🔓 Server Lockdown Disabled',
          `${GLYPHS.SUCCESS} Restored **${restoredTextCount}** text channels and **${restoredVoiceCount}** voice channels.\n\n` +
          `${hasSavedPerms ? '✅ Original permissions have been restored.' : '⚠️ Permissions reset to default (no saved data found).'}\n` +
          `Server is now back to normal operation.`)]
      });

      // Announce in alert channel
      if (guildConfig.channels.alertLog && guildConfig.channels.alertLog !== message.channel.id) {
        const alertChannel = message.guild.channels.cache.get(guildConfig.channels.alertLog);
        if (alertChannel) {
          await alertChannel.send({
            embeds: [await successEmbed(message.guild.id, '🔓 SERVER LOCKDOWN ENDED',
              `**Ended By:** ${message.author.tag}\n` +
              `**Text Channels Restored:** ${restoredTextCount}\n` +
              `**Voice Channels Restored:** ${restoredVoiceCount}\n\n` +
              `${hasSavedPerms ? '✅ Original permissions restored.' : '⚠️ Permissions reset to default.'}`)]
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
  return guildConfig?.prefix || process.env.DEFAULT_PREFIX || '!';
}
