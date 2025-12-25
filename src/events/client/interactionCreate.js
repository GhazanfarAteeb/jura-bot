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
    const specialCommands = ['automod', 'lockdown', 'setrole', 'setchannel', 'slashcommands', 'refreshcache', 'birthdaysettings', 'setbirthday', 'config', 'setup', 'welcome'];
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
      case 'refreshcache':
        await handleRefreshCacheCommand(interaction, client, guildConfig);
        break;
      case 'birthdaysettings':
        await handleBirthdaySettingsCommand(interaction, guildConfig);
        break;
      case 'setbirthday':
        await handleSetBirthdayCommand(interaction, client, guildConfig);
        break;
      case 'config':
        await handleConfigCommand(interaction, guildConfig);
        break;
      case 'setup':
        await handleSetupCommand(interaction, client, guildConfig);
        break;
      case 'welcome':
        await handleWelcomeCommand(interaction, guildConfig);
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
      // Helper to safely check if a feature is enabled (handles boolean or object)
      const isEnabled = (feature) => {
        if (typeof feature === 'boolean') return feature;
        return feature?.enabled ?? false;
      };
      const getSpamLimit = () => typeof autoMod.antiSpam === 'object' ? autoMod.antiSpam.messageLimit : 5;
      const getSpamWindow = () => typeof autoMod.antiSpam === 'object' ? autoMod.antiSpam.timeWindow : 5;

      const statusEmbed = await infoEmbed(interaction.guild.id, '🛡️ AutoMod Status',
        `**Overall:** ${autoMod.enabled ? '✅ Enabled' : '❌ Disabled'}\n\n` +
        `**Features:**\n` +
        `${GLYPHS.DOT} Anti-Spam: ${isEnabled(autoMod.antiSpam) ? '✅' : '❌'} (${getSpamLimit()} msgs/${getSpamWindow()}s)\n` +
        `${GLYPHS.DOT} Anti-Raid: ${isEnabled(autoMod.antiRaid) ? '✅' : '❌'} (${autoMod.antiRaid?.joinThreshold || 10} joins/${autoMod.antiRaid?.timeWindow || 30}s)\n` +
        `${GLYPHS.DOT} Anti-Nuke: ${isEnabled(autoMod.antiNuke) ? '✅' : '❌'}\n` +
        `${GLYPHS.DOT} Anti-Invites: ${isEnabled(autoMod.antiInvites) ? '✅' : '❌'}\n` +
        `${GLYPHS.DOT} Anti-Links: ${isEnabled(autoMod.antiLinks) ? '✅' : '❌'}\n` +
        `${GLYPHS.DOT} Bad Words: ${isEnabled(autoMod.badWords) ? '✅' : '❌'} (${autoMod.badWords?.words?.length || 0} words)\n` +
        `${GLYPHS.DOT} Mass Mention: ${isEnabled(autoMod.antiMassMention) ? '✅' : '❌'} (limit: ${autoMod.antiMassMention?.limit || 5})`
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

      // Ensure antiSpam is an object (fix for legacy boolean values)
      if (!guildConfig.features.autoMod.antiSpam || typeof guildConfig.features.autoMod.antiSpam === 'boolean') {
        guildConfig.features.autoMod.antiSpam = {
          enabled: false,
          messageLimit: 5,
          timeWindow: 5,
          action: 'warn'
        };
      }

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

async function handleRefreshCacheCommand(interaction, client, guildConfig) {
  const { successEmbed, infoEmbed, GLYPHS } = await import('../../utils/embeds.js');
  const Guild = (await import('../../models/Guild.js')).default;

  const cacheType = interaction.options.getString('type') || 'all';
  const guild = interaction.guild;
  const refreshed = [];

  try {
    // Refresh Guild Settings from database
    if (cacheType === 'all' || cacheType === 'guild') {
      // Clear mongoose cache and re-fetch
      const freshGuildConfig = await Guild.findOne({ guildId: guild.id });
      if (freshGuildConfig) {
        // Force update the cached version
        Object.assign(guildConfig, freshGuildConfig.toObject());
      }
      refreshed.push('✅ Guild Settings');
    }

    // Refresh Members cache
    if (cacheType === 'all' || cacheType === 'members') {
      await guild.members.fetch();
      refreshed.push(`✅ Members (${guild.memberCount} cached)`);
    }

    // Refresh Roles cache
    if (cacheType === 'all' || cacheType === 'roles') {
      await guild.roles.fetch();
      refreshed.push(`✅ Roles (${guild.roles.cache.size} cached)`);
    }

    // Refresh Channels cache
    if (cacheType === 'all' || cacheType === 'channels') {
      await guild.channels.fetch();
      refreshed.push(`✅ Channels (${guild.channels.cache.size} cached)`);
    }

    // Refresh Invites cache
    if (cacheType === 'all' || cacheType === 'invites') {
      try {
        const invites = await guild.invites.fetch();
        client.invites.set(guild.id, new Map(invites.map(inv => [inv.code, inv.uses])));
        refreshed.push(`✅ Invites (${invites.size} cached)`);
      } catch (invErr) {
        refreshed.push('⚠️ Invites (no permission)');
      }
    }

    const embed = await successEmbed(interaction.guild.id, '🔄 Cache Refreshed',
      `Successfully refreshed cache for **${guild.name}**\n\n` +
      `**Refreshed:**\n${refreshed.join('\n')}\n\n` +
      `**Refreshed at:** <t:${Math.floor(Date.now() / 1000)}:F>`
    );

    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    console.error('Error refreshing cache:', error);
    const { errorEmbed } = await import('../../utils/embeds.js');
    await interaction.editReply({
      embeds: [await errorEmbed(interaction.guild.id, `Failed to refresh cache: ${error.message}`)]
    });
  }
}

// Birthday Settings Handler
async function handleBirthdaySettingsCommand(interaction, guildConfig) {
  const { successEmbed, errorEmbed, infoEmbed, GLYPHS } = await import('../../utils/embeds.js');
  const subcommand = interaction.options.getSubcommand();

  switch (subcommand) {
    case 'channel': {
      const channel = interaction.options.getChannel('channel');
      guildConfig.features.birthdaySystem.channel = channel.id;
      guildConfig.channels.birthdayChannel = channel.id;
      await guildConfig.save();
      await interaction.editReply({
        embeds: [await successEmbed(interaction.guild.id, '🎂 Birthday Channel Set',
          `${GLYPHS.SUCCESS} Birthday announcements will be sent to ${channel}`)]
      });
      break;
    }

    case 'role': {
      const role = interaction.options.getRole('role');
      guildConfig.features.birthdaySystem.role = role.id;
      await guildConfig.save();
      await interaction.editReply({
        embeds: [await successEmbed(interaction.guild.id, '🎂 Birthday Role Set',
          `${GLYPHS.SUCCESS} Birthday role set to ${role}\n\nThis role will be assigned to users on their birthday.`)]
      });
      break;
    }

    case 'message': {
      const message = interaction.options.getString('message');
      guildConfig.features.birthdaySystem.message = message;
      await guildConfig.save();
      await interaction.editReply({
        embeds: [await successEmbed(interaction.guild.id, '🎂 Birthday Message Set',
          `${GLYPHS.SUCCESS} Custom birthday message set!\n\n**Preview:**\n${message.replace('{user}', interaction.user.toString()).replace('{username}', interaction.user.username).replace('{age}', '25')}`)]
      });
      break;
    }

    case 'enable': {
      guildConfig.features.birthdaySystem.enabled = true;
      await guildConfig.save();
      await interaction.editReply({
        embeds: [await successEmbed(interaction.guild.id, '🎂 Birthday System Enabled',
          `${GLYPHS.SUCCESS} Birthday celebrations are now enabled!`)]
      });
      break;
    }

    case 'disable': {
      guildConfig.features.birthdaySystem.enabled = false;
      await guildConfig.save();
      await interaction.editReply({
        embeds: [await successEmbed(interaction.guild.id, '🎂 Birthday System Disabled',
          `${GLYPHS.SUCCESS} Birthday celebrations are now disabled.`)]
      });
      break;
    }

    case 'status': {
      const bs = guildConfig.features.birthdaySystem;
      const channel = bs.channel ? `<#${bs.channel}>` : 'Not set';
      const role = bs.role ? `<@&${bs.role}>` : 'Not set';
      const message = bs.message || '🎉 Happy Birthday {user}! 🎂';

      await interaction.editReply({
        embeds: [await infoEmbed(interaction.guild.id, '🎂 Birthday Settings',
          `**Status:** ${bs.enabled ? '✅ Enabled' : '❌ Disabled'}\n` +
          `**Channel:** ${channel}\n` +
          `**Role:** ${role}\n` +
          `**Message:** ${message}\n\n` +
          `**Variables:**\n` +
          `• \`{user}\` - Mentions the user\n` +
          `• \`{username}\` - User's name\n` +
          `• \`{age}\` - User's age (if year provided)`)]
      });
      break;
    }
  }
}

// Set Birthday Handler (Admin)
async function handleSetBirthdayCommand(interaction, client, guildConfig) {
  const { successEmbed, errorEmbed, GLYPHS } = await import('../../utils/embeds.js');
  const Birthday = (await import('../../models/Birthday.js')).default;

  const user = interaction.options.getUser('user');
  const month = interaction.options.getInteger('month');
  const day = interaction.options.getInteger('day');
  const year = interaction.options.getInteger('year');
  const isPrivate = interaction.options.getBoolean('private') || false;

  // Validate date
  const testDate = new Date(year || 2000, month - 1, day);
  if (testDate.getMonth() !== month - 1 || testDate.getDate() !== day) {
    return interaction.editReply({
      embeds: [await errorEmbed(interaction.guild.id, 'Invalid Date',
        'This date doesn\'t exist! Please check the month and day.')]
    });
  }

  try {
    // Find or create birthday
    let birthday = await Birthday.findOne({ guildId: interaction.guild.id, userId: user.id });

    if (birthday) {
      birthday.birthday = { month, day, year };
      birthday.username = user.username;
      birthday.showAge = !isPrivate;
    } else {
      birthday = new Birthday({
        guildId: interaction.guild.id,
        userId: user.id,
        username: user.username,
        birthday: { month, day, year },
        showAge: !isPrivate
      });
    }

    await birthday.save();

    // Assign birthday role if configured
    const birthdayRole = guildConfig.features.birthdaySystem.role;
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    
    if (birthdayRole && member) {
      const role = interaction.guild.roles.cache.get(birthdayRole);
      if (role && !member.roles.cache.has(birthdayRole)) {
        await member.roles.add(role, 'Birthday set by admin').catch(() => {});
      }
    }

    // Send announcement in birthday channel
    const birthdayChannel = guildConfig.features.birthdaySystem.channel || guildConfig.channels.birthdayChannel;
    if (birthdayChannel) {
      const channel = interaction.guild.channels.cache.get(birthdayChannel);
      if (channel) {
        const dateStr = `${month}/${day}${year ? `/${year}` : ''}`;
        const announceEmbed = await successEmbed(interaction.guild.id, '🎂 Birthday Registered!',
          `**${user}**'s birthday has been set to **${dateStr}**!\n\n` +
          `They will receive a special celebration on their birthday! 🎉`
        );
        await channel.send({ embeds: [announceEmbed] }).catch(() => {});
      }
    }

    // Success message
    const dateStr = `${month}/${day}${year ? `/${year}` : ''}`;
    let description = `${GLYPHS.SUCCESS} Birthday for **${user.tag}** set to **${dateStr}**!`;
    
    if (isPrivate) {
      description += '\n🔒 Age will not be shown in announcements';
    }
    
    if (year) {
      const age = birthday.getAge ? birthday.getAge() : null;
      if (age !== null) {
        description += `\n🎂 They'll turn ${age + 1} on their next birthday!`;
      }
    }

    if (birthdayRole) {
      description += `\n🎀 Birthday role assigned`;
    }

    if (birthdayChannel) {
      description += `\n📢 Announcement sent to <#${birthdayChannel}>`;
    }

    await interaction.editReply({
      embeds: [await successEmbed(interaction.guild.id, '🎂 Birthday Set!', description)]
    });

  } catch (error) {
    console.error('Error setting birthday:', error);
    await interaction.editReply({
      embeds: [await errorEmbed(interaction.guild.id, 'Error',
        'Failed to set birthday. Please try again.')]
    });
  }
}

// Config Handler
async function handleConfigCommand(interaction, guildConfig) {
  const { successEmbed, errorEmbed, infoEmbed, GLYPHS } = await import('../../utils/embeds.js');
  const subcommand = interaction.options.getSubcommand();

  switch (subcommand) {
    case 'view': {
      const config = guildConfig;
      const embed = await infoEmbed(interaction.guild.id, '⚙️ Server Configuration',
        `**Prefix:** \`${config.prefix}\`\n\n` +
        `**Channels:**\n` +
        `• Mod Log: ${config.channels.modLog ? `<#${config.channels.modLog}>` : 'Not set'}\n` +
        `• Alert Log: ${config.channels.alertLog ? `<#${config.channels.alertLog}>` : 'Not set'}\n` +
        `• Join Log: ${config.channels.joinLog ? `<#${config.channels.joinLog}>` : 'Not set'}\n` +
        `• Birthday: ${config.channels.birthdayChannel ? `<#${config.channels.birthdayChannel}>` : 'Not set'}\n` +
        `• Welcome: ${config.channels.welcomeChannel ? `<#${config.channels.welcomeChannel}>` : 'Not set'}\n\n` +
        `**Features:**\n` +
        `• AutoMod: ${config.features.autoMod?.enabled ? '✅' : '❌'}\n` +
        `• Birthdays: ${config.features.birthdaySystem?.enabled ? '✅' : '❌'}\n` +
        `• Levels: ${config.features.levelSystem?.enabled ? '✅' : '❌'}\n` +
        `• Welcome: ${config.features.welcomeSystem?.enabled ? '✅' : '❌'}`
      );
      await interaction.editReply({ embeds: [embed] });
      break;
    }

    case 'prefix': {
      const newPrefix = interaction.options.getString('prefix');
      if (newPrefix.length > 5) {
        return interaction.editReply({
          embeds: [await errorEmbed(interaction.guild.id, 'Prefix too long (max 5 characters)')]
        });
      }
      guildConfig.prefix = newPrefix;
      await guildConfig.save();
      await interaction.editReply({
        embeds: [await successEmbed(interaction.guild.id, 'Prefix Updated',
          `${GLYPHS.SUCCESS} Server prefix changed to \`${newPrefix}\``)]
      });
      break;
    }
  }
}

// Setup Handler
async function handleSetupCommand(interaction, client, guildConfig) {
  const { successEmbed, errorEmbed, infoEmbed, GLYPHS } = await import('../../utils/embeds.js');
  const { ChannelType } = await import('discord.js');
  
  // Import the setup command and run it
  try {
    const setupModule = await import('../../commands/config/setup.js');
    const setupCommand = setupModule.default;
    
    // Create a fake message object for the setup command
    const fakeMessage = {
      guild: interaction.guild,
      member: interaction.member,
      author: interaction.user,
      reply: async (options) => interaction.editReply(options),
      channel: interaction.channel
    };

    await setupCommand.execute(fakeMessage);
  } catch (error) {
    console.error('Setup command error:', error);
    await interaction.editReply({
      embeds: [await errorEmbed(interaction.guild.id, 'Setup Failed',
        'An error occurred during setup. Please ensure I have Administrator permissions.')]
    });
  }
}

// Welcome Handler
async function handleWelcomeCommand(interaction, guildConfig) {
  const { successEmbed, errorEmbed, infoEmbed, GLYPHS } = await import('../../utils/embeds.js');
  const subcommand = interaction.options.getSubcommand();

  switch (subcommand) {
    case 'channel': {
      const channel = interaction.options.getChannel('channel');
      guildConfig.features.welcomeSystem.channel = channel.id;
      guildConfig.channels.welcomeChannel = channel.id;
      await guildConfig.save();
      await interaction.editReply({
        embeds: [await successEmbed(interaction.guild.id, '👋 Welcome Channel Set',
          `${GLYPHS.SUCCESS} Welcome messages will be sent to ${channel}`)]
      });
      break;
    }

    case 'message': {
      const message = interaction.options.getString('message');
      guildConfig.features.welcomeSystem.message = message;
      await guildConfig.save();
      await interaction.editReply({
        embeds: [await successEmbed(interaction.guild.id, '👋 Welcome Message Set',
          `${GLYPHS.SUCCESS} Welcome message updated!\n\n**Preview:**\n${message.replace('{user}', interaction.user.toString()).replace('{server}', interaction.guild.name).replace('{memberCount}', interaction.guild.memberCount)}`)]
      });
      break;
    }

    case 'enable': {
      guildConfig.features.welcomeSystem.enabled = true;
      await guildConfig.save();
      await interaction.editReply({
        embeds: [await successEmbed(interaction.guild.id, '👋 Welcome System Enabled',
          `${GLYPHS.SUCCESS} Welcome messages are now enabled!`)]
      });
      break;
    }

    case 'disable': {
      guildConfig.features.welcomeSystem.enabled = false;
      await guildConfig.save();
      await interaction.editReply({
        embeds: [await successEmbed(interaction.guild.id, '👋 Welcome System Disabled',
          `${GLYPHS.SUCCESS} Welcome messages are now disabled.`)]
      });
      break;
    }

    case 'status': {
      const ws = guildConfig.features.welcomeSystem;
      const channel = ws?.channel ? `<#${ws.channel}>` : 'Not set';
      const message = ws?.message || 'Welcome {user} to {server}! You are member #{memberCount}';

      await interaction.editReply({
        embeds: [await infoEmbed(interaction.guild.id, '👋 Welcome Settings',
          `**Status:** ${ws?.enabled ? '✅ Enabled' : '❌ Disabled'}\n` +
          `**Channel:** ${channel}\n` +
          `**Message:** ${message}\n\n` +
          `**Variables:**\n` +
          `• \`{user}\` - Mentions the user\n` +
          `• \`{server}\` - Server name\n` +
          `• \`{memberCount}\` - Member count`)]
      });
      break;
    }
  }
}
