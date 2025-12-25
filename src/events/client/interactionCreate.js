import { Events, Collection, PermissionFlagsBits } from 'discord.js';
import logger from '../../utils/logger.js';
import Guild from '../../models/Guild.js';

export default {
  name: Events.InteractionCreate,
  async execute(interaction, client) {
    if (!interaction.isChatInputCommand()) return;

    // Check if slash commands are enabled for this guild
    const guildConfig = await Guild.getGuild(interaction.guild.id, interaction.guild.name);

    // Check if command is disabled
    if (guildConfig.slashCommands?.disabledCommands?.includes(interaction.commandName)) {
      return interaction.reply({
        content: '❌ This slash command has been disabled by an administrator.',
        ephemeral: true
      });
    }

    // Check for role-based permissions
    const hasAdminRole = guildConfig.roles.adminRoles?.some(roleId =>
      interaction.member.roles.cache.has(roleId)
    );
    const hasModRole = guildConfig.roles.moderatorRoles?.some(roleId =>
      interaction.member.roles.cache.has(roleId)
    ) || guildConfig.roles.staffRoles?.some(roleId =>
      interaction.member.roles.cache.has(roleId)
    );

    // Handle special slash commands that need custom handling
    const specialCommands = ['automod', 'lockdown', 'setrole', 'setchannel', 'slashcommands'];
    if (specialCommands.includes(interaction.commandName)) {
      return handleSpecialCommand(interaction, client, guildConfig, hasAdminRole);
    }

    const command = client.commands.get(interaction.commandName);

    if (!command) {
      console.error(`No command matching ${interaction.commandName} was found.`);
      await interaction.reply({
        content: `Command \`/${interaction.commandName}\` not found! The command may not be implemented yet.`,
        ephemeral: true
      }).catch(console.error);
      return;
    }

    try {
      const startTime = Date.now();

      // Parse slash command options into args array (do this before deferring)
      const args = [];

      // Handle different option types
      for (const option of interaction.options.data) {
        if (option.type === 6) { // USER type
          const user = interaction.options.getUser(option.name);
          if (user) args.push(`<@${user.id}>`); // Add as mention string for compatibility
        } else if (option.value !== undefined) {
          args.push(String(option.value));
        }
      }

      // Convert interaction to message-like object with Collection instead of Map
      const fakeMessage = {
        author: interaction.user,
        guild: interaction.guild,
        channel: interaction.channel,
        member: interaction.member,
        mentions: {
          users: new Collection(),
          members: new Collection()
        },
        reply: async (options) => {
          try {
            if (interaction.deferred || interaction.replied) {
              return await interaction.editReply(options);
            }
            return await interaction.reply(options);
          } catch (error) {
            console.error('Error replying to interaction:', error);
            return null;
          }
        }
      };

      // Defer reply now, before heavy operations
      await interaction.deferReply().catch(() => { });

      // Add mentioned users to fake message
      for (const option of interaction.options.data) {
        if (option.type === 6) { // USER type
          const user = interaction.options.getUser(option.name);
          if (user) {
            fakeMessage.mentions.users.set(user.id, user);
            if (interaction.guild) {
              const member = await interaction.guild.members.fetch(user.id).catch(() => null);
              if (member) fakeMessage.mentions.members.set(user.id, member);
            }
          }
        }
      }

      // Check cooldowns
      if (command.cooldown) {
        const { cooldowns } = client;

        if (!cooldowns.has(command.name)) {
          cooldowns.set(command.name, new Map());
        }

        const now = Date.now();
        const timestamps = cooldowns.get(command.name);
        const cooldownAmount = (command.cooldown || 3) * 1000;

        if (timestamps.has(interaction.user.id)) {
          const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;

          if (now < expirationTime) {
            const timeLeft = Math.ceil((expirationTime - now) / 1000);

            // Format time left nicely
            let timeString;
            if (timeLeft >= 60) {
              const minutes = Math.floor(timeLeft / 60);
              const seconds = timeLeft % 60;
              timeString = `${minutes} minute${minutes !== 1 ? 's' : ''} ${seconds} second${seconds !== 1 ? 's' : ''}`;
            } else {
              timeString = `${timeLeft} second${timeLeft !== 1 ? 's' : ''}`;
            }

            await interaction.editReply({
              content: `⏰ **Cooldown Active**\n\n⏱️ Please wait **${timeString}** before using \`${command.name}\` again.\n\nAvailable <t:${Math.floor(expirationTime / 1000)}:R>`,
              ephemeral: true
            });
            return;
          }
        }

        timestamps.set(interaction.user.id, now);
        setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);
      }

      // Execute the command
      // Wave-Music Command class (uses run method with Context)
      if (typeof command.run === 'function') {
        const Context = (await import('../../structures/Context.js')).default;
        const ctx = new Context(interaction, args);
        await command.run(client, ctx, args);
      }
      // Legacy command object (uses execute method)
      else if (typeof command.execute === 'function') {
        await command.execute(fakeMessage, args, client);
      }

      const duration = Date.now() - startTime;
      logger.command(command.name, interaction.user, interaction.guild, true);
      logger.performance(`Slash Command: ${command.name}`, duration, {
        user: interaction.user.tag,
        guild: interaction.guild?.name || 'DM'
      });

    } catch (error) {
      logger.command(command.name, interaction.user, interaction.guild, false, error);
      logger.error(`Slash command execution failed: ${command.name}`, error);
      console.error(`Error executing ${interaction.commandName}:`, error);

      const errorMessage = 'There was an error while executing this command!';

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: errorMessage, ephemeral: true });
      } else {
        await interaction.reply({ content: errorMessage, ephemeral: true });
      }
    }
  },
};

// Handle special slash commands that need custom implementations
async function handleSpecialCommand(interaction, client, guildConfig, hasAdminRole) {
  const { successEmbed, errorEmbed, infoEmbed, GLYPHS } = await import('../../utils/embeds.js');

  // Check admin permission
  if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator) && !hasAdminRole) {
    return interaction.reply({
      content: '❌ You need Administrator permissions to use this command.',
      ephemeral: true
    });
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    switch (interaction.commandName) {
      case 'automod':
        await handleAutomodCommand(interaction, guildConfig);
        break;
      case 'lockdown':
        await handleLockdownCommand(interaction, guildConfig);
        break;
      case 'setrole':
        await handleSetroleCommand(interaction, guildConfig);
        break;
      case 'setchannel':
        await handleSetchannelCommand(interaction, guildConfig);
        break;
      case 'slashcommands':
        await handleSlashcommandsCommand(interaction, guildConfig);
        break;
    }
  } catch (error) {
    console.error(`Error handling ${interaction.commandName}:`, error);
    await interaction.editReply({
      content: '❌ An error occurred while executing this command.',
    });
  }
}

async function handleAutomodCommand(interaction, guildConfig) {
  const { successEmbed, errorEmbed, infoEmbed, GLYPHS } = await import('../../utils/embeds.js');
  const subcommand = interaction.options.getSubcommand();

  switch (subcommand) {
    case 'enable':
      guildConfig.features.autoMod.enabled = true;
      await guildConfig.save();
      await interaction.editReply({
        embeds: [await successEmbed(interaction.guild.id, 'AutoMod Enabled',
          `${GLYPHS.SUCCESS} AutoMod has been enabled for this server.`)]
      });
      break;

    case 'disable':
      guildConfig.features.autoMod.enabled = false;
      await guildConfig.save();
      await interaction.editReply({
        embeds: [await successEmbed(interaction.guild.id, 'AutoMod Disabled',
          `${GLYPHS.SUCCESS} AutoMod has been disabled for this server.`)]
      });
      break;

    case 'status':
      const autoMod = guildConfig.features.autoMod;
      const statusEmbed = await infoEmbed(interaction.guild.id, '🛡️ AutoMod Status',
        `**Overall:** ${autoMod.enabled ? '✅ Enabled' : '❌ Disabled'}\n\n` +
        `**Features:**\n` +
        `${GLYPHS.DOT} Anti-Spam: ${autoMod.antiSpam.enabled ? '✅' : '❌'} (${autoMod.antiSpam.messageLimit} msgs/${autoMod.antiSpam.timeWindow}s)\n` +
        `${GLYPHS.DOT} Anti-Raid: ${autoMod.antiRaid?.enabled ? '✅' : '❌'} (${autoMod.antiRaid?.joinThreshold || 10} joins/${autoMod.antiRaid?.timeWindow || 30}s)\n` +
        `${GLYPHS.DOT} Anti-Nuke: ${autoMod.antiNuke?.enabled ? '✅' : '❌'}\n` +
        `${GLYPHS.DOT} Anti-Invites: ${autoMod.antiInvites?.enabled ? '✅' : '❌'}\n` +
        `${GLYPHS.DOT} Anti-Links: ${autoMod.antiLinks?.enabled ? '✅' : '❌'}\n` +
        `${GLYPHS.DOT} Bad Words: ${autoMod.badWords?.enabled ? '✅' : '❌'} (${autoMod.badWords?.words?.length || 0} words)\n` +
        `${GLYPHS.DOT} Mass Mention: ${autoMod.antiMassMention?.enabled ? '✅' : '❌'} (limit: ${autoMod.antiMassMention?.limit || 5})`
      );
      await interaction.editReply({ embeds: [statusEmbed] });
      break;

    case 'badwords':
      await handleBadwordsSubcommand(interaction, guildConfig);
      break;

    case 'antispam':
      const spamEnabled = interaction.options.getBoolean('enabled');
      const messageLimit = interaction.options.getInteger('message_limit');
      const timeWindow = interaction.options.getInteger('time_window');

      guildConfig.features.autoMod.antiSpam.enabled = spamEnabled;
      if (messageLimit) guildConfig.features.autoMod.antiSpam.messageLimit = messageLimit;
      if (timeWindow) guildConfig.features.autoMod.antiSpam.timeWindow = timeWindow;
      await guildConfig.save();

      await interaction.editReply({
        embeds: [await successEmbed(interaction.guild.id, 'Anti-Spam Updated',
          `${GLYPHS.SUCCESS} Anti-Spam is now ${spamEnabled ? 'enabled' : 'disabled'}.\n` +
          `${GLYPHS.DOT} Message Limit: ${guildConfig.features.autoMod.antiSpam.messageLimit}\n` +
          `${GLYPHS.DOT} Time Window: ${guildConfig.features.autoMod.antiSpam.timeWindow}s`)]
      });
      break;

    case 'antiraid':
      const raidEnabled = interaction.options.getBoolean('enabled');
      const joinThreshold = interaction.options.getInteger('join_threshold');
      const raidAction = interaction.options.getString('action');

      // Ensure antiRaid is an object (fix for legacy boolean values)
      if (!guildConfig.features.autoMod.antiRaid || typeof guildConfig.features.autoMod.antiRaid === 'boolean') {
        guildConfig.features.autoMod.antiRaid = {
          enabled: false,
          joinThreshold: 10,
          timeWindow: 30,
          action: 'lockdown'
        };
      }

      guildConfig.features.autoMod.antiRaid.enabled = raidEnabled;
      if (joinThreshold) guildConfig.features.autoMod.antiRaid.joinThreshold = joinThreshold;
      if (raidAction) guildConfig.features.autoMod.antiRaid.action = raidAction;
      await guildConfig.save();

      await interaction.editReply({
        embeds: [await successEmbed(interaction.guild.id, 'Anti-Raid Updated',
          `${GLYPHS.SUCCESS} Anti-Raid is now ${raidEnabled ? 'enabled' : 'disabled'}.\n` +
          `${GLYPHS.DOT} Join Threshold: ${guildConfig.features.autoMod.antiRaid.joinThreshold}\n` +
          `${GLYPHS.DOT} Action: ${guildConfig.features.autoMod.antiRaid.action}`)]
      });
      break;

    case 'antinuke':
      const nukeEnabled = interaction.options.getBoolean('enabled');
      const nukeAction = interaction.options.getString('action');

      // Ensure antiNuke is an object (fix for legacy boolean values)
      if (!guildConfig.features.autoMod.antiNuke || typeof guildConfig.features.autoMod.antiNuke === 'boolean') {
        guildConfig.features.autoMod.antiNuke = {
          enabled: false,
          banThreshold: 5,
          kickThreshold: 5,
          roleDeleteThreshold: 3,
          channelDeleteThreshold: 3,
          timeWindow: 60,
          action: 'removeRoles',
          whitelistedUsers: []
        };
      }

      guildConfig.features.autoMod.antiNuke.enabled = nukeEnabled;
      if (nukeAction) guildConfig.features.autoMod.antiNuke.action = nukeAction;
      await guildConfig.save();

      await interaction.editReply({
        embeds: [await successEmbed(interaction.guild.id, 'Anti-Nuke Updated',
          `${GLYPHS.SUCCESS} Anti-Nuke is now ${nukeEnabled ? 'enabled' : 'disabled'}.\n` +
          `${GLYPHS.DOT} Action: ${guildConfig.features.autoMod.antiNuke.action}`)]
      });
      break;
  }
}

async function handleBadwordsSubcommand(interaction, guildConfig) {
  const { successEmbed, errorEmbed, infoEmbed, GLYPHS } = await import('../../utils/embeds.js');
  const action = interaction.options.getString('action');
  const words = interaction.options.getString('words');
  const punishment = interaction.options.getString('punishment');

  if (!guildConfig.features.autoMod.badWords) {
    guildConfig.features.autoMod.badWords = { enabled: false, words: [], action: 'delete' };
  }

  switch (action) {
    case 'add':
      if (!words) {
        return interaction.editReply({
          embeds: [await errorEmbed(interaction.guild.id, 'Missing Words',
            'Please provide words to add (comma separated).')]
        });
      }
      const newWords = words.split(',').map(w => w.trim().toLowerCase()).filter(w => w);
      const existingWords = guildConfig.features.autoMod.badWords.words || [];
      guildConfig.features.autoMod.badWords.words = [...new Set([...existingWords, ...newWords])];
      await guildConfig.save();

      await interaction.editReply({
        embeds: [await successEmbed(interaction.guild.id, 'Words Added',
          `${GLYPHS.SUCCESS} Added ${newWords.length} word(s) to the filter.\n` +
          `Total words: ${guildConfig.features.autoMod.badWords.words.length}`)]
      });
      break;

    case 'remove':
      if (!words) {
        return interaction.editReply({
          embeds: [await errorEmbed(interaction.guild.id, 'Missing Words',
            'Please provide words to remove (comma separated).')]
        });
      }
      const removeWords = words.split(',').map(w => w.trim().toLowerCase());
      guildConfig.features.autoMod.badWords.words = (guildConfig.features.autoMod.badWords.words || [])
        .filter(w => !removeWords.includes(w));
      await guildConfig.save();

      await interaction.editReply({
        embeds: [await successEmbed(interaction.guild.id, 'Words Removed',
          `${GLYPHS.SUCCESS} Removed words from the filter.\n` +
          `Total words: ${guildConfig.features.autoMod.badWords.words.length}`)]
      });
      break;

    case 'list':
      const wordList = guildConfig.features.autoMod.badWords.words || [];
      if (wordList.length === 0) {
        return interaction.editReply({
          embeds: [await infoEmbed(interaction.guild.id, 'Bad Words List',
            'No bad words configured. Use `/automod badwords add` to add words.')]
        });
      }

      // Hide actual words, just show count and masked preview
      const maskedWords = wordList.map(w => w[0] + '*'.repeat(w.length - 1)).slice(0, 20);
      await interaction.editReply({
        embeds: [await infoEmbed(interaction.guild.id, 'Bad Words List',
          `**Total Words:** ${wordList.length}\n\n` +
          `**Preview (masked):**\n${maskedWords.join(', ')}${wordList.length > 20 ? '...' : ''}\n\n` +
          `**Current Action:** ${guildConfig.features.autoMod.badWords.action}`)]
      });
      break;

    case 'setaction':
      if (!punishment) {
        return interaction.editReply({
          embeds: [await errorEmbed(interaction.guild.id, 'Missing Punishment',
            'Please select a punishment action.')]
        });
      }
      guildConfig.features.autoMod.badWords.action = punishment;
      await guildConfig.save();

      await interaction.editReply({
        embeds: [await successEmbed(interaction.guild.id, 'Action Updated',
          `${GLYPHS.SUCCESS} Bad words action set to: **${punishment}**`)]
      });
      break;

    case 'enable':
      guildConfig.features.autoMod.badWords.enabled = true;
      await guildConfig.save();
      await interaction.editReply({
        embeds: [await successEmbed(interaction.guild.id, 'Bad Words Filter Enabled',
          `${GLYPHS.SUCCESS} Bad words filter is now enabled.`)]
      });
      break;

    case 'disable':
      guildConfig.features.autoMod.badWords.enabled = false;
      await guildConfig.save();
      await interaction.editReply({
        embeds: [await successEmbed(interaction.guild.id, 'Bad Words Filter Disabled',
          `${GLYPHS.SUCCESS} Bad words filter is now disabled.`)]
      });
      break;
  }
}

async function handleLockdownCommand(interaction, guildConfig) {
  const { successEmbed, infoEmbed, GLYPHS } = await import('../../utils/embeds.js');
  const { ChannelType } = await import('discord.js');

  const action = interaction.options.getString('action');
  const reason = interaction.options.getString('reason') || 'No reason provided';

  if (action === 'on') {
    // Enable lockdown
    guildConfig.security = guildConfig.security || {};
    guildConfig.security.lockdownActive = true;
    guildConfig.security.lockdownReason = reason;
    guildConfig.security.lockdownBy = interaction.user.id;
    guildConfig.security.lockdownAt = new Date();
    await guildConfig.save();

    // Lock all text channels
    const textChannels = interaction.guild.channels.cache.filter(
      c => c.type === ChannelType.GuildText
    );

    let lockedCount = 0;
    for (const [, channel] of textChannels) {
      try {
        await channel.permissionOverwrites.edit(interaction.guild.id, {
          SendMessages: false
        }, { reason: `[Lockdown] ${reason}` });
        lockedCount++;
      } catch (error) {
        // Channel might not be editable
      }
    }

    await interaction.editReply({
      embeds: [await successEmbed(interaction.guild.id, '🔒 Server Lockdown Enabled',
        `${GLYPHS.SUCCESS} Locked ${lockedCount} channels.\n\n` +
        `**Reason:** ${reason}\n` +
        `**By:** ${interaction.user.tag}\n\n` +
        `Use \`/lockdown off\` to unlock the server.`)]
    });

    // Announce in alert channel
    if (guildConfig.channels.alertLog) {
      const alertChannel = interaction.guild.channels.cache.get(guildConfig.channels.alertLog);
      if (alertChannel) {
        await alertChannel.send({
          embeds: [await infoEmbed(interaction.guild.id, '🔒 SERVER LOCKDOWN',
            `**Activated By:** ${interaction.user.tag}\n` +
            `**Reason:** ${reason}\n` +
            `**Channels Locked:** ${lockedCount}`)]
        });
      }
    }

  } else {
    // Disable lockdown
    guildConfig.security = guildConfig.security || {};
    guildConfig.security.lockdownActive = false;
    await guildConfig.save();

    // Unlock all text channels
    const textChannels = interaction.guild.channels.cache.filter(
      c => c.type === ChannelType.GuildText
    );

    let unlockedCount = 0;
    for (const [, channel] of textChannels) {
      try {
        await channel.permissionOverwrites.edit(interaction.guild.id, {
          SendMessages: null
        }, { reason: 'Lockdown ended' });
        unlockedCount++;
      } catch (error) {
        // Channel might not be editable
      }
    }

    await interaction.editReply({
      embeds: [await successEmbed(interaction.guild.id, '🔓 Server Lockdown Disabled',
        `${GLYPHS.SUCCESS} Unlocked ${unlockedCount} channels.\n\n` +
        `Server is now back to normal operation.`)]
    });
  }
}

async function handleSetroleCommand(interaction, guildConfig) {
  const { successEmbed, GLYPHS } = await import('../../utils/embeds.js');

  const type = interaction.options.getString('type');
  const role = interaction.options.getRole('role');

  switch (type) {
    case 'staff':
      if (!guildConfig.roles.staffRoles) guildConfig.roles.staffRoles = [];
      if (!guildConfig.roles.staffRoles.includes(role.id)) {
        guildConfig.roles.staffRoles.push(role.id);
      }
      if (!guildConfig.roles.moderatorRoles) guildConfig.roles.moderatorRoles = [];
      if (!guildConfig.roles.moderatorRoles.includes(role.id)) {
        guildConfig.roles.moderatorRoles.push(role.id);
      }
      break;
    case 'admin':
      if (!guildConfig.roles.adminRoles) guildConfig.roles.adminRoles = [];
      if (!guildConfig.roles.adminRoles.includes(role.id)) {
        guildConfig.roles.adminRoles.push(role.id);
      }
      break;
    case 'sus':
      guildConfig.roles.susRole = role.id;
      if (guildConfig.features.memberTracking) {
        guildConfig.features.memberTracking.susRole = role.id;
      }
      break;
    case 'newaccount':
      guildConfig.roles.newAccountRole = role.id;
      break;
    case 'muted':
      guildConfig.roles.mutedRole = role.id;
      break;
  }

  await guildConfig.save();

  const typeNames = {
    staff: 'Staff/Moderator',
    admin: 'Admin',
    sus: 'Suspicious Member',
    newaccount: 'New Account',
    muted: 'Muted'
  };

  await interaction.editReply({
    embeds: [await successEmbed(interaction.guild.id, 'Role Configured',
      `${GLYPHS.SUCCESS} **${typeNames[type]}** role set to ${role}`)]
  });
}

async function handleSetchannelCommand(interaction, guildConfig) {
  const { successEmbed, GLYPHS } = await import('../../utils/embeds.js');

  const type = interaction.options.getString('type');
  const channel = interaction.options.getChannel('channel');

  switch (type) {
    case 'modlog':
      guildConfig.channels.modLog = channel.id;
      break;
    case 'alertlog':
      guildConfig.channels.alertLog = channel.id;
      break;
    case 'joinlog':
      guildConfig.channels.joinLog = channel.id;
      break;
    case 'leavelog':
      guildConfig.channels.leaveLog = channel.id;
      break;
    case 'messagelog':
      guildConfig.channels.messageLog = channel.id;
      break;
    case 'staff':
      guildConfig.channels.staffChannel = channel.id;
      break;
  }

  await guildConfig.save();

  const typeNames = {
    modlog: 'Mod Log',
    alertlog: 'Alert Log',
    joinlog: 'Join Log',
    leavelog: 'Leave Log',
    messagelog: 'Message Log',
    staff: 'Staff Channel'
  };

  await interaction.editReply({
    embeds: [await successEmbed(interaction.guild.id, 'Channel Configured',
      `${GLYPHS.SUCCESS} **${typeNames[type]}** channel set to ${channel}`)]
  });
}

async function handleSlashcommandsCommand(interaction, guildConfig) {
  const { successEmbed, infoEmbed, GLYPHS } = await import('../../utils/embeds.js');

  const subcommand = interaction.options.getSubcommand();

  if (!guildConfig.slashCommands) {
    guildConfig.slashCommands = { enabled: true, disabledCommands: [] };
  }

  switch (subcommand) {
    case 'enable':
      const enableCmd = interaction.options.getString('command').toLowerCase();
      guildConfig.slashCommands.disabledCommands = guildConfig.slashCommands.disabledCommands
        .filter(c => c !== enableCmd);
      await guildConfig.save();

      await interaction.editReply({
        embeds: [await successEmbed(interaction.guild.id, 'Command Enabled',
          `${GLYPHS.SUCCESS} Slash command \`/${enableCmd}\` is now enabled.`)]
      });
      break;

    case 'disable':
      const disableCmd = interaction.options.getString('command').toLowerCase();
      if (!guildConfig.slashCommands.disabledCommands.includes(disableCmd)) {
        guildConfig.slashCommands.disabledCommands.push(disableCmd);
      }
      await guildConfig.save();

      await interaction.editReply({
        embeds: [await successEmbed(interaction.guild.id, 'Command Disabled',
          `${GLYPHS.SUCCESS} Slash command \`/${disableCmd}\` is now disabled.`)]
      });
      break;

    case 'list':
      const { getSlashCommands } = await import('../../utils/slashCommands.js');
      const allCommands = getSlashCommands();
      const disabled = guildConfig.slashCommands.disabledCommands || [];

      const commandList = allCommands.map(cmd => {
        const name = cmd.name;
        const isDisabled = disabled.includes(name);
        return `${isDisabled ? '❌' : '✅'} \`/${name}\``;
      }).join('\n');

      await interaction.editReply({
        embeds: [await infoEmbed(interaction.guild.id, 'Slash Commands',
          `**Status:** ${guildConfig.slashCommands.enabled ? 'Enabled' : 'Disabled'}\n\n` +
          `**Commands:**\n${commandList}`)]
      });
      break;
  }
}
