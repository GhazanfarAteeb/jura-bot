import { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { GLYPHS, COLORS } from '../../utils/embeds.js';
import { getPrefix } from '../../utils/helpers.js';
import Guild from '../../models/Guild.js';

// Accurate command lists based on actual files
const COMMANDS_BY_CATEGORY = {
  admin: ['deployment', 'logs', 'award'],
  config: [
    'setup', 'config', 'feature', 'setprefix', 'setchannel', 'setrole', 'setcoin',
    'automod', 'welcome', 'antinuke', 'autopublish', 'autorole', 'cmdchannels',
    'manageshop', 'colorroles', 'levelroles', 'noxp', 'reactionroles', 'xpmultiplier', 'cleanup', 'logs'
  ],
  moderation: ['warn', 'kick', 'ban', 'purge', 'userhistory', 'timeout', 'untimeout', 'lockdown', 'verify'],
  economy: [
    'daily', 'balance', 'level', 'profile', 'shop', 'inventory', 'setprofile', 'setbackground',
    'adventure', 'rep', 'claim'
  ],
  gambling: ['coinflip', 'slots', 'dice', 'roulette', 'blackjack'],
  music: [
    'play', 'pause', 'resume', 'skip', 'stop', 'queue', 'nowplaying', 'volume',
    'shuffle', 'loop', 'seek', 'remove', 'clear', 'skipto'
  ],
  community: [
    'setbirthday', 'birthdays', 'removebirthday', 'birthdaypreference', 'mybirthday',
    'requestbirthday', 'approvebday', 'rejectbday', 'birthdayrequests', 'cancelbirthday',
    'createevent', 'events', 'joinevent', 'cancelevent', 'giveaway', 'starboard'
  ],
  social: ['marry', 'divorce', 'badges'],
  fun: ['tictactoe', 'trivia'],
  info: ['help', 'ping', 'serverinfo', 'userinfo', 'checkuser', 'roleinfo', 'channelinfo'],
  utility: [
    'leaderboard', 'top', 'stats', 'embed', 'embedset', 'embedhelp', 'afk', 'gif', 'meme',
    'react', 'remind', 'tempvc', 'avatar', 'banner', 'steal', 'firstmessage', 'poll', 'ticket'
  ]
};

// Slash commands available
const SLASH_COMMANDS = [
  'ban', 'kick', 'warn', 'timeout', 'purge', 'userhistory', 'untimeout', 'verify',
  'lockdown', 'feature', 'giveaway', 'award', 'play', 'pause', 'resume', 'skip', 'stop', 'queue',
  'nowplaying', 'volume', 'shuffle', 'loop', 'seek', 'remove', 'clear', 'skipto'
];

const CATEGORY_INFO = {
  admin: {
    emoji: '👑',
    name: 'Admin',
    description: 'Bot owner and administrator commands',
    color: '#FF6B6B'
  },
  config: {
    emoji: '⚙️',
    name: 'Configuration',
    description: 'Server setup, automod, and configuration',
    color: '#4ECDC4'
  },
  moderation: {
    emoji: '🛡️',
    name: 'Moderation',
    description: 'Keep your server safe and moderated',
    color: '#FF8C00'
  },
  economy: {
    emoji: '💰',
    name: 'Economy',
    description: 'Earn coins, level up, and customize profiles',
    color: '#FFD700'
  },
  gambling: {
    emoji: '🎰',
    name: 'Gambling',
    description: 'Test your luck with casino games',
    color: '#9B59B6'
  },
  music: {
    emoji: '🎵',
    name: 'Music',
    description: 'Play and control music in voice channels',
    color: '#1DB954'
  },
  community: {
    emoji: '🎉',
    name: 'Community',
    description: 'Birthdays, events, giveaways, and more',
    color: '#E91E63'
  },
  social: {
    emoji: '💕',
    name: 'Social',
    description: 'Marriage and social interaction features',
    color: '#FF69B4'
  },
  fun: {
    emoji: '🎮',
    name: 'Fun & Games',
    description: 'Interactive games and entertainment',
    color: '#00CED1'
  },
  info: {
    emoji: 'ℹ️',
    name: 'Information',
    description: 'Bot and server information commands',
    color: '#5865F2'
  },
  utility: {
    emoji: '🔧',
    name: 'Utility',
    description: 'Handy tools and utility commands',
    color: '#95A5A6'
  }
};

// Command examples for detailed help
const COMMAND_EXAMPLES = {
  ban: ['ban @user', 'ban @user spamming', 'ban @user raiding --delete'],
  kick: ['kick @user', 'kick @user breaking rules'],
  warn: ['warn @user', 'warn @user inappropriate language'],
  timeout: ['timeout @user 10m', 'timeout @user 1h spamming', 'timeout @user 1d'],
  purge: ['purge 50', 'purge 20 @user', 'purge 100'],
  play: ['play never gonna give you up', 'play https://youtube.com/watch?v=...', 'play lofi hip hop'],
  daily: ['daily'],
  balance: ['balance', 'balance @user'],
  level: ['level', 'level @user'],
  shop: ['shop', 'shop buy 1'],
  setbirthday: ['setbirthday 25 12', 'setbirthday 01 01'],
  giveaway: ['giveaway 1h 1 Discord Nitro', 'giveaway 24h 3 Steam Gift Card'],
  top: ['top coins', 'top level', 'top rep'],
  leaderboard: ['leaderboard coins', 'leaderboard level'],
  avatar: ['avatar', 'avatar @user'],
  poll: ['poll "Should we have movie night?"'],
  coinflip: ['coinflip heads 100', 'coinflip tails 500'],
  blackjack: ['blackjack 100', 'blackjack 1000'],
  slots: ['slots 50', 'slots 200'],
  automod: ['automod enable antispam', 'automod config antiraid', 'automod status'],
  feature: ['feature economy enable', 'feature gambling disable', 'feature list'],
  lockdown: ['lockdown', 'lockdown #channel', 'lockdown unlock'],
  verify: ['verify setup', 'verify panel', 'verify @user']
};

export default {
  name: 'help',
  description: 'Display all commands and information about the bot',
  usage: '[command | category]',
  category: 'info',
  aliases: ['h', 'commands', 'cmds', '?'],
  cooldown: 3,
  examples: ['help', 'help ban', 'help economy'],

  async execute(message, args, client) {
    const prefix = await getPrefix(message.guild.id);
    const guildData = await Guild.getGuild(message.guild.id);
    const disabledCommands = guildData?.textCommands?.disabledCommands || [];

    // If specific command or category is requested
    if (args[0]) {
      // Check if it's a category
      const categoryKey = args[0].toLowerCase();
      if (CATEGORY_INFO[categoryKey]) {
        const embed = await createCategoryEmbed(categoryKey, prefix, client, disabledCommands);
        return message.reply({ embeds: [embed] });
      }
      // Otherwise show command detail
      return showCommandDetail(message, args[0], prefix, client, disabledCommands);
    }

    // Show main help menu
    await showMainHelp(message, prefix, client, disabledCommands);
  }
};

async function showMainHelp(message, prefix, client, disabledCommands) {
  const embed = createMainHelpEmbed(message, prefix, client, disabledCommands);

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('help_category')
    .setPlaceholder('📚 Browse command categories...')
    .addOptions(
      Object.entries(CATEGORY_INFO).map(([key, info]) => ({
        label: info.name,
        description: `${COMMANDS_BY_CATEGORY[key].length} commands • ${info.description.slice(0, 50)}`,
        value: key,
        emoji: info.emoji
      }))
    );

  const row1 = new ActionRowBuilder().addComponents(selectMenu);

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('help_home')
      .setLabel('Home')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('🏠'),
    new ButtonBuilder()
      .setCustomId('help_slash')
      .setLabel('Slash Commands')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('⌨️'),
    new ButtonBuilder()
      .setCustomId('help_features')
      .setLabel('Features')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('✨'),
    new ButtonBuilder()
      .setLabel('Support')
      .setStyle(ButtonStyle.Link)
      .setURL('https://github.com/GhazanfarAteeb/jura-bot')
      .setEmoji('💬')
  );

  const reply = await message.reply({
    embeds: [embed],
    components: [row1, row2]
  });

  // Create collector
  const collector = reply.createMessageComponentCollector({
    filter: (i) => i.user.id === message.author.id,
    time: 300000 // 5 minutes
  });

  collector.on('collect', async (interaction) => {
    await interaction.deferUpdate();

    if (interaction.isStringSelectMenu()) {
      const category = interaction.values[0];
      const categoryEmbed = await createCategoryEmbed(category, prefix, interaction.client, disabledCommands);
      await interaction.editReply({ embeds: [categoryEmbed] });
    } else if (interaction.isButton()) {
      switch (interaction.customId) {
        case 'help_home': {
          const homeEmbed = createMainHelpEmbed(message, prefix, interaction.client, disabledCommands);
          await interaction.editReply({ embeds: [homeEmbed] });
          break;
        }
        case 'help_slash': {
          const slashEmbed = createSlashCommandsEmbed(prefix, interaction.client);
          await interaction.editReply({ embeds: [slashEmbed] });
          break;
        }
        case 'help_features': {
          const featuresEmbed = createFeaturesEmbed(prefix, interaction.client);
          await interaction.editReply({ embeds: [featuresEmbed] });
          break;
        }
      }
    }
  });

  collector.on('end', () => {
    const disabledRow1 = ActionRowBuilder.from(row1);
    const disabledRow2 = ActionRowBuilder.from(row2);
    disabledRow1.components[0].setDisabled(true);
    disabledRow2.components.forEach((btn, i) => {
      if (i < 3) btn.setDisabled(true); // Don't disable link button
    });
    reply.edit({ components: [disabledRow1, disabledRow2] }).catch(() => { });
  });
}

function createMainHelpEmbed(message, prefix, client, disabledCommands) {
  const totalCommands = client.commands.size;
  const categoryCount = Object.keys(CATEGORY_INFO).length;
  const enabledCommands = totalCommands - disabledCommands.length;

  const embed = new EmbedBuilder()
    .setColor(COLORS.PRIMARY)
    .setAuthor({
      name: `${client.user.username} Help Center`,
      iconURL: client.user.displayAvatarURL({ dynamic: true })
    })
    .setDescription(
      `${GLYPHS.SPARKLE} **Welcome to the Help Center!**\n\n` +
      `A feature-rich Discord bot with moderation, economy, music, and more!\n\n` +
      `${GLYPHS.ARROW_RIGHT} **Prefix:** \`${prefix}\`\n` +
      `${GLYPHS.ARROW_RIGHT} **Commands:** \`${enabledCommands}\` enabled / \`${totalCommands}\` total\n` +
      `${GLYPHS.ARROW_RIGHT} **Categories:** \`${categoryCount}\`\n\n` +
      `**Quick Start:**\n` +
      `• Use the dropdown menu below to browse categories\n` +
      `• Type \`${prefix}help <command>\` for command details\n` +
      `• Type \`${prefix}help <category>\` for category commands`
    )
    .setThumbnail(client.user.displayAvatarURL({ dynamic: true, size: 256 }));

  // Add category overview in a compact format
  const categories = Object.entries(CATEGORY_INFO);
  const leftColumn = categories.slice(0, Math.ceil(categories.length / 2));
  const rightColumn = categories.slice(Math.ceil(categories.length / 2));

  const formatCategory = ([key, info]) => {
    const count = COMMANDS_BY_CATEGORY[key].length;
    return `${info.emoji} **${info.name}** (${count})`;
  };

  embed.addFields(
    {
      name: '📂 Categories',
      value: leftColumn.map(formatCategory).join('\n'),
      inline: true
    },
    {
      name: '\u200b',
      value: rightColumn.map(formatCategory).join('\n'),
      inline: true
    }
  );

  // Quick tips
  embed.addFields({
    name: '💡 Tips',
    value:
      `• Commands with ⌨️ also work as slash commands\n` +
      `• Use \`${prefix}feature\` to enable/disable features\n` +
      `• Use \`${prefix}setup\` for quick server configuration`,
    inline: false
  });

  embed.setFooter({
    text: `Requested by ${message.author.displayName} • Use dropdown to navigate`,
    iconURL: message.author.displayAvatarURL({ dynamic: true })
  });
  embed.setTimestamp();

  return embed;
}

async function createCategoryEmbed(category, prefix, client, disabledCommands) {
  const info = CATEGORY_INFO[category];
  const commands = COMMANDS_BY_CATEGORY[category];

  const embed = new EmbedBuilder()
    .setColor(info.color || COLORS.PRIMARY)
    .setAuthor({
      name: `${info.emoji} ${info.name} Commands`,
      iconURL: client.user.displayAvatarURL({ dynamic: true })
    })
    .setDescription(
      `${info.description}\n\n` +
      `**Total:** ${commands.length} commands • ` +
      `Use \`${prefix}help <command>\` for details`
    );

  // Build command list with status indicators
  const commandList = commands.map(cmdName => {
    const cmd = client.commands.get(cmdName);
    const isDisabled = disabledCommands.includes(cmdName);
    const hasSlash = SLASH_COMMANDS.includes(cmdName);

    let indicators = '';
    if (hasSlash) indicators += ' ⌨️';
    if (isDisabled) indicators += ' 🔒';

    const name = isDisabled ? `~~${cmdName}~~` : `**${cmdName}**`;
    const desc = cmd?.description || 'No description';
    const shortDesc = desc.length > 40 ? desc.slice(0, 40) + '...' : desc;

    return `${GLYPHS.ARROW_RIGHT} ${name}${indicators}\n${GLYPHS.DOT} ${shortDesc}`;
  });

  // Split into chunks of 6 commands per field
  const chunkSize = 6;
  for (let i = 0; i < commandList.length; i += chunkSize) {
    const chunk = commandList.slice(i, i + chunkSize);
    const fieldName = i === 0 ? '📋 Commands' : '\u200b';
    embed.addFields({
      name: fieldName,
      value: chunk.join('\n'),
      inline: false
    });
  }

  // Legend
  embed.addFields({
    name: '📘 Legend',
    value: '⌨️ Has slash command • 🔒 Disabled',
    inline: false
  });

  embed.setFooter({
    text: `${info.name} Category • ${commands.length} commands`
  });
  embed.setTimestamp();

  return embed;
}

function createSlashCommandsEmbed(prefix, client) {
  const embed = new EmbedBuilder()
    .setColor('#5865F2')
    .setAuthor({
      name: '⌨️ Slash Commands',
      iconURL: client.user.displayAvatarURL({ dynamic: true })
    })
    .setDescription(
      `These commands can be used with \`/\` in Discord.\n` +
      `Slash commands provide autocomplete and validation.\n\n` +
      `**Tip:** Type \`/\` in chat to see all available slash commands!`
    );

  // Group slash commands by category
  const slashByCategory = {};
  for (const cmd of SLASH_COMMANDS) {
    for (const [category, commands] of Object.entries(COMMANDS_BY_CATEGORY)) {
      if (commands.includes(cmd)) {
        if (!slashByCategory[category]) slashByCategory[category] = [];
        slashByCategory[category].push(cmd);
        break;
      }
    }
  }

  for (const [category, commands] of Object.entries(slashByCategory)) {
    const info = CATEGORY_INFO[category];
    if (info && commands.length > 0) {
      embed.addFields({
        name: `${info.emoji} ${info.name}`,
        value: commands.map(c => `\`/${c}\``).join(' '),
        inline: true
      });
    }
  }

  embed.addFields({
    name: '💡 Note',
    value: `More slash commands coming soon!\nMost text commands work with the \`${prefix}\` prefix.`,
    inline: false
  });

  embed.setFooter({ text: `${SLASH_COMMANDS.length} slash commands available` });
  embed.setTimestamp();

  return embed;
}

function createFeaturesEmbed(prefix, client) {
  const embed = new EmbedBuilder()
    .setColor('#00D166')
    .setAuthor({
      name: '✨ Bot Features',
      iconURL: client.user.displayAvatarURL({ dynamic: true })
    })
    .setDescription(
      `Here's what this bot can do for your server!\n` +
      `Use \`${prefix}setup\` to get started quickly.`
    );

  const features = [
    {
      name: '🛡️ Moderation & AutoMod',
      value: 'Bans, kicks, warnings, timeouts, anti-spam, anti-raid, anti-nuke, bad word filter, and more.'
    },
    {
      name: '💰 Economy System',
      value: 'Daily rewards, coins, leveling, XP multipliers, profiles, backgrounds, and shop system.'
    },
    {
      name: '🎰 Gambling Games',
      value: 'Coinflip, slots, dice, roulette, and blackjack with customizable betting.'
    },
    {
      name: '🎵 Music Player',
      value: 'High-quality music from YouTube, Spotify, and more with queue management.'
    },
    {
      name: '🎉 Community Features',
      value: 'Birthdays, events, giveaways, starboard, tickets, and welcome messages.'
    },
    {
      name: '⚙️ Customization',
      value: 'Custom prefix, autoroles, reaction roles, color roles, and embed styling.'
    },
    {
      name: '📊 Logging',
      value: 'Message logs, member logs, moderation logs, and voice channel logs.'
    },
    {
      name: '🔒 Security',
      value: 'Verification system, anti-nuke protection, and permission management.'
    }
  ];

  for (const feature of features) {
    embed.addFields({
      name: feature.name,
      value: feature.value,
      inline: true
    });
  }

  embed.setFooter({ text: `Use ${prefix}help <category> to explore commands` });
  embed.setTimestamp();

  return embed;
}

async function showCommandDetail(message, commandName, prefix, client, disabledCommands) {
  const command = client.commands.get(commandName.toLowerCase()) ||
    client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName.toLowerCase()));

  if (!command) {
    const embed = new EmbedBuilder()
      .setColor(COLORS.ERROR)
      .setDescription(
        `${GLYPHS.ERROR} **Command not found:** \`${commandName}\`\n\n` +
        `${GLYPHS.ARROW_RIGHT} Use \`${prefix}help\` to see all available commands.\n` +
        `${GLYPHS.ARROW_RIGHT} Try \`${prefix}help <category>\` to browse by category.`
      );
    return message.reply({ embeds: [embed] });
  }

  const isDisabled = disabledCommands.includes(command.name);
  const hasSlash = SLASH_COMMANDS.includes(command.name);
  const categoryInfo = CATEGORY_INFO[command.category];

  const embed = new EmbedBuilder()
    .setColor(isDisabled ? COLORS.MUTED : (categoryInfo?.color || COLORS.PRIMARY))
    .setAuthor({
      name: `📖 Command: ${command.name}`,
      iconURL: client.user.displayAvatarURL({ dynamic: true })
    })
    .setDescription(
      (isDisabled ? `🔒 **This command is currently disabled**\n\n` : '') +
      (command.description || 'No description available.')
    );

  // Status badges
  const badges = [];
  if (hasSlash) badges.push('⌨️ Slash Command');
  if (isDisabled) badges.push('🔒 Disabled');
  if (command.cooldown) badges.push(`⏱️ ${command.cooldown}s cooldown`);

  if (badges.length > 0) {
    embed.addFields({
      name: '🏷️ Status',
      value: badges.join(' • '),
      inline: false
    });
  }

  // Usage
  const usage = command.usage ? `${prefix}${command.name} ${command.usage}` : `${prefix}${command.name}`;
  embed.addFields({
    name: '📝 Usage',
    value: `\`\`\`${usage}\`\`\``,
    inline: false
  });

  // Aliases
  if (command.aliases && command.aliases.length > 0) {
    embed.addFields({
      name: '🔀 Aliases',
      value: command.aliases.map(a => `\`${prefix}${a}\``).join(', '),
      inline: true
    });
  }

  // Category
  if (categoryInfo) {
    embed.addFields({
      name: '📂 Category',
      value: `${categoryInfo.emoji} ${categoryInfo.name}`,
      inline: true
    });
  }

  // Permissions
  if (command.permissions && command.permissions.length > 0) {
    embed.addFields({
      name: '🔒 Required Permissions',
      value: command.permissions.map(p => `\`${p}\``).join(', '),
      inline: false
    });
  }

  // Examples
  const examples = command.examples || COMMAND_EXAMPLES[command.name];
  if (examples && examples.length > 0) {
    const formattedExamples = examples.map(ex => {
      // If example already has prefix, use as is
      if (ex.startsWith(command.name)) {
        return `\`${prefix}${ex}\``;
      }
      return `\`${prefix}${ex}\``;
    });
    embed.addFields({
      name: '💡 Examples',
      value: formattedExamples.join('\n'),
      inline: false
    });
  }

  // Slash command tip
  if (hasSlash) {
    embed.addFields({
      name: '⌨️ Slash Command',
      value: `This command is also available as \`/${command.name}\``,
      inline: false
    });
  }

  embed.setFooter({
    text: `Use ${prefix}help for all commands`
  });
  embed.setTimestamp();

  // Add quick action buttons
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`help_category_${command.category}`)
      .setLabel(`View ${categoryInfo?.name || 'Category'}`)
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(categoryInfo?.emoji || '📂'),
    new ButtonBuilder()
      .setCustomId('help_home_detail')
      .setLabel('All Categories')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('🏠')
  );

  const reply = await message.reply({ embeds: [embed], components: [row] });

  const collector = reply.createMessageComponentCollector({
    filter: (i) => i.user.id === message.author.id,
    time: 60000
  });

  collector.on('collect', async (interaction) => {
    await interaction.deferUpdate();

    if (interaction.customId.startsWith('help_category_')) {
      const cat = interaction.customId.replace('help_category_', '');
      if (CATEGORY_INFO[cat]) {
        const catEmbed = await createCategoryEmbed(cat, prefix, client, disabledCommands);
        await interaction.editReply({ embeds: [catEmbed], components: [] });
      }
    } else if (interaction.customId === 'help_home_detail') {
      const mainEmbed = createMainHelpEmbed(message, prefix, client, disabledCommands);
      await interaction.editReply({ embeds: [mainEmbed], components: [] });
    }

    collector.stop();
  });

  collector.on('end', () => {
    row.components.forEach(btn => btn.setDisabled(true));
    reply.edit({ components: [row] }).catch(() => { });
  });
}
