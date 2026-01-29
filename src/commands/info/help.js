import { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { GLYPHS, COLORS } from '../../utils/embeds.js';
import { getPrefix } from '../../utils/helpers.js';
import { getRandomFooter, Raphael } from '../../utils/raphael.js';
import Guild from '../../models/Guild.js';

// Accurate command lists based on actual files
const COMMANDS_BY_CATEGORY = {
  admin: ['deployment', 'logs', 'award', 'botlogs', 'cleanup'],
  config: [
    'setup', 'config', 'feature', 'setprefix', 'setchannel', 'setrole', 'setcoin', 'setoverlay',
    'automod', 'automodignore', 'welcome', 'goodbye', 'boost', 'boostperks', 'antinuke', 'autopublish', 'autorole', 'cmdchannels',
    'manageshop', 'colorroles', 'levelroles', 'levelup', 'noxp', 'reactionroles', 'xpmultiplier', 'cleanup', 'logs', 'rules',
    'starboard', 'onboarding', 'birthdayconfig', 'fixlogs'
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
    'setbirthday', 'birthdays', 'removebirthday', 'birthdaypreference', 'birthdayconfig', 'mybirthday',
    'requestbirthday', 'approvebday', 'rejectbday', 'birthdayrequests', 'cancelbirthday',
    'createevent', 'events', 'joinevent', 'cancelevent', 'giveaway', 'starboard', 'confession'
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
  // Moderation
  'ban', 'kick', 'warn', 'timeout', 'purge', 'userhistory', 'untimeout', 'verify', 'lockdown',
  // Config
  'welcome', 'goodbye', 'boost', 'boostperks', 'autorole', 'noxp', 'automod', 'cmdchannels', 'logs', 'feature',
  'setrole', 'setchannel', 'config', 'setup', 'manageshop', 'setprefix', 'xpmultiplier',
  'levelroles', 'levelup', 'starboard', 'rules', 'autopublish', 'cleanup', 'onboarding',
  // Admin
  'giveaway', 'award', 'deployment', 'botlogs',
  // Music
  'play', 'pause', 'resume', 'skip', 'stop', 'queue', 'nowplaying', 'volume', 'shuffle', 'loop', 'seek', 'remove', 'clear', 'skipto',
  // Economy
  'balance', 'daily', 'level', 'profile', 'shop', 'inventory', 'rep', 'coinflip', 'slots', 'dice', 'roulette', 'blackjack', 'adventure',
  // Community
  'confession', 'birthday', 'event', 'starboard',
  // Info
  'help', 'ping', 'serverinfo', 'userinfo', 'channelinfo', 'roleinfo'
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
  // Moderation
  ban: ['ban @user', 'ban @user spamming', 'ban @user raiding --delete'],
  kick: ['kick @user', 'kick @user breaking rules'],
  warn: ['warn @user', 'warn @user inappropriate language'],
  timeout: ['timeout @user 10m', 'timeout @user 1h spamming', 'timeout @user 1d'],
  untimeout: ['untimeout @user'],
  purge: ['purge 50', 'purge 20 @user', 'purge 100'],
  lockdown: ['lockdown', 'lockdown #channel', 'lockdown unlock'],
  verify: ['verify setup', 'verify panel', 'verify manual @user', 'verify config type button', 'verify config role @Verified', 'verify config unverifiedrole @Unverified', 'verify config channel #verify', 'verify config enable', 'verify config disable', 'verify status'],
  userhistory: ['userhistory @user', 'userhistory 123456789'],
  
  // Music
  play: ['play never gonna give you up', 'play https://youtube.com/watch?v=...', 'play lofi hip hop'],
  skip: ['skip', 'skip 3'],
  volume: ['volume 50', 'volume 100'],
  seek: ['seek 1:30', 'seek 0:45'],
  loop: ['loop track', 'loop queue', 'loop off'],
  remove: ['remove 3'],
  skipto: ['skipto 5'],
  
  // Economy
  daily: ['daily'],
  balance: ['balance', 'balance @user'],
  level: ['level', 'level @user'],
  shop: ['shop', 'shop buy 1'],
  inventory: ['inventory', 'inventory @user'],
  profile: ['profile', 'profile @user'],
  setprofile: ['setprofile bio Hello world!', 'setprofile title Warrior'],
  setbackground: ['setbackground <url>', 'setbackground reset'],
  rep: ['rep @user'],
  claim: ['claim'],
  adventure: ['adventure'],
  
  // Gambling
  coinflip: ['coinflip heads 100', 'coinflip tails 500'],
  blackjack: ['blackjack 100', 'blackjack 1000'],
  slots: ['slots 50', 'slots 200'],
  dice: ['dice 100', 'dice 500 high'],
  roulette: ['roulette 100 red', 'roulette 500 black', 'roulette 200 7'],
  
  // Config - AutoMod
  automod: ['automod enable', 'automod disable', 'automod status', 'automod badwords add word1,word2', 'automod antispam on', 'automod antiraid on'],
  automodignore: ['automodignore add channel #general', 'automodignore remove channel #general', 'automodignore add role @Moderator', 'automodignore list'],
  antinuke: ['antinuke enable', 'antinuke disable', 'antinuke whitelist @user', 'antinuke status'],
  
  // Config - Welcome/Goodbye
  welcome: ['welcome enable', 'welcome disable', 'welcome channel #welcome', 'welcome message Welcome {user} to {server}!', 'welcome title ✦ Welcome ✦', 'welcome color #5432A6', 'welcome image <url>', 'welcome thumbnail avatar', 'welcome author username', 'welcome mention on', 'welcome greet Hey {user}!', 'welcome role @Member', 'welcome status', 'welcome test', 'welcome reset'],
  goodbye: ['goodbye enable', 'goodbye disable', 'goodbye channel #goodbye', 'goodbye message Goodbye {user}!', 'goodbye status', 'goodbye test', 'goodbye reset'],
  
  // Config - Boost
  boost: ['boost status', 'boost channel #boosts', 'boost message Thanks {user} for boosting!', 'boost title 💎 New Booster!', 'boost color #f47fff', 'boost embed on', 'boost mention on', 'boost image <url>', 'boost thumbnail avatar', 'boost author username', 'boost test', 'boost preview', 'boost reset', 'boost role @BoosterRole', 'boost give @user', 'boost take @user', 'boost duration 24', 'boost list', 'boost addtier 1 @Tier1Role', 'boost removetier 1', 'boost listtiers', 'boost cleartiers'],
  boostperks: ['boostperks status', 'boostperks channel #perks', 'boostperks message Check out our booster perks!', 'boostperks title 💎 Booster Perks', 'boostperks color #f47fff', 'boostperks image <url>', 'boostperks preview', 'boostperks publish', 'boostperks reset'],
  
  // Config - Auto Role
  autorole: ['autorole enable', 'autorole disable', 'autorole add @Member', 'autorole remove @Member', 'autorole delay 5', 'autorole bot add @BotRole', 'autorole bot remove @BotRole', 'autorole list'],
  
  // Config - Logs
  logs: ['logs', 'logs set mod #mod-logs', 'logs set message #message-logs', 'logs set voice #voice-logs', 'logs set member #member-logs', 'logs set server #server-logs', 'logs set join #join-logs', 'logs set leave #leave-logs', 'logs set alert #alert-logs', 'logs disable mod', 'logs all #all-logs', 'logs list'],
  
  // Config - Levels
  levelroles: ['levelroles add 5 @Level5', 'levelroles remove 5', 'levelroles list'],
  levelup: ['levelup channel #level-up', 'levelup message Congrats {user}! Level {level}!', 'levelup status'],
  noxp: ['noxp add #channel', 'noxp remove #channel', 'noxp list', 'noxp clear'],
  xpmultiplier: ['xpmultiplier set @Booster 1.5', 'xpmultiplier remove @Booster', 'xpmultiplier list'],
  
  // Config - Other
  setoverlay: ['setoverlay color #FF5733', 'setoverlay opacity 0.7', 'setoverlay color #000000 opacity 0.5', 'setoverlay reset'],
  feature: ['feature economy enable', 'feature gambling disable', 'feature aichat enable', 'feature boost enable', 'feature list'],
  setup: ['setup'],
  config: ['config prefix !', 'config status'],
  setprefix: ['setprefix !', 'setprefix ?'],
  setchannel: ['setchannel modlog #mod-logs', 'setchannel welcome #welcome'],
  setrole: ['setrole admin @Admin', 'setrole mod @Moderator', 'setrole muted @Muted'],
  cmdchannels: ['cmdchannels add economy #bot-commands', 'cmdchannels remove economy #bot-commands', 'cmdchannels list'],
  colorroles: ['colorroles setup #color-roles', 'colorroles list'],
  reactionroles: ['reactionroles create', 'reactionroles add', 'reactionroles list'],
  starboard: ['starboard channel #starboard', 'starboard threshold 3', 'starboard status'],
  rules: ['rules set 1 No spamming', 'rules remove 5', 'rules list', 'rules post #rules'],
  manageshop: ['manageshop add "Cool Badge" 1000 badge', 'manageshop remove 1', 'manageshop list'],
  
  // Community - Birthdays
  setbirthday: ['setbirthday 25 12', 'setbirthday 01 01 2000'],
  mybirthday: ['mybirthday'],
  birthdays: ['birthdays', 'birthdays january'],
  removebirthday: ['removebirthday @user'],
  cancelbirthday: ['cancelbirthday'],
  birthdaypreference: ['birthdaypreference dm on', 'birthdaypreference ping off'],
  birthdayconfig: ['birthdayconfig channel #birthdays', 'birthdayconfig role @Birthday', 'birthdayconfig message Happy Birthday {user}!', 'birthdayconfig status'],
  requestbirthday: ['requestbirthday 25 12'],
  approvebday: ['approvebday @user'],
  rejectbday: ['rejectbday @user'],
  birthdayrequests: ['birthdayrequests'],
  
  // Community - Events & Giveaways
  giveaway: ['giveaway 1h 1 Discord Nitro', 'giveaway 24h 3 Steam Gift Card'],
  createevent: ['createevent "Movie Night" 2h Join us for a movie!'],
  events: ['events'],
  joinevent: ['joinevent 1'],
  cancelevent: ['cancelevent 1'],
  confession: ['confession I love this server'],
  
  // Utility
  top: ['top coins', 'top level', 'top rep'],
  leaderboard: ['leaderboard coins', 'leaderboard level'],
  avatar: ['avatar', 'avatar @user'],
  banner: ['banner', 'banner @user'],
  poll: ['poll "Should we have movie night?"', 'poll "Best color?" Red Blue Green'],
  afk: ['afk', 'afk brb dinner'],
  remind: ['remind 1h Check the oven', 'remind 30m Meeting'],
  tempvc: ['tempvc create Gaming', 'tempvc limit 5', 'tempvc rename Chill Zone'],
  ticket: ['ticket create', 'ticket close', 'ticket add @user'],
  embed: ['embed create', 'embed edit <messageId>'],
  steal: ['steal :emoji:'],
  
  // Info
  help: ['help', 'help ban', 'help economy', 'help config'],
  serverinfo: ['serverinfo'],
  userinfo: ['userinfo', 'userinfo @user'],
  roleinfo: ['roleinfo @Role'],
  channelinfo: ['channelinfo #channel'],
  checkuser: ['checkuser @user', 'checkuser 123456789'],
  ping: ['ping'],
  
  // Social
  marry: ['marry @user'],
  divorce: ['divorce'],
  badges: ['badges', 'badges @user'],
  
  // Fun
  tictactoe: ['tictactoe @user'],
  trivia: ['trivia', 'trivia science'],
  meme: ['meme'],
  gif: ['gif cat', 'gif dance'],
  
  // AI Chat
  aichat: ['@Raphael hello!', '@Raphael what is the weather?', 'Reply to bot messages']
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
    .setPlaceholder('◈ Select a skill category, Master...')
    .addOptions(
      Object.entries(CATEGORY_INFO).map(([key, info]) => ({
        label: info.name,
        description: `${COMMANDS_BY_CATEGORY[key].length} skills • ${info.description.slice(0, 50)}`,
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
    .setColor('#00CED1')
    .setAuthor({
      name: `『 Raphael • Skill Archive 』`,
      iconURL: client.user.displayAvatarURL({ dynamic: true })
    })
    .setDescription(
      `**Answer:** I am Raphael, the Ultimate Skill serving as your assistant, Master.\n\n` +
      `I possess numerous capabilities to aid you. Below is a summary of my available functions.\n\n` +
      `▸ **Activation Prefix:** \`${prefix}\`\n` +
      `▸ **Available Skills:** \`${enabledCommands}\` active / \`${totalCommands}\` total\n` +
      `▸ **Skill Categories:** \`${categoryCount}\`\n\n` +
      `**Quick Reference:**\n` +
      `◈ Use the selection menu below to browse categories\n` +
      `◈ Command \`${prefix}help <skill>\` for detailed analysis\n` +
      `◈ Command \`${prefix}help <category>\` for category overview`
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
      name: '◈ Skill Categories',
      value: leftColumn.map(formatCategory).join('\n'),
      inline: true
    },
    {
      name: '\u200b',
      value: rightColumn.map(formatCategory).join('\n'),
      inline: true
    }
  );

  // Quick tips - Raphael style
  embed.addFields({
    name: '◈ Advisory',
    value:
      `◇ Skills marked with ⌨️ support slash command activation\n` +
      `◇ Use \`${prefix}feature\` to toggle system modules\n` +
      `◇ Use \`${prefix}setup\` for initial configuration protocol`,
    inline: false
  });

  embed.setFooter({
    text: `${getRandomFooter()} • Requested by ${message.author.displayName}`,
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
      `**Total Skills:** ${commands.length} • ` +
      `Use \`${prefix}help <skill>\` for detailed analysis`
    );

  // Build command list with status indicators - Raphael style
  const commandList = commands.map(cmdName => {
    const cmd = client.commands.get(cmdName);
    const isDisabled = disabledCommands.includes(cmdName);
    const hasSlash = SLASH_COMMANDS.includes(cmdName);

    let indicators = '';
    if (hasSlash) indicators += ' ⌨️';
    if (isDisabled) indicators += ' ○';

    const name = isDisabled ? `~~${cmdName}~~` : `**${cmdName}**`;
    const desc = cmd?.description || 'No description available';
    const shortDesc = desc.length > 40 ? desc.slice(0, 40) + '...' : desc;

    return `▸ ${name}${indicators}\n◇ ${shortDesc}`;
  });

  // Split into chunks of 6 commands per field
  const chunkSize = 6;
  for (let i = 0; i < commandList.length; i += chunkSize) {
    const chunk = commandList.slice(i, i + chunkSize);
    const fieldName = i === 0 ? '◈ Available Skills' : '\u200b';
    embed.addFields({
      name: fieldName,
      value: chunk.join('\n'),
      inline: false
    });
  }

  // Legend - Raphael style
  embed.addFields({
    name: '◈ Status Indicators',
    value: '⌨️ Slash command compatible • ○ Currently deactivated',
    inline: false
  });

  embed.setFooter({
    text: `${getRandomFooter()} • ${info.name} • ${commands.length} skills`
  });
  embed.setTimestamp();

  return embed;
}

function createSlashCommandsEmbed(prefix, client) {
  const embed = new EmbedBuilder()
    .setColor('#00CED1')
    .setAuthor({
      name: '『 Slash Command Registry 』',
      iconURL: client.user.displayAvatarURL({ dynamic: true })
    })
    .setDescription(
      `**Analysis:** These skills support slash command activation.\n\n` +
      `Slash commands provide enhanced input validation and autocomplete functionality.\n\n` +
      `*Tip: Input \`/\` in the chat interface to view all available slash commands, Master.*`
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
    name: '◈ Notice',
    value: `Additional slash commands are being developed.\nMost skills remain accessible via the \`${prefix}\` prefix.`,
    inline: false
  });

  embed.setFooter({ text: `${getRandomFooter()} • ${SLASH_COMMANDS.length} slash commands registered` });
  embed.setTimestamp();

  return embed;
}

function createFeaturesEmbed(prefix, client) {
  const embed = new EmbedBuilder()
    .setColor('#00CED1')
    .setAuthor({
      name: '『 System Capabilities 』',
      iconURL: client.user.displayAvatarURL({ dynamic: true })
    })
    .setDescription(
      `**Report:** The following modules are available for this server.\n\n` +
      `Use \`${prefix}setup\` to initiate configuration protocol.`
    );

  const features = [
    {
      name: '▸ Moderation & AutoMod',
      value: 'Bans, kicks, warnings, timeouts, anti-spam, anti-raid, anti-nuke, bad word filter, and more.'
    },
    {
      name: '▸ Economy System',
      value: 'Daily rewards, coins, leveling, XP multipliers, profiles, backgrounds, and shop system.'
    },
    {
      name: '▸ Gambling Games',
      value: 'Coinflip, slots, dice, roulette, and blackjack with customizable betting.'
    },
    {
      name: '▸ Music Player',
      value: 'High-quality music from YouTube, Spotify, and more with queue management.'
    },
    {
      name: '▸ Community Features',
      value: 'Birthdays, events, giveaways, starboard, tickets, and welcome messages.'
    },
    {
      name: '▸ Customization',
      value: 'Custom prefix, autoroles, reaction roles, color roles, and embed styling.'
    },
    {
      name: '▸ Logging',
      value: 'Message logs, member logs, moderation logs, and voice channel logs.'
    },
    {
      name: '▸ Security',
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
      name: `『 Skill Analysis: ${command.name} 』`,
      iconURL: client.user.displayAvatarURL({ dynamic: true })
    })
    .setDescription(
      (isDisabled ? `**Warning:** This skill is currently deactivated.\n\n` : '') +
      `**Analysis:** ${command.description || 'No analysis data available.'}`
    );

  // Status badges
  const badges = [];
  if (hasSlash) badges.push('⌨️ Slash');
  if (isDisabled) badges.push('◎ Deactivated');
  if (command.cooldown) badges.push(`◈ ${command.cooldown}s cooldown`);

  if (badges.length > 0) {
    embed.addFields({
      name: '▸ Status Indicators',
      value: badges.join(' • '),
      inline: false
    });
  }

  // Usage
  const usage = command.usage ? `${prefix}${command.name} ${command.usage}` : `${prefix}${command.name}`;
  embed.addFields({
    name: '▸ Activation Syntax',
    value: `\`\`\`${usage}\`\`\``,
    inline: false
  });

  // Aliases
  if (command.aliases && command.aliases.length > 0) {
    embed.addFields({
      name: '▸ Alternative Triggers',
      value: command.aliases.map(a => `\`${prefix}${a}\``).join(', '),
      inline: true
    });
  }

  // Category
  if (categoryInfo) {
    embed.addFields({
      name: '▸ Classification',
      value: `${categoryInfo.emoji} ${categoryInfo.name}`,
      inline: true
    });
  }

  // Permissions
  if (command.permissions && command.permissions.length > 0) {
    embed.addFields({
      name: '▸ Required Authorization',
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
      name: '▸ Usage Examples',
      value: formattedExamples.join('\n'),
      inline: false
    });
  }

  // Slash command tip
  if (hasSlash) {
    embed.addFields({
      name: '▸ Slash Command',
      value: `This skill also responds to \`/${command.name}\`, Master.`,
      inline: false
    });
  }

  embed.setFooter({
    text: `${getRandomFooter()} • Use ${prefix}help for skill archive`
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
