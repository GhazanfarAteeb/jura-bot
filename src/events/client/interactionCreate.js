import { Events, Collection, PermissionFlagsBits, MessageFlags } from 'discord.js';
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
        flags: MessageFlags.Ephemeral
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
    const specialCommands = ['automod', 'lockdown', 'setrole', 'setchannel', 'slashcommands', 'refreshcache', 'birthdaysettings', 'setbirthday', 'config', 'setup', 'welcome', 'manageshop', 'verify', 'cmdchannels', 'logs', 'autorole', 'feature', 'giveaway'];
    if (specialCommands.includes(interaction.commandName)) {
      return handleSpecialCommand(interaction, client, guildConfig, hasAdminRole);
    }

    const command = client.commands.get(interaction.commandName);

    if (!command) {
      console.error(`No command matching ${interaction.commandName} was found.`);
      await interaction.reply({
        content: `Command \`/${interaction.commandName}\` not found! The command may not be implemented yet.`,
        flags: MessageFlags.Ephemeral
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
              content: `⏰ **Cooldown Active**\n\n⏱️ Please wait **${timeString}** before using \`${command.name}\` again.\n\nAvailable <t:${Math.floor(expirationTime / 1000)}:R>`
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
        await interaction.followUp({ content: errorMessage, flags: MessageFlags.Ephemeral });
      } else {
        await interaction.reply({ content: errorMessage, flags: MessageFlags.Ephemeral });
      }
    }
  },
};

// Handle special slash commands that need custom implementations
async function handleSpecialCommand(interaction, client, guildConfig, hasAdminRole) {
  const { successEmbed, errorEmbed, infoEmbed, GLYPHS } = await import('../../utils/embeds.js');

  // Check admin permission for other commands
  if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator) && !hasAdminRole) {
    return interaction.reply({
      content: '❌ You need Administrator permissions to use this command.',
      flags: MessageFlags.Ephemeral
    });
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

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
      case 'manageshop':
        await handleManageshopCommand(interaction, guildConfig);
        break;
      case 'verify':
        await handleVerifyCommand(interaction, client, guildConfig);
        break;
      case 'cmdchannels':
        await handleCmdchannelsCommand(interaction, guildConfig);
        break;
      case 'logs':
        await handleLogsCommand(interaction, guildConfig);
        break;
      case 'autorole':
        await handleAutoroleCommand(interaction, guildConfig);
        break;
      case 'feature':
        await handleFeatureCommand(interaction, client, guildConfig);
        break;
      case 'giveaway':
        await handleGiveawayCommand(interaction, client, guildConfig);
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
      await Guild.updateGuild(interaction.guild.id, { $set: { 'features.autoMod.enabled': true } });
      await interaction.editReply({
        embeds: [await successEmbed(interaction.guild.id, 'AutoMod Enabled',
          `${GLYPHS.SUCCESS} AutoMod has been enabled for this server.`)]
      });
      break;

    case 'disable':
      await Guild.updateGuild(interaction.guild.id, { $set: { 'features.autoMod.enabled': false } });
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
      const antiSpamConfig = (!guildConfig.features.autoMod.antiSpam || typeof guildConfig.features.autoMod.antiSpam === 'boolean')
        ? { enabled: false, messageLimit: 5, timeWindow: 5, action: 'warn' }
        : { ...guildConfig.features.autoMod.antiSpam };

      antiSpamConfig.enabled = spamEnabled;
      if (messageLimit) antiSpamConfig.messageLimit = messageLimit;
      if (timeWindow) antiSpamConfig.timeWindow = timeWindow;
      await Guild.updateGuild(interaction.guild.id, { $set: { 'features.autoMod.antiSpam': antiSpamConfig } });

      await interaction.editReply({
        embeds: [await successEmbed(interaction.guild.id, 'Anti-Spam Updated',
          `${GLYPHS.SUCCESS} Anti-Spam is now ${spamEnabled ? 'enabled' : 'disabled'}.\n` +
          `${GLYPHS.DOT} Message Limit: ${antiSpamConfig.messageLimit}\n` +
          `${GLYPHS.DOT} Time Window: ${antiSpamConfig.timeWindow}s`)]
      });
      break;

    case 'antiraid':
      const raidEnabled = interaction.options.getBoolean('enabled');
      const joinThreshold = interaction.options.getInteger('join_threshold');
      const raidAction = interaction.options.getString('action');

      // Ensure antiRaid is an object (fix for legacy boolean values)
      const antiRaidConfig = (!guildConfig.features.autoMod.antiRaid || typeof guildConfig.features.autoMod.antiRaid === 'boolean')
        ? { enabled: false, joinThreshold: 10, timeWindow: 30, action: 'lockdown' }
        : { ...guildConfig.features.autoMod.antiRaid };

      antiRaidConfig.enabled = raidEnabled;
      if (joinThreshold) antiRaidConfig.joinThreshold = joinThreshold;
      if (raidAction) antiRaidConfig.action = raidAction;
      await Guild.updateGuild(interaction.guild.id, { $set: { 'features.autoMod.antiRaid': antiRaidConfig } });

      await interaction.editReply({
        embeds: [await successEmbed(interaction.guild.id, 'Anti-Raid Updated',
          `${GLYPHS.SUCCESS} Anti-Raid is now ${raidEnabled ? 'enabled' : 'disabled'}.\n` +
          `${GLYPHS.DOT} Join Threshold: ${antiRaidConfig.joinThreshold}\n` +
          `${GLYPHS.DOT} Action: ${antiRaidConfig.action}`)]
      });
      break;

    case 'antinuke':
      const nukeEnabled = interaction.options.getBoolean('enabled');
      const nukeAction = interaction.options.getString('action');

      // Ensure antiNuke is an object (fix for legacy boolean values)
      // Ensure antiNuke is an object (fix for legacy boolean values)
      const antiNukeConfig = (!guildConfig.features.autoMod.antiNuke || typeof guildConfig.features.autoMod.antiNuke === 'boolean')
        ? { enabled: false, banThreshold: 5, kickThreshold: 5, roleDeleteThreshold: 3, channelDeleteThreshold: 3, timeWindow: 60, action: 'removeRoles', whitelistedUsers: [] }
        : { ...guildConfig.features.autoMod.antiNuke };

      antiNukeConfig.enabled = nukeEnabled;
      if (nukeAction) antiNukeConfig.action = nukeAction;
      await Guild.updateGuild(interaction.guild.id, { $set: { 'features.autoMod.antiNuke': antiNukeConfig } });

      await interaction.editReply({
        embeds: [await successEmbed(interaction.guild.id, 'Anti-Nuke Updated',
          `${GLYPHS.SUCCESS} Anti-Nuke is now ${nukeEnabled ? 'enabled' : 'disabled'}.\n` +
          `${GLYPHS.DOT} Action: ${antiNukeConfig.action}`)]
      });
      break;
  }
}

async function handleBadwordsSubcommand(interaction, guildConfig) {
  const { successEmbed, errorEmbed, infoEmbed, GLYPHS } = await import('../../utils/embeds.js');
  const action = interaction.options.getString('action');
  const words = interaction.options.getString('words');
  const punishment = interaction.options.getString('punishment');

  // Get current badWords config or initialize
  const badWordsConfig = guildConfig.features.autoMod.badWords || { enabled: false, words: [], action: 'delete' };

  switch (action) {
    case 'add':
      if (!words) {
        return interaction.editReply({
          embeds: [await errorEmbed(interaction.guild.id, 'Missing Words',
            'Please provide words to add (comma separated).')]
        });
      }
      const newWords = words.split(',').map(w => w.trim().toLowerCase()).filter(w => w);
      const existingWords = badWordsConfig.words || [];
      const updatedWords = [...new Set([...existingWords, ...newWords])];
      await Guild.updateGuild(interaction.guild.id, { $set: { 'features.autoMod.badWords.words': updatedWords } });

      await interaction.editReply({
        embeds: [await successEmbed(interaction.guild.id, 'Words Added',
          `${GLYPHS.SUCCESS} Added ${newWords.length} word(s) to the filter.\n` +
          `Total words: ${updatedWords.length}`)]
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
      const filteredWords = (badWordsConfig.words || [])
        .filter(w => !removeWords.includes(w));
      await Guild.updateGuild(interaction.guild.id, { $set: { 'features.autoMod.badWords.words': filteredWords } });

      await interaction.editReply({
        embeds: [await successEmbed(interaction.guild.id, 'Words Removed',
          `${GLYPHS.SUCCESS} Removed words from the filter.\n` +
          `Total words: ${filteredWords.length}`)]
      });
      break;

    case 'list':
      const wordList = badWordsConfig.words || [];
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
          `**Current Action:** ${badWordsConfig.action}`)]
      });
      break;

    case 'setaction':
      if (!punishment) {
        return interaction.editReply({
          embeds: [await errorEmbed(interaction.guild.id, 'Missing Punishment',
            'Please select a punishment action.')]
        });
      }
      await Guild.updateGuild(interaction.guild.id, { $set: { 'features.autoMod.badWords.action': punishment } });

      await interaction.editReply({
        embeds: [await successEmbed(interaction.guild.id, 'Action Updated',
          `${GLYPHS.SUCCESS} Bad words action set to: **${punishment}**`)]
      });
      break;

    case 'enable':
      await Guild.updateGuild(interaction.guild.id, { $set: { 'features.autoMod.badWords.enabled': true } });
      await interaction.editReply({
        embeds: [await successEmbed(interaction.guild.id, 'Bad Words Filter Enabled',
          `${GLYPHS.SUCCESS} Bad words filter is now enabled.`)]
      });
      break;

    case 'disable':
      await Guild.updateGuild(interaction.guild.id, { $set: { 'features.autoMod.badWords.enabled': false } });
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
    await Guild.updateGuild(interaction.guild.id, {
      $set: {
        'security.lockdownActive': true,
        'security.lockdownReason': reason,
        'security.lockdownBy': interaction.user.id,
        'security.lockdownAt': new Date()
      }
    });

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
    await Guild.updateGuild(interaction.guild.id, {
      $set: { 'security.lockdownActive': false }
    });

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

  let updateData = {};

  switch (type) {
    case 'staff':
      const staffRoles = guildConfig.roles?.staffRoles || [];
      const moderatorRoles = guildConfig.roles?.moderatorRoles || [];
      if (!staffRoles.includes(role.id)) staffRoles.push(role.id);
      if (!moderatorRoles.includes(role.id)) moderatorRoles.push(role.id);
      updateData = {
        'roles.staffRoles': staffRoles,
        'roles.moderatorRoles': moderatorRoles
      };
      break;
    case 'admin':
      const adminRoles = guildConfig.roles?.adminRoles || [];
      if (!adminRoles.includes(role.id)) adminRoles.push(role.id);
      updateData = { 'roles.adminRoles': adminRoles };
      break;
    case 'sus':
      updateData = {
        'roles.susRole': role.id,
        'features.memberTracking.susRole': role.id
      };
      break;
    case 'newaccount':
      updateData = { 'roles.newAccountRole': role.id };
      break;
    case 'muted':
      updateData = { 'roles.mutedRole': role.id };
      break;
  }

  await Guild.updateGuild(interaction.guild.id, { $set: updateData });

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

  const channelMap = {
    'modlog': 'channels.modLog',
    'alertlog': 'channels.alertLog',
    'joinlog': 'channels.joinLog',
    'leavelog': 'channels.leaveLog',
    'messagelog': 'channels.messageLog',
    'staff': 'channels.staffChannel'
  };

  const updateKey = channelMap[type];
  if (updateKey) {
    await Guild.updateGuild(interaction.guild.id, { $set: { [updateKey]: channel.id } });
  }

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

  // Get current slashCommands config or initialize
  const slashCommandsConfig = guildConfig.slashCommands || { enabled: true, disabledCommands: [] };

  switch (subcommand) {
    case 'enable':
      const enableCmd = interaction.options.getString('command').toLowerCase();
      const enabledList = (slashCommandsConfig.disabledCommands || []).filter(c => c !== enableCmd);
      await Guild.updateGuild(interaction.guild.id, { $set: { 'slashCommands.disabledCommands': enabledList } });

      await interaction.editReply({
        embeds: [await successEmbed(interaction.guild.id, 'Command Enabled',
          `${GLYPHS.SUCCESS} Slash command \`/${enableCmd}\` is now enabled.`)]
      });
      break;

    case 'disable':
      const disableCmd = interaction.options.getString('command').toLowerCase();
      const disabledList = slashCommandsConfig.disabledCommands || [];
      if (!disabledList.includes(disableCmd)) {
        disabledList.push(disableCmd);
      }
      await Guild.updateGuild(interaction.guild.id, { $set: { 'slashCommands.disabledCommands': disabledList } });

      await interaction.editReply({
        embeds: [await successEmbed(interaction.guild.id, 'Command Disabled',
          `${GLYPHS.SUCCESS} Slash command \`/${disableCmd}\` is now disabled.`)]
      });
      break;

    case 'list':
      const { getSlashCommands } = await import('../../utils/slashCommands.js');
      const allCommands = getSlashCommands();
      const disabled = slashCommandsConfig.disabledCommands || [];

      const commandList = allCommands.map(cmd => {
        const name = cmd.name;
        const isDisabled = disabled.includes(name);
        return `${isDisabled ? '❌' : '✅'} \`/${name}\``;
      }).join('\n');

      await interaction.editReply({
        embeds: [await infoEmbed(interaction.guild.id, 'Slash Commands',
          `**Status:** ${slashCommandsConfig.enabled ? 'Enabled' : 'Disabled'}\n\n` +
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
      await Guild.updateGuild(interaction.guild.id, {
        $set: {
          'features.birthdaySystem.channel': channel.id,
          'channels.birthdayChannel': channel.id
        }
      });
      await interaction.editReply({
        embeds: [await successEmbed(interaction.guild.id, '🎂 Birthday Channel Set',
          `${GLYPHS.SUCCESS} Birthday announcements will be sent to ${channel}`)]
      });
      break;
    }

    case 'role': {
      const role = interaction.options.getRole('role');
      await Guild.updateGuild(interaction.guild.id, { $set: { 'features.birthdaySystem.role': role.id } });
      await interaction.editReply({
        embeds: [await successEmbed(interaction.guild.id, '🎂 Birthday Role Set',
          `${GLYPHS.SUCCESS} Birthday role set to ${role}\n\nThis role will be assigned to users on their birthday.`)]
      });
      break;
    }

    case 'message': {
      const message = interaction.options.getString('message');
      await Guild.updateGuild(interaction.guild.id, { $set: { 'features.birthdaySystem.message': message } });
      await interaction.editReply({
        embeds: [await successEmbed(interaction.guild.id, '🎂 Birthday Message Set',
          `${GLYPHS.SUCCESS} Custom birthday message set!\n\n**Preview:**\n${message.replace('{user}', interaction.user.toString()).replace('{username}', interaction.user.username).replace('{age}', '25')}`)]
      });
      break;
    }

    case 'enable': {
      await Guild.updateGuild(interaction.guild.id, { $set: { 'features.birthdaySystem.enabled': true } });
      await interaction.editReply({
        embeds: [await successEmbed(interaction.guild.id, '🎂 Birthday System Enabled',
          `${GLYPHS.SUCCESS} Birthday celebrations are now enabled!`)]
      });
      break;
    }

    case 'disable': {
      await Guild.updateGuild(interaction.guild.id, { $set: { 'features.birthdaySystem.enabled': false } });
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
        await member.roles.add(role, 'Birthday set by admin').catch(() => { });
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
        await channel.send({ embeds: [announceEmbed] }).catch(() => { });
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
      await Guild.updateGuild(interaction.guild.id, { $set: { prefix: newPrefix } });
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
      await Guild.updateGuild(interaction.guild.id, {
        $set: {
          'features.welcomeSystem.channel': channel.id,
          'channels.welcomeChannel': channel.id
        }
      });
      await interaction.editReply({
        embeds: [await successEmbed(interaction.guild.id, '👋 Welcome Channel Set',
          `${GLYPHS.SUCCESS} Welcome messages will be sent to ${channel}`)]
      });
      break;
    }

    case 'message': {
      const message = interaction.options.getString('message');
      await Guild.updateGuild(interaction.guild.id, { $set: { 'features.welcomeSystem.message': message } });
      await interaction.editReply({
        embeds: [await successEmbed(interaction.guild.id, '👋 Welcome Message Set',
          `${GLYPHS.SUCCESS} Welcome message updated!\n\n**Preview:**\n${message.replace('{user}', interaction.user.toString()).replace('{server}', interaction.guild.name).replace('{memberCount}', interaction.guild.memberCount)}`)]
      });
      break;
    }

    case 'enable': {
      await Guild.updateGuild(interaction.guild.id, { $set: { 'features.welcomeSystem.enabled': true } });
      await interaction.editReply({
        embeds: [await successEmbed(interaction.guild.id, '👋 Welcome System Enabled',
          `${GLYPHS.SUCCESS} Welcome messages are now enabled!`)]
      });
      break;
    }

    case 'disable': {
      await Guild.updateGuild(interaction.guild.id, { $set: { 'features.welcomeSystem.enabled': false } });
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

// Handle manageshop slash command (Backgrounds only)
async function handleManageshopCommand(interaction, guildConfig) {
  const { successEmbed, errorEmbed, infoEmbed, GLYPHS } = await import('../../utils/embeds.js');
  const { formatNumber } = await import('../../utils/helpers.js');
  const { EmbedBuilder } = await import('discord.js');

  const subcommand = interaction.options.getSubcommand();
  const coinEmoji = guildConfig.economy?.coinEmoji || '💰';

  // Initialize if not exists
  if (!guildConfig.customShopItems) {
    guildConfig.customShopItems = [];
  }

  switch (subcommand) {
    case 'add': {
      const itemName = interaction.options.getString('name');
      const price = interaction.options.getInteger('price');
      const image = interaction.options.getString('image');
      const description = interaction.options.getString('description');

      // Generate unique ID
      const itemId = `custom_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 4)}`;

      const newItem = {
        id: itemId,
        name: itemName,
        description: description || 'A custom background',
        price: price,
        type: 'background',
        image: image,
        stock: -1,
        createdBy: interaction.user.id,
        createdAt: new Date()
      };

      await Guild.updateGuild(interaction.guild.id, { $push: { customShopItems: newItem } });

      const embed = new EmbedBuilder()
        .setColor('#667eea')
        .setTitle('✅ Background Added to Shop')
        .addFields(
          { name: '🖼️ Name', value: itemName, inline: true },
          { name: '💰 Price', value: `${formatNumber(price)} ${coinEmoji}`, inline: true },
          { name: '🆔 ID', value: `\`${itemId}\``, inline: true }
        )
        .setImage(image)
        .setFooter({ text: 'Background preview shown above' });

      await interaction.editReply({ embeds: [embed] });
      break;
    }

    case 'remove': {
      const itemId = interaction.options.getString('id');

      const index = guildConfig.customShopItems.findIndex(item => item.id === itemId);
      if (index === -1) {
        await interaction.editReply({
          embeds: [await errorEmbed(interaction.guild.id, 'Item Not Found',
            `${GLYPHS.ERROR} No item found with ID: \`${itemId}\``)]
        });
        return;
      }

      const removedItem = guildConfig.customShopItems[index];
      await Guild.updateGuild(interaction.guild.id, { $pull: { customShopItems: { id: itemId } } });

      await interaction.editReply({
        embeds: [await successEmbed(interaction.guild.id, 'Item Removed',
          `${GLYPHS.SUCCESS} Removed **${removedItem.name}** from the shop.`)]
      });
      break;
    }

    case 'list': {
      if (guildConfig.customShopItems.length === 0) {
        await interaction.editReply({
          embeds: [await infoEmbed(interaction.guild.id, 'No Backgrounds',
            `${GLYPHS.INFO} No custom backgrounds in the shop yet.\n\nUse \`/manageshop add\` to add backgrounds!`)]
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle('🖼️ Shop Backgrounds')
        .setColor(guildConfig.embedStyle?.color || '#667eea')
        .setFooter({ text: `Total: ${guildConfig.customShopItems.length} backgrounds` });

      guildConfig.customShopItems.slice(0, 10).forEach(item => {
        const stockText = item.stock === -1 ? '∞' : item.stock;
        embed.addFields({
          name: `🖼️ ${item.name}`,
          value: `**ID:** \`${item.id}\`\n**Price:** ${formatNumber(item.price)} ${coinEmoji}\n**Stock:** ${stockText}${item.image ? `\n**Image:** [Preview](${item.image})` : ''}`,
          inline: false
        });
      });

      if (guildConfig.customShopItems.length > 10) {
        embed.setDescription(`Showing 10 of ${guildConfig.customShopItems.length} backgrounds`);
      }

      await interaction.editReply({ embeds: [embed] });
      break;
    }

    case 'setprice': {
      const itemId = interaction.options.getString('id');
      const newPrice = interaction.options.getInteger('price');

      const item = guildConfig.customShopItems.find(i => i.id === itemId);
      if (!item) {
        await interaction.editReply({
          embeds: [await errorEmbed(interaction.guild.id, 'Item Not Found',
            `${GLYPHS.ERROR} No item found with ID: \`${itemId}\``)]
        });
        return;
      }

      const oldPrice = item.price;
      await Guild.updateGuild(interaction.guild.id, {
        $set: { 'customShopItems.$[elem].price': newPrice }
      }, { arrayFilters: [{ 'elem.id': itemId }] });

      await interaction.editReply({
        embeds: [await successEmbed(interaction.guild.id, 'Price Updated',
          `${GLYPHS.SUCCESS} Updated **${item.name}** price:\n\n` +
          `**Old Price:** ${formatNumber(oldPrice)} ${coinEmoji}\n` +
          `**New Price:** ${formatNumber(newPrice)} ${coinEmoji}`)]
      });
      break;
    }

    case 'edit': {
      const itemId = interaction.options.getString('id');
      const field = interaction.options.getString('field');
      const value = interaction.options.getString('value');

      const item = guildConfig.customShopItems.find(i => i.id === itemId);
      if (!item) {
        await interaction.editReply({
          embeds: [await errorEmbed(interaction.guild.id, 'Item Not Found',
            `${GLYPHS.ERROR} No item found with ID: \`${itemId}\``)]
        });
        return;
      }

      switch (field) {
        case 'name':
          item.name = value;
          break;
        case 'description':
          item.description = value;
          break;
        case 'image':
          item.image = value;
          break;
      }

      await Guild.updateGuild(interaction.guild.id, {
        $set: { [`customShopItems.$[elem].${field}`]: value }
      }, { arrayFilters: [{ 'elem.id': itemId }] });

      await interaction.editReply({
        embeds: [await successEmbed(interaction.guild.id, 'Background Updated',
          `${GLYPHS.SUCCESS} Updated **${item.name}**'s ${field} to: **${value}**`)]
      });
      break;
    }

    case 'stock': {
      const itemId = interaction.options.getString('id');
      const stock = interaction.options.getInteger('amount');

      const item = guildConfig.customShopItems.find(i => i.id === itemId);
      if (!item) {
        await interaction.editReply({
          embeds: [await errorEmbed(interaction.guild.id, 'Item Not Found',
            `${GLYPHS.ERROR} No item found with ID: \`${itemId}\``)]
        });
        return;
      }

      await Guild.updateGuild(interaction.guild.id, {
        $set: { 'customShopItems.$[elem].stock': stock }
      }, { arrayFilters: [{ 'elem.id': itemId }] });

      const stockText = stock === -1 ? 'Unlimited' : stock.toString();
      await interaction.editReply({
        embeds: [await successEmbed(interaction.guild.id, 'Stock Updated',
          `${GLYPHS.SUCCESS} **${item.name}** stock set to: **${stockText}**`)]
      });
      break;
    }

    case 'fallback': {
      const type = interaction.options.getString('type');
      const value = interaction.options.getString('value');

      // Initialize economy if not exists
      if (!guildConfig.economy) {
        guildConfig.economy = {};
      }
      if (!guildConfig.economy.fallbackBackground) {
        guildConfig.economy.fallbackBackground = { image: '', color: '#2C2F33' };
      }

      if (type === 'url') {
        if (!value) {
          await interaction.editReply({
            embeds: [await errorEmbed(interaction.guild.id, 'Missing URL',
              `${GLYPHS.ERROR} Please provide an image URL.`)]
          });
          return;
        }

        if (!value.startsWith('http://') && !value.startsWith('https://')) {
          await interaction.editReply({
            embeds: [await errorEmbed(interaction.guild.id, 'Invalid URL',
              `${GLYPHS.ERROR} Please provide a valid image URL starting with http:// or https://`)]
          });
          return;
        }

        await Guild.updateGuild(interaction.guild.id, { $set: { 'economy.fallbackBackground.image': value } });

        const embed = new EmbedBuilder()
          .setColor('#00FF00')
          .setTitle('✅ Fallback Background Updated')
          .setDescription(`${GLYPHS.SUCCESS} Default background image set!`)
          .setImage(value);
        await interaction.editReply({ embeds: [embed] });

      } else if (type === 'color') {
        if (!value) {
          await interaction.editReply({
            embeds: [await errorEmbed(interaction.guild.id, 'Missing Color',
              `${GLYPHS.ERROR} Please provide a hex color (e.g., #FF0000).`)]
          });
          return;
        }

        if (!/^#[0-9A-F]{6}$/i.test(value)) {
          await interaction.editReply({
            embeds: [await errorEmbed(interaction.guild.id, 'Invalid Color',
              `${GLYPHS.ERROR} Please provide a valid hex color (e.g., #FF0000)`)]
          });
          return;
        }

        await Guild.updateGuild(interaction.guild.id, { $set: { 'economy.fallbackBackground.color': value } });

        const embed = new EmbedBuilder()
          .setColor(value)
          .setTitle('✅ Fallback Color Updated')
          .setDescription(`${GLYPHS.SUCCESS} Default background color set to: **${value}**`);
        await interaction.editReply({ embeds: [embed] });

      } else if (type === 'clear') {
        await Guild.updateGuild(interaction.guild.id, {
          $set: { 'economy.fallbackBackground': { image: '', color: '#2C2F33' } }
        });

        await interaction.editReply({
          embeds: [await successEmbed(interaction.guild.id, 'Fallback Reset',
            `${GLYPHS.SUCCESS} Default background reset to default dark theme.`)]
        });
      }
      break;
    }
  }
}
// Handle verify command
async function handleVerifyCommand(interaction, client, guildConfig) {
  const { successEmbed, errorEmbed, infoEmbed, GLYPHS } = await import('../../utils/embeds.js');
  const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = await import('discord.js');
  const subcommand = interaction.options.getSubcommand();

  switch (subcommand) {
    case 'setup': {
      const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('🔐 Verification Setup')
        .setDescription('To complete setup via slash command, use these subcommands:\n\n' +
          '`/verify setrole @role` - Set the verified role\n' +
          '`/verify setchannel #channel` - Set the verification channel\n' +
          '`/verify enable` - Enable the system\n' +
          '`/verify panel` - Send the verification panel');
      await interaction.editReply({ embeds: [embed] });
      break;
    }

    case 'panel': {
      const channel = interaction.options.getChannel('channel') || interaction.channel;

      if (!guildConfig.features?.verificationSystem?.role) {
        await interaction.editReply({
          embeds: [await errorEmbed(interaction.guild.id, 'Setup Required',
            `${GLYPHS.ERROR} Please set a verified role first with \`/verify setrole @role\``)]
        });
        return;
      }

      const verificationType = guildConfig.features?.verificationSystem?.type || 'button';

      const panelEmbed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('🔐 Server Verification')
        .setDescription(
          verificationType === 'captcha'
            ? 'Click the button below to start captcha verification and gain access to the server!'
            : 'Click the button below to verify yourself and gain access to the server!'
        )
        .setFooter({ text: 'This helps us prevent bots and raiders.' });

      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(verificationType === 'captcha' ? 'verify_captcha' : 'verify_button')
            .setLabel(verificationType === 'captcha' ? '🔐 Verify (Captcha)' : '✅ Verify')
            .setStyle(ButtonStyle.Success)
        );

      await channel.send({ embeds: [panelEmbed], components: [row] });
      await interaction.editReply({
        embeds: [await successEmbed(interaction.guild.id, 'Verification Panel Sent',
          `${GLYPHS.SUCCESS} Verification panel has been sent to ${channel}`)]
      });
      break;
    }

    case 'manual': {
      const user = interaction.options.getUser('user');
      const member = await interaction.guild.members.fetch(user.id).catch(() => null);

      if (!member) {
        await interaction.editReply({
          embeds: [await errorEmbed(interaction.guild.id, 'User Not Found',
            `${GLYPHS.ERROR} Could not find that user in this server.`)]
        });
        return;
      }

      const verifiedRoleId = guildConfig.features?.verificationSystem?.role || guildConfig.roles?.verifiedRole;
      if (!verifiedRoleId) {
        await interaction.editReply({
          embeds: [await errorEmbed(interaction.guild.id, 'No Verified Role',
            `${GLYPHS.ERROR} No verified role is configured. Use \`/verify setrole @role\``)]
        });
        return;
      }

      await member.roles.add(verifiedRoleId);
      await interaction.editReply({
        embeds: [await successEmbed(interaction.guild.id, 'User Verified',
          `${GLYPHS.SUCCESS} ${user} has been manually verified.`)]
      });
      break;
    }

    case 'status': {
      const vs = guildConfig.features?.verificationSystem || {};
      const statusEmbed = await infoEmbed(interaction.guild.id, '🔐 Verification Status',
        `**Enabled:** ${vs.enabled ? '✅ Yes' : '❌ No'}\n` +
        `**Type:** ${vs.type || 'button'}\n` +
        `**Role:** ${vs.role ? `<@&${vs.role}>` : 'Not set'}\n` +
        `**Channel:** ${vs.channel ? `<#${vs.channel}>` : 'Not set'}`);
      await interaction.editReply({ embeds: [statusEmbed] });
      break;
    }

    case 'enable': {
      await Guild.updateGuild(interaction.guild.id, { $set: { 'features.verificationSystem.enabled': true } });
      await interaction.editReply({
        embeds: [await successEmbed(interaction.guild.id, 'Verification Enabled',
          `${GLYPHS.SUCCESS} The verification system is now enabled.`)]
      });
      break;
    }

    case 'disable': {
      await Guild.updateGuild(interaction.guild.id, { $set: { 'features.verificationSystem.enabled': false } });
      await interaction.editReply({
        embeds: [await successEmbed(interaction.guild.id, 'Verification Disabled',
          `${GLYPHS.SUCCESS} The verification system is now disabled.`)]
      });
      break;
    }

    case 'setrole': {
      const role = interaction.options.getRole('role');
      await Guild.updateGuild(interaction.guild.id, {
        $set: {
          'features.verificationSystem.role': role.id,
          'roles.verifiedRole': role.id
        }
      });
      await interaction.editReply({
        embeds: [await successEmbed(interaction.guild.id, 'Verified Role Set',
          `${GLYPHS.SUCCESS} Verified role set to ${role}`)]
      });
      break;
    }

    case 'setchannel': {
      const channel = interaction.options.getChannel('channel');
      await Guild.updateGuild(interaction.guild.id, { $set: { 'features.verificationSystem.channel': channel.id } });
      await interaction.editReply({
        embeds: [await successEmbed(interaction.guild.id, 'Verification Channel Set',
          `${GLYPHS.SUCCESS} Verification channel set to ${channel}`)]
      });
      break;
    }

    case 'settype': {
      const type = interaction.options.getString('type');
      await Guild.updateGuild(interaction.guild.id, { $set: { 'features.verificationSystem.type': type } });

      const typeDescriptions = {
        button: 'Simple button click verification',
        captcha: 'Image captcha verification (creates private thread)',
        reaction: 'Reaction-based verification'
      };

      await interaction.editReply({
        embeds: [await successEmbed(interaction.guild.id, 'Verification Type Set',
          `${GLYPHS.SUCCESS} Verification type set to **${type}**\n\n${typeDescriptions[type]}\n\n⚠️ **Note:** You need to re-send the verification panel with \`/verify panel\` for changes to take effect.`)]
      });
      break;
    }
  }
}

// Handle cmdchannels command
async function handleCmdchannelsCommand(interaction, guildConfig) {
  const { successEmbed, errorEmbed, infoEmbed, GLYPHS } = await import('../../utils/embeds.js');
  const { EmbedBuilder } = await import('discord.js');
  const subcommand = interaction.options.getSubcommand();

  // Initialize if not exists
  const cmdChannels = guildConfig.commandChannels || { enabled: false, channels: [], bypassRoles: [] };

  switch (subcommand) {
    case 'enable': {
      if (cmdChannels.channels.length === 0) {
        await interaction.editReply({
          embeds: [await errorEmbed(interaction.guild.id, 'No Channels Added',
            `${GLYPHS.ERROR} Please add at least one channel first with \`/cmdchannels add\``)]
        });
        return;
      }
      await Guild.updateGuild(interaction.guild.id, { $set: { 'commandChannels.enabled': true } });
      await interaction.editReply({
        embeds: [await successEmbed(interaction.guild.id, 'Channel Restrictions Enabled',
          `${GLYPHS.SUCCESS} Bot commands will now only work in allowed channels.`)]
      });
      break;
    }

    case 'disable': {
      await Guild.updateGuild(interaction.guild.id, { $set: { 'commandChannels.enabled': false } });
      await interaction.editReply({
        embeds: [await successEmbed(interaction.guild.id, 'Channel Restrictions Disabled',
          `${GLYPHS.SUCCESS} Bot commands can now be used in any channel.`)]
      });
      break;
    }

    case 'add': {
      const channel = interaction.options.getChannel('channel');
      if (cmdChannels.channels.includes(channel.id)) {
        await interaction.editReply({
          embeds: [await errorEmbed(interaction.guild.id, 'Already Added',
            `${GLYPHS.ERROR} ${channel} is already in the allowed channels list.`)]
        });
        return;
      }
      await Guild.updateGuild(interaction.guild.id, { $push: { 'commandChannels.channels': channel.id } });
      await interaction.editReply({
        embeds: [await successEmbed(interaction.guild.id, 'Channel Added',
          `${GLYPHS.SUCCESS} ${channel} has been added to allowed channels.`)]
      });
      break;
    }

    case 'remove': {
      const channel = interaction.options.getChannel('channel');
      if (!cmdChannels.channels.includes(channel.id)) {
        await interaction.editReply({
          embeds: [await errorEmbed(interaction.guild.id, 'Not Found',
            `${GLYPHS.ERROR} ${channel} is not in the allowed channels list.`)]
        });
        return;
      }
      await Guild.updateGuild(interaction.guild.id, { $pull: { 'commandChannels.channels': channel.id } });
      await interaction.editReply({
        embeds: [await successEmbed(interaction.guild.id, 'Channel Removed',
          `${GLYPHS.SUCCESS} ${channel} has been removed from allowed channels.`)]
      });
      break;
    }

    case 'bypass': {
      const action = interaction.options.getString('action');
      const role = interaction.options.getRole('role');

      if (action === 'add') {
        if (cmdChannels.bypassRoles.includes(role.id)) {
          await interaction.editReply({
            embeds: [await errorEmbed(interaction.guild.id, 'Already Added',
              `${GLYPHS.ERROR} ${role} already bypasses channel restrictions.`)]
          });
          return;
        }
        await Guild.updateGuild(interaction.guild.id, { $push: { 'commandChannels.bypassRoles': role.id } });
        await interaction.editReply({
          embeds: [await successEmbed(interaction.guild.id, 'Bypass Role Added',
            `${GLYPHS.SUCCESS} ${role} can now use commands in any channel.`)]
        });
      } else {
        if (!cmdChannels.bypassRoles.includes(role.id)) {
          await interaction.editReply({
            embeds: [await errorEmbed(interaction.guild.id, 'Not Found',
              `${GLYPHS.ERROR} ${role} is not a bypass role.`)]
          });
          return;
        }
        await Guild.updateGuild(interaction.guild.id, { $pull: { 'commandChannels.bypassRoles': role.id } });
        await interaction.editReply({
          embeds: [await successEmbed(interaction.guild.id, 'Bypass Role Removed',
            `${GLYPHS.SUCCESS} ${role} no longer bypasses channel restrictions.`)]
        });
      }
      break;
    }

    case 'list': {
      const channelsList = cmdChannels.channels.length > 0
        ? cmdChannels.channels.map(id => `<#${id}>`).join('\n')
        : '*No channels configured*';

      const bypassList = cmdChannels.bypassRoles.length > 0
        ? cmdChannels.bypassRoles.map(id => `<@&${id}>`).join('\n')
        : '*No bypass roles*';

      const embed = new EmbedBuilder()
        .setTitle('📢 Command Channel Settings')
        .setColor(guildConfig.embedStyle?.color || '#5865F2')
        .addFields(
          { name: '📊 Status', value: cmdChannels.enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
          { name: '💬 Allowed Channels', value: channelsList, inline: false },
          { name: '👑 Bypass Roles', value: bypassList, inline: false }
        );
      await interaction.editReply({ embeds: [embed] });
      break;
    }
  }
}

// Handle logs command
async function handleLogsCommand(interaction, guildConfig) {
  const { successEmbed, infoEmbed, GLYPHS } = await import('../../utils/embeds.js');
  const { EmbedBuilder } = await import('discord.js');
  const subcommand = interaction.options.getSubcommand();

  const logTypes = {
    message: 'logging.messages',
    member: 'logging.members',
    voice: 'logging.voice',
    moderation: 'logging.moderation',
    server: 'logging.server'
  };

  const channelTypes = {
    message: 'channels.messageLog',
    member: 'channels.joinLog',
    voice: 'channels.voiceLog',
    moderation: 'channels.modLog',
    server: 'channels.serverLog'
  };

  switch (subcommand) {
    case 'enable': {
      const type = interaction.options.getString('type');
      if (type === 'all') {
        await Guild.updateGuild(interaction.guild.id, {
          $set: {
            'logging.messages': true,
            'logging.members': true,
            'logging.voice': true,
            'logging.moderation': true,
            'logging.server': true
          }
        });
        await interaction.editReply({
          embeds: [await successEmbed(interaction.guild.id, 'All Logs Enabled',
            `${GLYPHS.SUCCESS} All logging types have been enabled.`)]
        });
      } else {
        await Guild.updateGuild(interaction.guild.id, { $set: { [logTypes[type]]: true } });
        await interaction.editReply({
          embeds: [await successEmbed(interaction.guild.id, 'Logging Enabled',
            `${GLYPHS.SUCCESS} ${type.charAt(0).toUpperCase() + type.slice(1)} logging is now enabled.`)]
        });
      }
      break;
    }

    case 'disable': {
      const type = interaction.options.getString('type');
      if (type === 'all') {
        await Guild.updateGuild(interaction.guild.id, {
          $set: {
            'logging.messages': false,
            'logging.members': false,
            'logging.voice': false,
            'logging.moderation': false,
            'logging.server': false
          }
        });
        await interaction.editReply({
          embeds: [await successEmbed(interaction.guild.id, 'All Logs Disabled',
            `${GLYPHS.SUCCESS} All logging types have been disabled.`)]
        });
      } else {
        await Guild.updateGuild(interaction.guild.id, { $set: { [logTypes[type]]: false } });
        await interaction.editReply({
          embeds: [await successEmbed(interaction.guild.id, 'Logging Disabled',
            `${GLYPHS.SUCCESS} ${type.charAt(0).toUpperCase() + type.slice(1)} logging is now disabled.`)]
        });
      }
      break;
    }

    case 'channel': {
      const type = interaction.options.getString('type');
      const channel = interaction.options.getChannel('channel');
      await Guild.updateGuild(interaction.guild.id, { $set: { [channelTypes[type]]: channel.id } });
      await interaction.editReply({
        embeds: [await successEmbed(interaction.guild.id, 'Log Channel Set',
          `${GLYPHS.SUCCESS} ${type.charAt(0).toUpperCase() + type.slice(1)} logs will be sent to ${channel}`)]
      });
      break;
    }

    case 'status': {
      const logging = guildConfig.logging || {};
      const channels = guildConfig.channels || {};

      const statusEmbed = new EmbedBuilder()
        .setTitle('📋 Logging Status')
        .setColor(guildConfig.embedStyle?.color || '#5865F2')
        .addFields(
          { name: '📝 Message Logs', value: `${logging.messages ? '✅' : '❌'} ${channels.messageLog ? `<#${channels.messageLog}>` : 'No channel'}`, inline: true },
          { name: '👥 Member Logs', value: `${logging.members ? '✅' : '❌'} ${channels.joinLog ? `<#${channels.joinLog}>` : 'No channel'}`, inline: true },
          { name: '🔊 Voice Logs', value: `${logging.voice ? '✅' : '❌'} ${channels.voiceLog ? `<#${channels.voiceLog}>` : 'No channel'}`, inline: true },
          { name: '🔨 Moderation Logs', value: `${logging.moderation ? '✅' : '❌'} ${channels.modLog ? `<#${channels.modLog}>` : 'No channel'}`, inline: true },
          { name: '⚙️ Server Logs', value: `${logging.server ? '✅' : '❌'} ${channels.serverLog ? `<#${channels.serverLog}>` : 'No channel'}`, inline: true }
        );
      await interaction.editReply({ embeds: [statusEmbed] });
      break;
    }
  }
}

// Handle autorole command
async function handleAutoroleCommand(interaction, guildConfig) {
  const { successEmbed, errorEmbed, infoEmbed, GLYPHS } = await import('../../utils/embeds.js');
  const { EmbedBuilder } = await import('discord.js');
  const subcommand = interaction.options.getSubcommand();

  const autoroles = guildConfig.autorole || { enabled: true, roles: [], humanRoles: [], botRoles: [] };

  switch (subcommand) {
    case 'add': {
      const role = interaction.options.getRole('role');
      const type = interaction.options.getString('type') || 'all';

      let targetArray;
      let displayType;
      if (type === 'humans') {
        targetArray = 'autorole.humanRoles';
        displayType = 'humans only';
      } else if (type === 'bots') {
        targetArray = 'autorole.botRoles';
        displayType = 'bots only';
      } else {
        targetArray = 'autorole.roles';
        displayType = 'all members';
      }

      await Guild.updateGuild(interaction.guild.id, {
        $addToSet: { [targetArray]: role.id },
        $set: { 'autorole.enabled': true }
      });

      await interaction.editReply({
        embeds: [await successEmbed(interaction.guild.id, 'Auto-Role Added',
          `${GLYPHS.SUCCESS} ${role} will be given to ${displayType} when they join.`)]
      });
      break;
    }

    case 'remove': {
      const role = interaction.options.getRole('role');
      await Guild.updateGuild(interaction.guild.id, {
        $pull: {
          'autorole.roles': role.id,
          'autorole.humanRoles': role.id,
          'autorole.botRoles': role.id
        }
      });
      await interaction.editReply({
        embeds: [await successEmbed(interaction.guild.id, 'Auto-Role Removed',
          `${GLYPHS.SUCCESS} ${role} has been removed from auto-roles.`)]
      });
      break;
    }

    case 'list': {
      const allRoles = (autoroles.roles || []).map(id => `<@&${id}> (all)`);
      const humanRoles = (autoroles.humanRoles || []).map(id => `<@&${id}> (humans)`);
      const botRoles = (autoroles.botRoles || []).map(id => `<@&${id}> (bots)`);
      const combined = [...allRoles, ...humanRoles, ...botRoles];

      const embed = new EmbedBuilder()
        .setTitle('🎭 Auto-Roles')
        .setColor(guildConfig.embedStyle?.color || '#5865F2')
        .setDescription(combined.length > 0 ? combined.join('\n') : '*No auto-roles configured*')
        .setFooter({ text: `Status: ${autoroles.enabled ? 'Enabled' : 'Disabled'}` });

      await interaction.editReply({ embeds: [embed] });
      break;
    }

    case 'clear': {
      await Guild.updateGuild(interaction.guild.id, {
        $set: {
          'autorole.roles': [],
          'autorole.humanRoles': [],
          'autorole.botRoles': []
        }
      });
      await interaction.editReply({
        embeds: [await successEmbed(interaction.guild.id, 'Auto-Roles Cleared',
          `${GLYPHS.SUCCESS} All auto-roles have been removed.`)]
      });
      break;
    }
  }
}

// Feature management slash command handler
async function handleFeatureCommand(interaction, client, guildConfig) {
  const { successEmbed, errorEmbed, infoEmbed, GLYPHS } = await import('../../utils/embeds.js');
  const { EmbedBuilder } = await import('discord.js');

  const guildId = interaction.guild.id;
  const featureType = interaction.options.getString('type');
  const status = interaction.options.getString('status');
  const customCommand = interaction.options.getString('command')?.toLowerCase();

  // Define feature categories and their associated commands
  const featureCategories = {
    economy: ['balance', 'daily', 'shop', 'inventory', 'profile', 'setprofile', 'setbackground', 'claim', 'addcoins', 'rep'],
    gambling: ['slots', 'blackjack', 'coinflip', 'dice', 'roulette', 'adventure'],
    leveling: ['level', 'rank', 'top', 'leaderboard', 'xp'],
    games: ['trivia', 'tictactoe'],
    fun: ['meme', 'gif', 'poll'],
    birthdays: ['birthday', 'setbirthday', 'mybirthday', 'birthdays', 'requestbirthday', 'approvebday', 'rejectbday', 'cancelbirthday', 'removebirthday', 'birthdaypreference', 'birthdayrequests'],
    giveaways: ['giveaway', 'gstart', 'gend', 'greroll'],
    events: ['createevent', 'events', 'joinevent', 'cancelevent'],
    starboard: ['starboard'],
    tickets: ['ticket', 'ticketpanel'],
    afk: ['afk'],
    reminders: ['remind', 'reminder'],
    automod: ['automod'],
    welcome: ['welcome']
  };

  // Get commands for the selected feature
  let commandsToManage = [];
  let featureName = '';

  if (featureType === 'custom') {
    if (!customCommand) {
      return interaction.editReply({
        embeds: [await errorEmbed(guildId, 'Missing Command',
          `${GLYPHS.ERROR} Please specify a command name using the \`command\` option.`)]
      });
    }
    commandsToManage = [customCommand];
    featureName = `Command: ${customCommand}`;
  } else {
    commandsToManage = featureCategories[featureType] || [];
    const featureNames = {
      economy: '💰 Economy',
      gambling: '🎰 Gambling',
      leveling: '📊 Leveling',
      games: '🎮 Games',
      fun: '😂 Fun',
      birthdays: '🎂 Birthdays',
      giveaways: '🎉 Giveaways',
      events: '📅 Events',
      starboard: '⭐ Starboard',
      tickets: '🎫 Tickets',
      afk: '💤 AFK',
      reminders: '⏰ Reminders',
      automod: '🛡️ AutoMod',
      welcome: '👋 Welcome'
    };
    featureName = featureNames[featureType] || featureType;
  }

  // Handle status view
  if (status === 'status') {
    const disabledText = guildConfig.textCommands?.disabledCommands || [];
    const disabledSlash = guildConfig.slashCommands?.disabledCommands || [];

    const commandStatus = commandsToManage.map(cmd => {
      const textDisabled = disabledText.includes(cmd);
      const slashDisabled = disabledSlash.includes(cmd);
      const icon = (!textDisabled && !slashDisabled) ? '✅' : (textDisabled && slashDisabled) ? '❌' : '⚠️';
      return `${icon} \`${cmd}\``;
    });

    const embed = new EmbedBuilder()
      .setTitle(`${featureName} Status`)
      .setDescription(commandStatus.join('\n') || 'No commands in this category')
      .setColor('#667eea')
      .setFooter({ text: '✅ Enabled | ❌ Disabled | ⚠️ Partially disabled' });

    return interaction.editReply({ embeds: [embed] });
  }

  // Enable or disable
  const isEnabling = status === 'enable';
  const disabledText = [...(guildConfig.textCommands?.disabledCommands || [])];
  const disabledSlash = [...(guildConfig.slashCommands?.disabledCommands || [])];

  // Protected commands that cannot be disabled
  const protectedCommands = ['help', 'config', 'feature', 'setup'];

  let modifiedCount = 0;
  let skippedProtected = [];

  for (const cmd of commandsToManage) {
    if (!isEnabling && protectedCommands.includes(cmd)) {
      skippedProtected.push(cmd);
      continue;
    }

    if (isEnabling) {
      // Remove from disabled lists
      const textIdx = disabledText.indexOf(cmd);
      if (textIdx > -1) { disabledText.splice(textIdx, 1); modifiedCount++; }
      const slashIdx = disabledSlash.indexOf(cmd);
      if (slashIdx > -1) { disabledSlash.splice(slashIdx, 1); modifiedCount++; }
    } else {
      // Add to disabled lists
      if (!disabledText.includes(cmd)) { disabledText.push(cmd); modifiedCount++; }
      if (!disabledSlash.includes(cmd)) { disabledSlash.push(cmd); modifiedCount++; }
    }
  }

  await Guild.updateGuild(guildId, {
    $set: {
      'textCommands.disabledCommands': disabledText,
      'slashCommands.disabledCommands': disabledSlash
    }
  });

  let description = `${GLYPHS.SUCCESS} **${featureName}** has been ${isEnabling ? 'enabled' : 'disabled'}.\n\n`;
  description += `**Commands affected:** ${commandsToManage.length}\n`;
  description += `**Commands:** ${commandsToManage.map(c => `\`${c}\``).join(', ')}`;

  if (skippedProtected.length > 0) {
    description += `\n\n⚠️ **Skipped (protected):** ${skippedProtected.map(c => `\`${c}\``).join(', ')}`;
  }

  return interaction.editReply({
    embeds: [await successEmbed(guildId,
      `Feature ${isEnabling ? 'Enabled' : 'Disabled'}`,
      description)]
  });
}

async function handleGiveawayCommand(interaction, client, guildConfig) {
  const { successEmbed, errorEmbed, infoEmbed, GLYPHS } = await import('../../utils/embeds.js');
  const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = await import('discord.js');
  const Giveaway = (await import('../../models/Giveaway.js')).default;
  const { endGiveawayById } = await import('../../commands/community/giveaway.js');

  const subcommand = interaction.options.getSubcommand();

  switch (subcommand) {
    case 'start': {
      const durationStr = interaction.options.getString('duration');
      const winners = interaction.options.getInteger('winners');
      const prize = interaction.options.getString('prize');
      const requiredRole = interaction.options.getRole('required_role');

      // Parse duration
      const durationMatch = durationStr.match(/^(\d+)(s|m|h|d|w)$/i);
      if (!durationMatch) {
        return interaction.editReply({
          embeds: [await errorEmbed(interaction.guild.id, 'Invalid Duration',
            'Please provide a valid duration.')]
        });
      }

      const value = parseInt(durationMatch[1]);
      const unit = durationMatch[2].toLowerCase();
      const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000, w: 604800000 };
      const duration = value * multipliers[unit];

      const endsAt = new Date(Date.now() + duration);

      // Create giveaway embed
      const embed = new EmbedBuilder()
        .setColor(guildConfig.embedStyle?.color || '#FF69B4')
        .setTitle('🎉 GIVEAWAY 🎉')
        .setDescription(
          `**Prize:** ${prize}\n\n` +
          `**Winners:** ${winners}\n` +
          `**Hosted by:** ${interaction.user}\n` +
          (requiredRole ? `**Required Role:** ${requiredRole}\n\n` : '\n') +
          `**Ends:** <t:${Math.floor(endsAt.getTime() / 1000)}:R>\n\n` +
          `Click the button below to enter!`
        )
        .setFooter({ text: 'Ends at' })
        .setTimestamp(endsAt);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('giveaway_enter')
          .setLabel('🎉 Enter (0)')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('giveaway_participants')
          .setLabel('👥 Participants')
          .setStyle(ButtonStyle.Secondary)
      );

      const giveawayMessage = await interaction.channel.send({
        embeds: [embed],
        components: [row]
      });

      // Save to database
      await Giveaway.create({
        guildId: interaction.guild.id,
        channelId: interaction.channel.id,
        messageId: giveawayMessage.id,
        hostId: interaction.user.id,
        prize,
        winners,
        endsAt,
        participants: [],
        requirements: requiredRole ? { roleId: requiredRole.id } : undefined
      });

      return interaction.editReply({
        embeds: [await successEmbed(interaction.guild.id, 'Giveaway Started!',
          `${GLYPHS.SUCCESS} Giveaway for **${prize}** has started!\n` +
          `Ends <t:${Math.floor(endsAt.getTime() / 1000)}:R>`)]
      });
    }

    case 'end': {
      const messageId = interaction.options.getString('message_id');
      const giveaway = await Giveaway.findOne({ messageId, guildId: interaction.guild.id });

      if (!giveaway) {
        return interaction.editReply({
          embeds: [await errorEmbed(interaction.guild.id, 'Not Found',
            'Could not find a giveaway with that message ID.')]
        });
      }

      if (giveaway.ended) {
        return interaction.editReply({
          embeds: [await errorEmbed(interaction.guild.id, 'Already Ended',
            'This giveaway has already ended.')]
        });
      }

      await endGiveawayById(interaction.guild, giveaway);

      return interaction.editReply({
        embeds: [await successEmbed(interaction.guild.id, 'Giveaway Ended',
          `${GLYPHS.SUCCESS} The giveaway has been ended!`)]
      });
    }

    case 'reroll': {
      const messageId = interaction.options.getString('message_id');
      const giveaway = await Giveaway.findOne({ messageId, guildId: interaction.guild.id });

      if (!giveaway) {
        return interaction.editReply({
          embeds: [await errorEmbed(interaction.guild.id, 'Not Found',
            'Could not find a giveaway with that message ID.')]
        });
      }

      if (!giveaway.ended) {
        return interaction.editReply({
          embeds: [await errorEmbed(interaction.guild.id, 'Not Ended',
            'This giveaway has not ended yet. Use `/giveaway end` first.')]
        });
      }

      if (giveaway.participants.length === 0) {
        return interaction.editReply({
          embeds: [await errorEmbed(interaction.guild.id, 'No Participants',
            'There were no participants in this giveaway.')]
        });
      }

      // Pick new winners
      const newWinners = giveaway.pickWinners();
      giveaway.winnerIds = newWinners;
      await giveaway.save();

      const channel = interaction.guild.channels.cache.get(giveaway.channelId);
      if (channel) {
        const winnerMentions = newWinners.map(id => `<@${id}>`).join(', ');
        await channel.send({
          content: `🎉 **REROLL!** New winner(s): ${winnerMentions}\n**Prize:** ${giveaway.prize}`
        });
      }

      return interaction.editReply({
        embeds: [await successEmbed(interaction.guild.id, 'Giveaway Rerolled',
          `${GLYPHS.SUCCESS} New winners have been selected!`)]
      });
    }

    case 'list': {
      const giveaways = await Giveaway.getGuildGiveaways(interaction.guild.id);

      if (giveaways.length === 0) {
        return interaction.editReply({
          embeds: [await infoEmbed(interaction.guild.id, 'No Active Giveaways',
            'There are no active giveaways in this server.')]
        });
      }

      const giveawayList = giveaways.map((g, i) =>
        `**${i + 1}.** ${g.prize}\n` +
        `   ${GLYPHS.DOT} Ends: <t:${Math.floor(g.endsAt.getTime() / 1000)}:R>\n` +
        `   ${GLYPHS.DOT} Participants: ${g.participants.length}\n` +
        `   ${GLYPHS.DOT} Message ID: \`${g.messageId}\``
      ).join('\n\n');

      return interaction.editReply({
        embeds: [await infoEmbed(interaction.guild.id, '🎉 Active Giveaways', giveawayList)]
      });
    }

    case 'delete': {
      const messageId = interaction.options.getString('message_id');
      const giveaway = await Giveaway.findOneAndDelete({ messageId, guildId: interaction.guild.id });

      if (!giveaway) {
        return interaction.editReply({
          embeds: [await errorEmbed(interaction.guild.id, 'Not Found',
            'Could not find a giveaway with that message ID.')]
        });
      }

      // Try to delete the giveaway message
      try {
        const channel = interaction.guild.channels.cache.get(giveaway.channelId);
        const msg = await channel?.messages.fetch(giveaway.messageId);
        await msg?.delete();
      } catch {
        // Message might already be deleted
      }

      return interaction.editReply({
        embeds: [await successEmbed(interaction.guild.id, 'Giveaway Deleted',
          `${GLYPHS.SUCCESS} The giveaway has been cancelled and deleted.`)]
      });
    }
  }
}