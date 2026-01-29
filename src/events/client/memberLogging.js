import { Events, EmbedBuilder, AuditLogEvent } from 'discord.js';
import Guild from '../../models/Guild.js';
import { GLYPHS } from '../../utils/embeds.js';

export default {
  name: 'memberLogging',

  async initialize(client) {
    // Member role updates
    client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
      await logMemberUpdate(oldMember, newMember);
    });

    // Member ban
    client.on(Events.GuildBanAdd, async (ban) => {
      await logBan(ban, true);
    });

    // Member unban
    client.on(Events.GuildBanRemove, async (ban) => {
      await logBan(ban, false);
    });

    console.log('👤 Member logging initialized');
  }
};

// Helper to fetch who performed a role change from audit logs
async function getRoleChangeExecutor(guild, targetId) {
  try {
    // Wait a bit for audit log to be created
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const auditLogs = await guild.fetchAuditLogs({
      limit: 5,
      type: AuditLogEvent.MemberRoleUpdate
    });

    const relevantLog = auditLogs.entries.find(entry => {
      const timeDiff = Date.now() - entry.createdTimestamp;
      return entry.target?.id === targetId && timeDiff < 5000; // Within 5 seconds
    });

    if (relevantLog) {
      const executor = relevantLog.executor;
      if (executor.id === guild.client.user.id) {
        return { name: 'System', type: 'system', user: executor };
      }
      if (executor.bot) {
        return { name: executor.username, type: 'bot', user: executor };
      }
      return { name: executor.username, type: 'user', user: executor };
    }

    return null;
  } catch (error) {
    // Missing permissions to view audit logs
    return null;
  }
}

// Helper to fetch who performed a nickname change from audit logs
async function getNicknameChangeExecutor(guild, targetId) {
  try {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const auditLogs = await guild.fetchAuditLogs({
      limit: 5,
      type: AuditLogEvent.MemberUpdate
    });

    const relevantLog = auditLogs.entries.find(entry => {
      const timeDiff = Date.now() - entry.createdTimestamp;
      return entry.target?.id === targetId && timeDiff < 5000;
    });

    if (relevantLog) {
      const executor = relevantLog.executor;
      // Check if user changed their own nickname
      if (executor.id === targetId) {
        return { name: executor.username, type: 'self', user: executor };
      }
      if (executor.bot) {
        return { name: executor.username, type: 'bot', user: executor };
      }
      return { name: executor.username, type: 'user', user: executor };
    }

    return null;
  } catch (error) {
    return null;
  }
}

// Helper to fetch who performed a timeout from audit logs
async function getTimeoutExecutor(guild, targetId) {
  try {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const auditLogs = await guild.fetchAuditLogs({
      limit: 5,
      type: AuditLogEvent.MemberUpdate
    });

    const relevantLog = auditLogs.entries.find(entry => {
      const timeDiff = Date.now() - entry.createdTimestamp;
      return entry.target?.id === targetId && timeDiff < 5000;
    });

    if (relevantLog) {
      const executor = relevantLog.executor;
      if (executor.id === guild.client.user.id) {
        return { name: 'System', type: 'system', user: executor };
      }
      if (executor.bot) {
        return { name: executor.username, type: 'bot', user: executor };
      }
      return { name: executor.username, type: 'user', user: executor };
    }

    return null;
  } catch (error) {
    return null;
  }
}

async function logMemberUpdate(oldMember, newMember) {
  try {
    if (newMember.user.bot) return;

    // Skip if oldMember is partial (cache incomplete) - this causes false positives
    if (oldMember.partial) return;

    // Skip if the old member's roles cache is incomplete
    // This prevents false role change logs when the bot restarts or member data is fetched
    if (oldMember.roles.cache.size <= 1 && newMember.roles.cache.size > 1) return;

    const guildConfig = await Guild.getGuild(newMember.guild.id, newMember.guild.name);

    if (!guildConfig.channels.memberLog) return;

    const logChannel = newMember.guild.channels.cache.get(guildConfig.channels.memberLog);
    if (!logChannel) return;

    const embeds = [];

    // Nickname change - only log if both are properly cached
    if (oldMember.nickname !== newMember.nickname && !oldMember.partial) {
      const executor = await getNicknameChangeExecutor(newMember.guild, newMember.id);
      
      let byText = '❓ Unknown';
      if (executor) {
        if (executor.type === 'self') {
          byText = '👤 Self';
        } else if (executor.type === 'bot') {
          byText = `🤖 ${executor.name} (Bot)`;
        } else {
          byText = `👤 ${executor.name}`;
        }
      }
      
      const embed = new EmbedBuilder()
        .setTitle('📝 Nickname Changed')
        .setColor('#5865F2')
        .setDescription(`**${newMember.user.username}**'s nickname was changed`)
        .addFields(
          { name: 'Before', value: oldMember.nickname || '*None*', inline: true },
          { name: 'After', value: newMember.nickname || '*None*', inline: true },
          { name: 'Changed By', value: byText, inline: true }
        )
        .setThumbnail(newMember.user.displayAvatarURL())
        .setFooter({ text: `User ID: ${newMember.id}` })
        .setTimestamp();

      embeds.push(embed);
    }

    // Role changes - filter out @everyone role (has same ID as guild)
    const guildId = newMember.guild.id;
    const addedRoles = newMember.roles.cache.filter(role =>
      role.id !== guildId && !oldMember.roles.cache.has(role.id)
    );
    const removedRoles = oldMember.roles.cache.filter(role =>
      role.id !== guildId && !newMember.roles.cache.has(role.id)
    );

    if (addedRoles.size > 0) {
      const executor = await getRoleChangeExecutor(newMember.guild, newMember.id);
      
      let assignedByText = '❓ Unknown';
      if (executor) {
        if (executor.type === 'system') {
          assignedByText = '⚙️ System';
        } else if (executor.type === 'bot') {
          assignedByText = `🤖 ${executor.name} (Bot)`;
        } else {
          assignedByText = `👤 ${executor.name}`;
        }
      }
      
      const embed = new EmbedBuilder()
        .setTitle('➕ Roles Added')
        .setColor('#57F287')
        .setDescription(`**${newMember.user.username}** received new role(s)`)
        .addFields(
          { name: 'Member', value: `${newMember.user.username}`, inline: true },
          { name: 'Roles Added', value: addedRoles.map(r => r.toString()).join(', '), inline: true },
          { name: 'Assigned By', value: assignedByText, inline: true }
        )
        .setThumbnail(newMember.user.displayAvatarURL())
        .setFooter({ text: `User ID: ${newMember.id}` })
        .setTimestamp();

      embeds.push(embed);
    }

    if (removedRoles.size > 0) {
      const executor = await getRoleChangeExecutor(newMember.guild, newMember.id);
      
      let removedByText = '❓ Unknown';
      if (executor) {
        if (executor.type === 'system') {
          removedByText = '⚙️ System';
        } else if (executor.type === 'bot') {
          removedByText = `🤖 ${executor.name} (Bot)`;
        } else {
          removedByText = `👤 ${executor.name}`;
        }
      }
      
      const embed = new EmbedBuilder()
        .setTitle('➖ Roles Removed')
        .setColor('#ED4245')
        .setDescription(`**${newMember.user.username}** had role(s) removed`)
        .addFields(
          { name: 'Member', value: `${newMember.user.username}`, inline: true },
          { name: 'Roles Removed', value: removedRoles.map(r => r.toString()).join(', '), inline: true },
          { name: 'Removed By', value: removedByText, inline: true }
        )
        .setThumbnail(newMember.user.displayAvatarURL())
        .setFooter({ text: `User ID: ${newMember.id}` })
        .setTimestamp();

      embeds.push(embed);
    }

    // Timeout changes
    if (oldMember.communicationDisabledUntil !== newMember.communicationDisabledUntil) {
      if (newMember.communicationDisabledUntil) {
        const until = Math.floor(newMember.communicationDisabledUntil.getTime() / 1000);
        const executor = await getTimeoutExecutor(newMember.guild, newMember.id);
        
        let timedOutByText = '❓ Unknown';
        if (executor) {
          if (executor.type === 'system') {
            timedOutByText = '⚙️ System';
          } else if (executor.type === 'bot') {
            timedOutByText = `🤖 ${executor.name} (Bot)`;
          } else {
            timedOutByText = `👤 ${executor.name}`;
          }
        }
        
        const embed = new EmbedBuilder()
          .setTitle('⏰ Member Timed Out')
          .setColor('#FEE75C')
          .setDescription(`**${newMember.user.username}** was timed out`)
          .addFields(
            { name: 'Member', value: `${newMember.user.username}`, inline: true },
            { name: 'Until', value: `<t:${until}:F>`, inline: true },
            { name: 'Timed Out By', value: timedOutByText, inline: true }
          )
          .setThumbnail(newMember.user.displayAvatarURL())
          .setFooter({ text: `User ID: ${newMember.id}` })
          .setTimestamp();

        embeds.push(embed);
      } else {
        const executor = await getTimeoutExecutor(newMember.guild, newMember.id);
        
        let liftedByText = '❓ Unknown';
        if (executor) {
          if (executor.type === 'system') {
            liftedByText = '⚙️ System (Expired)';
          } else if (executor.type === 'bot') {
            liftedByText = `🤖 ${executor.name} (Bot)`;
          } else {
            liftedByText = `👤 ${executor.name}`;
          }
        }
        
        const embed = new EmbedBuilder()
          .setTitle('『 Timeout Lifted 』')
          .setColor('#00FF7F')
          .setDescription(`**${newMember.user.username}**'s timeout restriction has been removed.`)
          .addFields(
            { name: '▸ Member', value: `${newMember.user.username}`, inline: true },
            { name: '▸ Lifted By', value: liftedByText, inline: true }
          )
          .setThumbnail(newMember.user.displayAvatarURL())
          .setFooter({ text: `User ID: ${newMember.id}` })
          .setTimestamp();

        embeds.push(embed);
      }
    }

    // Boost changes
    if (!oldMember.premiumSince && newMember.premiumSince) {
      const embed = new EmbedBuilder()
        .setTitle('💎 New Server Booster!')
        .setColor('#F47FFF')
        .setDescription(`**${newMember.user.username}** just boosted the server!`)
        .addFields(
          { name: 'Member', value: `${newMember.user.username}`, inline: true },
          { name: 'Boost Count', value: `${newMember.guild.premiumSubscriptionCount}`, inline: true }
        )
        .setThumbnail(newMember.user.displayAvatarURL())
        .setFooter({ text: `Thank you for boosting! 💜` })
        .setTimestamp();

      embeds.push(embed);
    } else if (oldMember.premiumSince && !newMember.premiumSince) {
      const embed = new EmbedBuilder()
        .setTitle('💔 Boost Removed')
        .setColor('#808080')
        .setDescription(`**${newMember.user.username}** is no longer boosting the server`)
        .addFields(
          { name: 'Member', value: `${newMember.user.username}`, inline: true }
        )
        .setThumbnail(newMember.user.displayAvatarURL())
        .setFooter({ text: `User ID: ${newMember.id}` })
        .setTimestamp();

      embeds.push(embed);
    }

    // Avatar change (server specific)
    if (oldMember.avatar !== newMember.avatar && newMember.avatar) {
      const embed = new EmbedBuilder()
        .setTitle('🖼️ Avatar Changed')
        .setColor('#5865F2')
        .setDescription(`**${newMember.user.username}** changed their server avatar`)
        .addFields(
          { name: 'Member', value: `${newMember.user.username}`, inline: true }
        )
        .setThumbnail(newMember.displayAvatarURL())
        .setImage(newMember.displayAvatarURL({ size: 256 }))
        .setFooter({ text: `User ID: ${newMember.id}` })
        .setTimestamp();

      embeds.push(embed);
    }

    // Send all embeds
    for (const embed of embeds) {
      await logChannel.send({ embeds: [embed] });
    }

  } catch (error) {
    console.error('Error logging member update:', error);
  }
}

async function logBan(ban, isBan) {
  try {
    const guildConfig = await Guild.getGuild(ban.guild.id, ban.guild.name);

    if (!guildConfig.channels.memberLog) return;

    const logChannel = ban.guild.channels.cache.get(guildConfig.channels.memberLog);
    if (!logChannel) return;

    const embed = new EmbedBuilder()
      .setTitle(isBan ? '🔨 Member Banned' : '🔓 Member Unbanned')
      .setColor(isBan ? '#ED4245' : '#57F287')
      .setDescription(`${ban.user.username} was ${isBan ? 'banned from' : 'unbanned in'} the server`)
      .addFields(
        { name: 'User', value: `${ban.user.username}`, inline: true },
        { name: 'User ID', value: ban.user.id, inline: true }
      )
      .setThumbnail(ban.user.displayAvatarURL())
      .setTimestamp();

    if (ban.reason) {
      embed.addFields({ name: 'Reason', value: ban.reason, inline: false });
    }

    await logChannel.send({ embeds: [embed] });

  } catch (error) {
    console.error('Error logging ban:', error);
  }
}
