import { PermissionFlagsBits, SlashCommandBuilder, ChannelType } from 'discord.js';
import Guild from '../../models/Guild.js';
import { successEmbed, errorEmbed, infoEmbed, GLYPHS } from '../../utils/embeds.js';
import { getPrefix } from '../../utils/helpers.js';

export default {
  name: 'automodignore',
  description: 'Configure automod ignore settings for channels and roles',
  usage: 'automodignore <add|remove|list> [channel|role] [#channel/@role]',
  category: 'config',
  aliases: ['amignore', 'automodexclude'],
  permissions: [PermissionFlagsBits.Administrator],
  cooldown: 3,

  slashCommand: true,
  data: new SlashCommandBuilder()
    .setName('automodignore')
    .setDescription('Configure automod ignore settings')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand =>
      subcommand
        .setName('add-channel')
        .setDescription('Add a channel to automod ignore list')
        .addChannelOption(option =>
          option.setName('channel')
            .setDescription('The channel to ignore')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove-channel')
        .setDescription('Remove a channel from automod ignore list')
        .addChannelOption(option =>
          option.setName('channel')
            .setDescription('The channel to stop ignoring')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('add-role')
        .setDescription('Add a role to automod bypass list')
        .addRoleOption(option =>
          option.setName('role')
            .setDescription('The role to bypass automod')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove-role')
        .setDescription('Remove a role from automod bypass list')
        .addRoleOption(option =>
          option.setName('role')
            .setDescription('The role to remove from bypass')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('List all automod ignore settings')),

  async execute(message, args) {
    const guildId = message.guild.id;
    const prefix = await getPrefix(guildId);

    // Show help if no args
    if (!args[0]) {
      return showHelp(message, prefix);
    }

    const action = args[0].toLowerCase();
    const type = args[1]?.toLowerCase();

    // List command
    if (action === 'list') {
      return listIgnored(message);
    }

    // Validate type for add/remove
    if (!['channel', 'role', 'channels', 'roles'].includes(type)) {
      return message.reply({
        embeds: [await errorEmbed(guildId, 'Invalid Type',
          `**Notice:** Please specify \`channel\` or \`role\`, Master.\n\n**Usage:** \`${prefix}automodignore <add|remove> <channel|role> <#channel/@role>\``)]
      });
    }

    const isChannel = ['channel', 'channels'].includes(type);

    // Get the target
    let target;
    if (isChannel) {
      target = message.mentions.channels.first() || message.guild.channels.cache.get(args[2]);
    } else {
      target = message.mentions.roles.first() || message.guild.roles.cache.get(args[2]);
    }

    if (!target) {
      return message.reply({
        embeds: [await errorEmbed(guildId, 'Target Required',
          `**Notice:** Please mention a ${isChannel ? 'channel' : 'role'}, Master.\n\n**Usage:** \`${prefix}automodignore ${action} ${type} ${isChannel ? '#channel' : '@role'}\``)]
      });
    }

    const guildConfig = await Guild.findOne({ guildId });

    if (action === 'add') {
      return addIgnored(message, guildConfig, target, isChannel);
    } else if (action === 'remove') {
      return removeIgnored(message, guildConfig, target, isChannel);
    } else {
      return showHelp(message, prefix);
    }
  },

  async executeSlash(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    if (subcommand === 'list') {
      return listIgnoredSlash(interaction);
    }

    const isChannel = subcommand.includes('channel');
    const isAdd = subcommand.includes('add');

    const target = isChannel
      ? interaction.options.getChannel('channel')
      : interaction.options.getRole('role');

    const guildConfig = await Guild.findOne({ guildId });

    if (isAdd) {
      return addIgnoredSlash(interaction, guildConfig, target, isChannel);
    } else {
      return removeIgnoredSlash(interaction, guildConfig, target, isChannel);
    }
  }
};

async function showHelp(message, prefix) {
  const embed = await infoEmbed(message.guild.id,
    '『 AutoMod Ignore Settings 』',
    `Configure channels and roles that bypass automod.\n\n` +
    `**Commands:**\n` +
    `${GLYPHS.DOT} \`${prefix}automodignore add channel #channel\` - Ignore a channel\n` +
    `${GLYPHS.DOT} \`${prefix}automodignore remove channel #channel\` - Stop ignoring a channel\n` +
    `${GLYPHS.DOT} \`${prefix}automodignore add role @role\` - Add role bypass\n` +
    `${GLYPHS.DOT} \`${prefix}automodignore remove role @role\` - Remove role bypass\n` +
    `${GLYPHS.DOT} \`${prefix}automodignore list\` - List all ignored channels/roles\n\n` +
    `**Note:** Ignored channels and bypass roles will not trigger any automod actions.`
  );

  return message.reply({ embeds: [embed] });
}

async function addIgnored(message, guildConfig, target, isChannel) {
  const guildId = message.guild.id;

  if (!guildConfig) {
    guildConfig = await Guild.create({ guildId });
  }

  if (!guildConfig.features) {
    guildConfig.features = {};
  }
  if (!guildConfig.features.autoMod) {
    guildConfig.features.autoMod = {};
  }

  const field = isChannel ? 'ignoredChannels' : 'ignoredRoles';
  if (!guildConfig.features.autoMod[field]) {
    guildConfig.features.autoMod[field] = [];
  }

  if (guildConfig.features.autoMod[field].includes(target.id)) {
    return message.reply({
      embeds: [await errorEmbed(guildId, 'Already Ignored',
        `**Notice:** ${target} is already in the automod ignore list, Master.`)]
    });
  }

  guildConfig.features.autoMod[field].push(target.id);
  await guildConfig.save();
  await Guild.invalidateCache(guildId);

  return message.reply({
    embeds: [await successEmbed(guildId, 'AutoMod Ignore Updated',
      `${GLYPHS.SUCCESS} Successfully added ${target} to the automod ${isChannel ? 'ignored channels' : 'bypass roles'} list, Master.\n\n` +
      `**Effect:** AutoMod will no longer monitor ${isChannel ? 'messages in this channel' : 'users with this role'}.`)]
  });
}

async function removeIgnored(message, guildConfig, target, isChannel) {
  const guildId = message.guild.id;

  if (!guildConfig?.features?.autoMod) {
    return message.reply({
      embeds: [await errorEmbed(guildId, 'Not Found',
        `**Notice:** No automod ignore settings found, Master.`)]
    });
  }

  const field = isChannel ? 'ignoredChannels' : 'ignoredRoles';
  const list = guildConfig.features.autoMod[field] || [];

  if (!list.includes(target.id)) {
    return message.reply({
      embeds: [await errorEmbed(guildId, 'Not Found',
        `**Notice:** ${target} is not in the automod ignore list, Master.`)]
    });
  }

  guildConfig.features.autoMod[field] = list.filter(id => id !== target.id);
  await guildConfig.save();
  await Guild.invalidateCache(guildId);

  return message.reply({
    embeds: [await successEmbed(guildId, 'AutoMod Ignore Updated',
      `${GLYPHS.SUCCESS} Successfully removed ${target} from the automod ${isChannel ? 'ignored channels' : 'bypass roles'} list, Master.\n\n` +
      `**Effect:** AutoMod will now monitor ${isChannel ? 'messages in this channel' : 'users with this role'}.`)]
  });
}

async function listIgnored(message) {
  const guildId = message.guild.id;
  const guildConfig = await Guild.findOne({ guildId });

  const ignoredChannels = guildConfig?.features?.autoMod?.ignoredChannels || [];
  const ignoredRoles = guildConfig?.features?.autoMod?.ignoredRoles || [];

  let description = '**Ignored Channels:**\n';
  if (ignoredChannels.length === 0) {
    description += `${GLYPHS.DOT} None\n`;
  } else {
    for (const channelId of ignoredChannels) {
      const channel = message.guild.channels.cache.get(channelId);
      description += `${GLYPHS.DOT} ${channel || `<#${channelId}> (deleted)`}\n`;
    }
  }

  description += '\n**Bypass Roles:**\n';
  if (ignoredRoles.length === 0) {
    description += `${GLYPHS.DOT} None\n`;
  } else {
    for (const roleId of ignoredRoles) {
      const role = message.guild.roles.cache.get(roleId);
      description += `${GLYPHS.DOT} ${role || `<@&${roleId}> (deleted)`}\n`;
    }
  }

  const embed = await infoEmbed(guildId,
    '『 AutoMod Ignore Settings 』',
    description
  );

  return message.reply({ embeds: [embed] });
}

// Slash command handlers
async function addIgnoredSlash(interaction, guildConfig, target, isChannel) {
  const guildId = interaction.guild.id;

  if (!guildConfig) {
    guildConfig = await Guild.create({ guildId });
  }

  if (!guildConfig.features) {
    guildConfig.features = {};
  }
  if (!guildConfig.features.autoMod) {
    guildConfig.features.autoMod = {};
  }

  const field = isChannel ? 'ignoredChannels' : 'ignoredRoles';
  if (!guildConfig.features.autoMod[field]) {
    guildConfig.features.autoMod[field] = [];
  }

  if (guildConfig.features.autoMod[field].includes(target.id)) {
    return interaction.reply({
      embeds: [await errorEmbed(guildId, 'Already Ignored',
        `${target} is already in the automod ignore list.`)],
      ephemeral: true
    });
  }

  guildConfig.features.autoMod[field].push(target.id);
  await guildConfig.save();
  await Guild.invalidateCache(guildId);

  return interaction.reply({
    embeds: [await successEmbed(guildId, 'AutoMod Ignore Updated',
      `${GLYPHS.SUCCESS} Successfully added ${target} to the automod ${isChannel ? 'ignored channels' : 'bypass roles'} list.\n\n` +
      `**Effect:** AutoMod will no longer monitor ${isChannel ? 'messages in this channel' : 'users with this role'}.`)]
  });
}

async function removeIgnoredSlash(interaction, guildConfig, target, isChannel) {
  const guildId = interaction.guild.id;

  if (!guildConfig?.features?.autoMod) {
    return interaction.reply({
      embeds: [await errorEmbed(guildId, 'Not Found',
        'No automod ignore settings found.')],
      ephemeral: true
    });
  }

  const field = isChannel ? 'ignoredChannels' : 'ignoredRoles';
  const list = guildConfig.features.autoMod[field] || [];

  if (!list.includes(target.id)) {
    return interaction.reply({
      embeds: [await errorEmbed(guildId, 'Not Found',
        `${target} is not in the automod ignore list.`)],
      ephemeral: true
    });
  }

  guildConfig.features.autoMod[field] = list.filter(id => id !== target.id);
  await guildConfig.save();
  await Guild.invalidateCache(guildId);

  return interaction.reply({
    embeds: [await successEmbed(guildId, 'AutoMod Ignore Updated',
      `${GLYPHS.SUCCESS} Successfully removed ${target} from the automod ${isChannel ? 'ignored channels' : 'bypass roles'} list.\n\n` +
      `**Effect:** AutoMod will now monitor ${isChannel ? 'messages in this channel' : 'users with this role'}.`)]
  });
}

async function listIgnoredSlash(interaction) {
  const guildId = interaction.guild.id;
  const guildConfig = await Guild.findOne({ guildId });

  const ignoredChannels = guildConfig?.features?.autoMod?.ignoredChannels || [];
  const ignoredRoles = guildConfig?.features?.autoMod?.ignoredRoles || [];

  let description = '**Ignored Channels:**\n';
  if (ignoredChannels.length === 0) {
    description += `${GLYPHS.DOT} None\n`;
  } else {
    for (const channelId of ignoredChannels) {
      const channel = interaction.guild.channels.cache.get(channelId);
      description += `${GLYPHS.DOT} ${channel || `<#${channelId}> (deleted)`}\n`;
    }
  }

  description += '\n**Bypass Roles:**\n';
  if (ignoredRoles.length === 0) {
    description += `${GLYPHS.DOT} None\n`;
  } else {
    for (const roleId of ignoredRoles) {
      const role = interaction.guild.roles.cache.get(roleId);
      description += `${GLYPHS.DOT} ${role || `<@&${roleId}> (deleted)`}\n`;
    }
  }

  const embed = await infoEmbed(guildId,
    '『 AutoMod Ignore Settings 』',
    description
  );

  return interaction.reply({ embeds: [embed] });
}
