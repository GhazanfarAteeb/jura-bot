import { Events, Collection, PermissionFlagsBits, ChannelType } from 'discord.js';
import Guild from '../../models/Guild.js';
import { errorEmbed, infoEmbed, GLYPHS } from '../../utils/embeds.js';
import { getPrefix } from '../../utils/helpers.js';

// Cache for tracking joins
const joinCache = new Collection(); // guildId -> { joins: [{ userId, timestamp }], raidMode: boolean }

export default {
  name: Events.GuildMemberAdd,
  priority: 1, // Run before other member add handlers

  async execute(member, client) {
    try {
      const guildConfig = await Guild.getGuild(member.guild.id, member.guild.name);
      const antiRaid = guildConfig.features.autoMod.antiRaid;

      if (!antiRaid?.enabled) return;

      const guildId = member.guild.id;
      const now = Date.now();

      // Initialize cache for guild
      if (!joinCache.has(guildId)) {
        joinCache.set(guildId, {
          joins: [],
          raidMode: false,
          lockdownActive: false
        });
      }

      const guildCache = joinCache.get(guildId);

      // Clean old joins outside time window
      const timeWindow = antiRaid.timeWindow * 1000;
      guildCache.joins = guildCache.joins.filter(j => now - j.timestamp < timeWindow);

      // Add this join
      guildCache.joins.push({
        userId: member.user.id,
        timestamp: now
      });

      // Check if we've exceeded the threshold
      if (guildCache.joins.length >= antiRaid.joinThreshold) {
        if (!guildCache.raidMode) {
          guildCache.raidMode = true;
          await this.handleRaidDetected(member.guild, client, guildConfig, guildCache.joins, antiRaid.action);
        }

        // Take action on this member based on configured action
        await this.handleRaidMember(member, guildConfig, antiRaid.action);
      }

    } catch (error) {
      console.error('Anti-raid error:', error);
    }
  },

  async handleRaidDetected(guild, client, guildConfig, recentJoins, action) {
    console.log(`🚨 Raid detected in ${guild.name}! ${recentJoins.length} members joined rapidly`);

    try {
      // Send alert to staff
      if (guildConfig.channels.alertLog) {
        const alertChannel = guild.channels.cache.get(guildConfig.channels.alertLog);
        if (alertChannel) {
          const joinList = recentJoins.slice(-10).map(j => `<@${j.userId}>`).join(', ');

          const embed = await errorEmbed(guild.id, '🚨 RAID DETECTED',
            `**${recentJoins.length} members** joined in rapid succession!\n\n` +
            `**Recent Joins:**\n${joinList}\n\n` +
            `**Action Being Taken:** ${action.toUpperCase()}\n\n` +
            `${GLYPHS.WARNING} Review immediately and take additional action if needed!`
          );
          embed.setColor('#FF0000');

          const staffMention = guildConfig.roles.staffRoles?.length > 0
            ? guildConfig.roles.staffRoles.map(r => `<@&${r}>`).join(' ')
            : '@here';

          await alertChannel.send({
            content: staffMention,
            embeds: [embed]
          });
        }
      }

      // If action is lockdown, lock all channels
      if (action === 'lockdown') {
        await this.enableLockdown(guild, guildConfig, 'Raid detected - automatic lockdown');
      }

      // DM server owner
      try {
        const owner = await guild.fetchOwner();
        const prefix = await getPrefix(guild.id);
        const dmEmbed = await errorEmbed(guild.id, '🚨 Raid Detected on Your Server',
          `**Server:** ${guild.name}\n` +
          `**Members Joined:** ${recentJoins.length}\n\n` +
          `**Action Taken:** ${action.toUpperCase()}\n\n` +
          `Use \`${prefix}antiraid disable\` if this was a false positive.\n` +
          `Use \`${prefix}lockdown off\` to end lockdown mode.`
        );
        await owner.send({ embeds: [dmEmbed] }).catch(() => { });
      } catch (error) {
        console.error('Failed to DM server owner:', error);
      }

      // Auto-disable raid mode after 5 minutes
      setTimeout(() => {
        const cache = joinCache.get(guild.id);
        if (cache) {
          cache.raidMode = false;
          cache.joins = [];
        }
      }, 300000);

    } catch (error) {
      console.error('Error handling raid:', error);
    }
  },

  async handleRaidMember(member, guildConfig, action) {
    try {
      switch (action) {
        case 'kick':
          if (member.kickable) {
            try {
              await member.send({
                content: `⚠️ You were kicked from **${member.guild.name}** due to anti-raid protection. If this was a mistake, please try rejoining later.`
              }).catch(() => { });
              await member.kick('[Anti-Raid] Raid protection active');
            } catch (error) {
              console.error('Failed to kick raid member:', error);
            }
          }
          break;

        case 'ban':
          if (member.bannable) {
            try {
              await member.send({
                content: `⚠️ You were banned from **${member.guild.name}** due to anti-raid protection. If this was a mistake, please contact a server administrator.`
              }).catch(() => { });
              await member.ban({
                reason: '[Anti-Raid] Raid protection active',
                deleteMessageSeconds: 86400
              });
            } catch (error) {
              console.error('Failed to ban raid member:', error);
            }
          }
          break;

        case 'lockdown':
          // Just lock channels, don't kick/ban
          // Optionally assign a verification role
          if (guildConfig.roles.susRole) {
            const susRole = member.guild.roles.cache.get(guildConfig.roles.susRole);
            if (susRole && member.manageable) {
              await member.roles.add(susRole, '[Anti-Raid] Raid protection active');
            }
          }
          break;
      }
    } catch (error) {
      console.error('Error handling raid member:', error);
    }
  },

  async enableLockdown(guild, guildConfig, reason) {
    console.log(`🔒 Enabling lockdown in ${guild.name}`);

    try {
      // Update database
      guildConfig.security = guildConfig.security || {};
      guildConfig.security.lockdownActive = true;
      guildConfig.security.lockdownReason = reason;
      guildConfig.security.lockdownAt = new Date();
      await guildConfig.save();

      // Lock all text channels
      const textChannels = guild.channels.cache.filter(
        c => c.type === ChannelType.GuildText && c.permissionsFor(guild.id)
      );

      for (const [, channel] of textChannels) {
        try {
          await channel.permissionOverwrites.edit(guild.id, {
            SendMessages: false
          }, { reason: `[Anti-Raid] ${reason}` });
        } catch (error) {
          // Channel might not be editable
        }
      }

      // Clear the join cache for this guild
      const cache = joinCache.get(guild.id);
      if (cache) {
        cache.lockdownActive = true;
      }

      // Send lockdown message to all channels or just the main one
      if (guildConfig.channels.alertLog) {
        const alertChannel = guild.channels.cache.get(guildConfig.channels.alertLog);
        if (alertChannel) {
          const prefix = await getPrefix(guild.id);
          const embed = await infoEmbed(guild.id, '🔒 SERVER LOCKDOWN ENABLED',
            `The server has been locked down due to:\n**${reason}**\n\n` +
            `Regular members cannot send messages until lockdown is lifted.\n\n` +
            `Staff: Use \`${prefix}lockdown off\` to disable lockdown.`
          );
          embed.setColor('#FF9900');
          await alertChannel.send({ embeds: [embed] });
        }
      }

    } catch (error) {
      console.error('Error enabling lockdown:', error);
    }
  }
};

// Cleanup old cache entries periodically
setInterval(() => {
  const now = Date.now();
  const maxAge = 300000; // 5 minutes

  for (const [guildId, data] of joinCache) {
    // Clean old joins
    data.joins = data.joins.filter(j => now - j.timestamp < maxAge);

    // Reset raid mode if no recent joins
    if (data.joins.length === 0 && data.raidMode) {
      data.raidMode = false;
    }
  }
}, 60000);
