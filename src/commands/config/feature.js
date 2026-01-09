import { PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';
import Guild from '../../models/Guild.js';
import { successEmbed, errorEmbed, infoEmbed, GLYPHS } from '../../utils/embeds.js';

// Define feature categories and their associated commands
const featureCategories = {
  economy: {
    name: '💰 Economy',
    commands: ['balance', 'daily', 'shop', 'inventory', 'profile', 'setprofile', 'setbackground', 'claim', 'addcoins', 'rep']
  },
  gambling: {
    name: '🎰 Gambling',
    commands: ['slots', 'blackjack', 'coinflip', 'dice', 'roulette', 'adventure']
  },
  leveling: {
    name: '📊 Leveling',
    commands: ['level', 'rank', 'top', 'leaderboard', 'xp']
  },
  games: {
    name: '🎮 Games',
    commands: ['trivia', 'tictactoe']
  },
  fun: {
    name: '😂 Fun',
    commands: ['meme', 'gif', 'poll']
  },
  birthdays: {
    name: '🎂 Birthdays',
    commands: ['birthday', 'setbirthday', 'mybirthday', 'birthdays', 'requestbirthday', 'approvebday', 'rejectbday', 'cancelbirthday', 'removebirthday', 'birthdaypreference', 'birthdayrequests']
  },
  giveaways: {
    name: '🎉 Giveaways',
    commands: ['giveaway', 'gstart', 'gend', 'greroll']
  },
  events: {
    name: '📅 Events',
    commands: ['createevent', 'events', 'joinevent', 'cancelevent']
  },
  starboard: {
    name: '⭐ Starboard',
    commands: ['starboard']
  },
  tickets: {
    name: '🎫 Tickets',
    commands: ['ticket', 'ticketpanel']
  },
  afk: {
    name: '💤 AFK',
    commands: ['afk']
  },
  reminders: {
    name: '⏰ Reminders',
    commands: ['remind', 'reminder']
  },
  automod: {
    name: '🛡️ AutoMod',
    commands: ['automod']
  },
  welcome: {
    name: '👋 Welcome',
    commands: ['welcome']
  },
  profilecustomization: {
    name: '🎨 Profile Customization',
    commands: [], // Special feature - not command-based
    isFeatureToggle: true
  },
  aichat: {
    name: '🤖 AI Chat (Raphael)',
    commands: [], // Special feature - not command-based
    isFeatureToggle: true
  }
};

const protectedCommands = ['help', 'config', 'feature', 'setup'];

export default {
  name: 'feature',
  description: 'Enable or disable bot features and commands',
  usage: '<enable|disable|status> <feature|command>',
  aliases: ['features', 'toggle', 'cmd', 'command'],
  category: 'config',
  permissions: [PermissionFlagsBits.Administrator],
  cooldown: 3,

  async execute(message, args, client) {
    const guildId = message.guild.id;
    const guildConfig = await Guild.getGuild(guildId);

    // Check for admin role
    const hasAdminRole = guildConfig.roles.adminRoles?.some(roleId =>
      message.member.roles.cache.has(roleId)
    );

    if (!message.member.permissions.has(PermissionFlagsBits.Administrator) && !hasAdminRole) {
      return message.reply({
        embeds: [await errorEmbed(guildId, 'Permission Denied',
          `${GLYPHS.LOCK} You need Administrator permissions to manage features.`)]
      });
    }

    // No args - show interactive menu
    if (!args[0]) {
      return showFeatureMenu(message, guildConfig);
    }

    const action = args[0].toLowerCase();

    // List all disabled
    if (action === 'list' || action === 'disabled') {
      return showDisabledList(message, guildConfig);
    }

    // Status of a feature
    if (action === 'status') {
      const feature = args[1]?.toLowerCase();
      if (!feature) {
        return showFeatureMenu(message, guildConfig);
      }
      return showFeatureStatus(message, guildConfig, feature);
    }

    // Enable/disable
    if (action === 'enable' || action === 'disable') {
      const target = args[1]?.toLowerCase();
      if (!target) {
        const embed = await errorEmbed(guildId, 'Missing Target',
          `${GLYPHS.ERROR} Please specify a feature or command.\n\n` +
          `**Usage:**\n` +
          `${GLYPHS.ARROW_RIGHT} \`feature ${action} <feature>\` - ${action} a feature category\n` +
          `${GLYPHS.ARROW_RIGHT} \`feature ${action} <command>\` - ${action} a single command\n\n` +
          `**Features:** ${Object.keys(featureCategories).map(f => `\`${f}\``).join(', ')}`
        );
        return message.reply({ embeds: [embed] });
      }

      return toggleFeature(message, guildConfig, target, action === 'enable', client);
    }

    // If first arg is a feature name directly
    if (featureCategories[action]) {
      return showFeatureStatus(message, guildConfig, action);
    }

    // Show help
    return showFeatureMenu(message, guildConfig);
  }
};

async function showFeatureMenu(message, guildConfig) {
  const guildId = message.guild.id;
  const disabledText = guildConfig.textCommands?.disabledCommands || [];
  const disabledSlash = guildConfig.slashCommands?.disabledCommands || [];

  let description = `**Manage bot features and commands**\n\n`;

  for (const [key, category] of Object.entries(featureCategories)) {
    // Handle special feature toggles
    if (category.isFeatureToggle) {
      if (key === 'aichat') {
        const aiEnabled = guildConfig.features?.aiChat?.enabled;
        const status = aiEnabled ? '✅' : '❌';
        description += `${status} **${category.name}** - Feature toggle\n`;
      } else if (key === 'profilecustomization') {
        const profileEnabled = guildConfig.economy?.profileCustomization?.enabled !== false; // Default true
        const status = profileEnabled ? '✅' : '❌';
        description += `${status} **${category.name}** - Feature toggle\n`;
      }
      continue;
    }

    const disabledCount = category.commands.filter(cmd =>
      disabledText.includes(cmd) || disabledSlash.includes(cmd)
    ).length;
    const status = disabledCount === 0 ? '✅' : disabledCount === category.commands.length ? '❌' : '⚠️';
    description += `${status} **${category.name}** - ${category.commands.length} commands\n`;
  }

  // Add AI Chat separately at the end
  const aiEnabled = guildConfig.features?.aiChat?.enabled;
  const trollEnabled = guildConfig.features?.aiChat?.trollMode;
  description += `${aiEnabled ? '✅' : '❌'} **🤖 AI Chat (Raphael)** - Feature toggle\n`;
  if (aiEnabled) {
    description += `  └─ ${trollEnabled ? '😈' : '😇'} Troll Mode: ${trollEnabled ? 'Enabled' : 'Disabled'}\n`;
  }

  description += `\n**Commands:**\n`;
  description += `${GLYPHS.ARROW_RIGHT} \`feature enable <feature>\` - Enable a feature\n`;
  description += `${GLYPHS.ARROW_RIGHT} \`feature disable <feature>\` - Disable a feature\n`;
  description += `${GLYPHS.ARROW_RIGHT} \`feature status <feature>\` - View feature status\n`;
  description += `${GLYPHS.ARROW_RIGHT} \`feature list\` - List all disabled commands\n`;
  description += `${GLYPHS.ARROW_RIGHT} \`feature enable <command>\` - Enable single command\n`;
  description += `${GLYPHS.ARROW_RIGHT} \`feature disable <command>\` - Disable single command`;

  const embed = new EmbedBuilder()
    .setTitle('🔧 Feature Management')
    .setDescription(description)
    .setColor('#667eea')
    .setFooter({ text: '✅ Enabled | ❌ Disabled | ⚠️ Partially disabled' });

  return message.reply({ embeds: [embed] });
}

async function showDisabledList(message, guildConfig) {
  const guildId = message.guild.id;
  const disabledText = guildConfig.textCommands?.disabledCommands || [];
  const disabledSlash = guildConfig.slashCommands?.disabledCommands || [];

  let description = '';

  if (disabledText.length > 0) {
    description += `**Disabled Text Commands (${disabledText.length}):**\n`;
    description += disabledText.map(c => `${GLYPHS.DOT} \`${c}\``).join('\n');
    description += '\n\n';
  }

  if (disabledSlash.length > 0) {
    description += `**Disabled Slash Commands (${disabledSlash.length}):**\n`;
    description += disabledSlash.map(c => `${GLYPHS.DOT} \`/${c}\``).join('\n');
  }

  if (!description) {
    description = `${GLYPHS.SUCCESS} No commands are currently disabled!\n\nAll bot features are active.`;
  }

  const embed = await infoEmbed(guildId, '📋 Disabled Commands', description);
  return message.reply({ embeds: [embed] });
}

async function showFeatureStatus(message, guildConfig, feature) {
  const guildId = message.guild.id;

  // Handle AI Chat specially
  if (feature === 'aichat' || feature === 'ai' || feature === 'raphael') {
    const aiConfig = guildConfig.features?.aiChat || {};
    const embed = new EmbedBuilder()
      .setTitle('🤖 AI Chat (Raphael) Status')
      .setColor(aiConfig.enabled ? '#00FF7F' : '#FF4757')
      .setDescription(
        `**Status:** ${aiConfig.enabled ? '✅ Enabled' : '❌ Disabled'}\n` +
        `**Troll Mode:** ${aiConfig.trollMode ? '😈 Enabled' : '😇 Disabled'}\n\n` +
        `**How to use:**\n` +
        `• Mention the bot and ask a question\n` +
        `• Reply to the bot's messages\n\n` +
        `**Personality:** Raphael (from Tensura)\n` +
        `**Powered by:** Pollinations AI (Free)\n\n` +
        `**Commands:**\n` +
        `${GLYPHS.ARROW_RIGHT} \`feature enable aichat\` - Enable AI Chat\n` +
        `${GLYPHS.ARROW_RIGHT} \`feature disable aichat\` - Disable AI Chat\n` +
        `${GLYPHS.ARROW_RIGHT} \`feature enable troll\` - Enable Troll Mode 😈\n` +
        `${GLYPHS.ARROW_RIGHT} \`feature disable troll\` - Disable Troll Mode`
      )
      .setFooter({ text: 'No API key required - uses free Pollinations AI' });

    return message.reply({ embeds: [embed] });
  }

  // Handle Profile Customization specially
  if (feature === 'profilecustomization' || feature === 'profilecustom' || feature === 'customization') {
    const profileEnabled = guildConfig.economy?.profileCustomization?.enabled !== false; // Default true
    const cardOverlay = guildConfig.economy?.cardOverlay || { color: '#000000', opacity: 0.5 };

    const embed = new EmbedBuilder()
      .setTitle('🎨 Profile Customization Status')
      .setColor(profileEnabled ? '#00FF7F' : '#FF4757')
      .setDescription(
        `**Status:** ${profileEnabled ? '✅ Enabled (Users can customize)' : '❌ Disabled (Admin controls)'}\n\n` +
        (profileEnabled
          ? `**When enabled (current):**\n` +
          `Users can customize their own overlay:\n` +
          `• \`setprofile overlay color <hex>\`\n` +
          `• \`setprofile overlay opacity <0-100>\`\n\n` +
          `**Commands:**\n` +
          `${GLYPHS.ARROW_RIGHT} \`feature disable profilecustomization\` - Take control as admin`
          : `**When disabled (current):**\n` +
          `Server overlay applies to all profiles:\n` +
          `• Color: \`${cardOverlay.color}\`\n` +
          `• Opacity: \`${Math.round(cardOverlay.opacity * 100)}%\`\n\n` +
          `**Admin Commands:**\n` +
          `${GLYPHS.ARROW_RIGHT} \`setoverlay color <hex>\` - Set overlay color\n` +
          `${GLYPHS.ARROW_RIGHT} \`setoverlay opacity <0-100>\` - Set overlay opacity\n\n` +
          `${GLYPHS.ARROW_RIGHT} \`feature enable profilecustomization\` - Let users customize`)
      )
      .setFooter({ text: 'Background changes via shop/inventory always work' });

    return message.reply({ embeds: [embed] });
  }

  const category = featureCategories[feature];

  if (!category) {
    // Check if it's a single command
    const embed = await errorEmbed(guildId, 'Unknown Feature',
      `${GLYPHS.ERROR} \`${feature}\` is not a valid feature.\n\n` +
      `**Available features:**\n${Object.keys(featureCategories).map(f => `\`${f}\``).join(', ')}`
    );
    return message.reply({ embeds: [embed] });
  }

  const disabledText = guildConfig.textCommands?.disabledCommands || [];
  const disabledSlash = guildConfig.slashCommands?.disabledCommands || [];

  const commandStatus = category.commands.map(cmd => {
    const textDisabled = disabledText.includes(cmd);
    const slashDisabled = disabledSlash.includes(cmd);
    let icon = '✅';
    if (textDisabled && slashDisabled) icon = '❌';
    else if (textDisabled || slashDisabled) icon = '⚠️';
    return `${icon} \`${cmd}\``;
  });

  const enabledCount = category.commands.filter(cmd =>
    !disabledText.includes(cmd) && !disabledSlash.includes(cmd)
  ).length;

  const embed = new EmbedBuilder()
    .setTitle(`${category.name} Status`)
    .setDescription(commandStatus.join('\n'))
    .setColor(enabledCount === category.commands.length ? '#57F287' : enabledCount === 0 ? '#ED4245' : '#FEE75C')
    .addFields({
      name: 'Summary',
      value: `${enabledCount}/${category.commands.length} commands enabled`
    })
    .setFooter({ text: '✅ Enabled | ❌ Disabled | ⚠️ Partially disabled' });

  return message.reply({ embeds: [embed] });
}

async function toggleFeature(message, guildConfig, target, isEnabling, client) {
  const guildId = message.guild.id;
  const category = featureCategories[target];

  // Handle Troll Mode toggle
  if (target === 'troll' || target === 'trollmode') {
    // Check if AI Chat is enabled first
    const aiEnabled = guildConfig.features?.aiChat?.enabled;
    if (!aiEnabled && isEnabling) {
      const embed = await errorEmbed(guildId, 'AI Chat Disabled',
        `${GLYPHS.ERROR} AI Chat must be enabled before you can enable Troll Mode!\n\n` +
        `Use \`feature enable aichat\` first.`
      );
      return message.reply({ embeds: [embed] });
    }

    await Guild.updateGuild(guildId, {
      $set: { 'features.aiChat.trollMode': isEnabling }
    });

    const embed = await successEmbed(guildId,
      `Troll Mode ${isEnabling ? 'Enabled 😈' : 'Disabled 😇'}`,
      `${GLYPHS.SUCCESS} **Troll Mode** has been ${isEnabling ? 'enabled' : 'disabled'}.\n\n` +
      (isEnabling
        ? `Raphael is now in **chaos mode** - expect unhinged, chaotic, and absolutely based responses. 💀`
        : `Raphael is back to normal - cheeky but reasonable.`)
    );
    return message.reply({ embeds: [embed] });
  }

  // Handle AI Chat specially (it's a feature toggle, not command-based)
  if (target === 'aichat' || target === 'ai' || target === 'raphael') {
    await Guild.updateGuild(guildId, {
      $set: { 'features.aiChat.enabled': isEnabling }
    });

    const embed = await successEmbed(guildId,
      `AI Chat ${isEnabling ? 'Enabled' : 'Disabled'}`,
      `${GLYPHS.SUCCESS} **🤖 AI Chat (Raphael)** has been ${isEnabling ? 'enabled' : 'disabled'}.\n\n` +
      (isEnabling
        ? `Users can now chat with Raphael by mentioning <@${client.user.id}> or replying to the bot's messages.`
        : `The AI chat feature is now disabled.`)
    );
    return message.reply({ embeds: [embed] });
  }

  // Handle Profile Customization toggle
  if (target === 'profilecustomization' || target === 'profilecustom' || target === 'customization') {
    await Guild.updateGuild(guildId, {
      $set: { 'economy.profileCustomization.enabled': isEnabling }
    });

    const embed = await successEmbed(guildId,
      `Profile Customization ${isEnabling ? 'Enabled' : 'Disabled'}`,
      `${GLYPHS.SUCCESS} **🎨 Profile Customization** has been ${isEnabling ? 'enabled' : 'disabled'}.\n\n` +
      (isEnabling
        ? `Users can now customize their own overlay color and opacity using:\n` +
        `• \`setprofile overlay color <hex>\`\n` +
        `• \`setprofile overlay opacity <0-100>\``
        : `Users can no longer customize their overlay. Use \`setoverlay\` to set server-wide overlay settings:\n` +
        `• \`setoverlay color <hex>\`\n` +
        `• \`setoverlay opacity <0-100>\``)
    );
    return message.reply({ embeds: [embed] });
  }

  let commandsToManage = [];
  let featureName = '';

  if (category) {
    // It's a feature category
    commandsToManage = category.commands;
    featureName = category.name;
  } else {
    // It's a single command - check if it exists
    const commandExists = client.commands.has(target) || client.aliases?.has(target);
    if (!commandExists) {
      const embed = await errorEmbed(guildId, 'Not Found',
        `${GLYPHS.ERROR} \`${target}\` is not a valid feature or command.\n\n` +
        `**Features:** ${Object.keys(featureCategories).map(f => `\`${f}\``).join(', ')}\n\n` +
        `Or use a valid command name.`
      );
      return message.reply({ embeds: [embed] });
    }

    const actualCommand = client.commands.get(target) || client.commands.get(client.aliases.get(target));
    commandsToManage = [actualCommand?.name || target];
    featureName = `Command: ${commandsToManage[0]}`;
  }

  const disabledText = [...(guildConfig.textCommands?.disabledCommands || [])];
  const disabledSlash = [...(guildConfig.slashCommands?.disabledCommands || [])];

  let skippedProtected = [];

  for (const cmd of commandsToManage) {
    if (!isEnabling && protectedCommands.includes(cmd)) {
      skippedProtected.push(cmd);
      continue;
    }

    if (isEnabling) {
      // Remove from disabled lists
      const textIdx = disabledText.indexOf(cmd);
      if (textIdx > -1) disabledText.splice(textIdx, 1);
      const slashIdx = disabledSlash.indexOf(cmd);
      if (slashIdx > -1) disabledSlash.splice(slashIdx, 1);
    } else {
      // Add to disabled lists
      if (!disabledText.includes(cmd)) disabledText.push(cmd);
      if (!disabledSlash.includes(cmd)) disabledSlash.push(cmd);
    }
  }

  await Guild.updateGuild(guildId, {
    $set: {
      'textCommands.disabledCommands': disabledText,
      'slashCommands.disabledCommands': disabledSlash
    }
  });

  let description = `${GLYPHS.SUCCESS} **${featureName}** has been ${isEnabling ? 'enabled' : 'disabled'}.\n\n`;
  description += `**Commands affected:** ${commandsToManage.length - skippedProtected.length}\n`;

  if (commandsToManage.length <= 10) {
    description += `**Commands:** ${commandsToManage.filter(c => !skippedProtected.includes(c)).map(c => `\`${c}\``).join(', ')}`;
  }

  if (skippedProtected.length > 0) {
    description += `\n\n⚠️ **Skipped (protected):** ${skippedProtected.map(c => `\`${c}\``).join(', ')}`;
  }

  const embed = await successEmbed(guildId,
    `Feature ${isEnabling ? 'Enabled' : 'Disabled'}`,
    description
  );
  return message.reply({ embeds: [embed] });
}
