import { PermissionFlagsBits, EmbedBuilder, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import Guild from '../../models/Guild.js';
import { successEmbed, errorEmbed, infoEmbed, GLYPHS } from '../../utils/embeds.js';
import { hasModPerms, getPrefix } from '../../utils/helpers.js';

export default {
  name: 'rules',
  description: 'Send server rules to a channel',
  usage: '<send|set|add|remove|list|preview|channel|title|color|footer|image>',
  aliases: ['serverrules'],
  permissions: [PermissionFlagsBits.ManageGuild],
  cooldown: 5,

  async execute(message, args) {
    const guildConfig = await Guild.getGuild(message.guild.id, message.guild.name);
    const prefix = await getPrefix(message.guild.id);

    // Check for moderator permissions
    if (!hasModPerms(message.member, guildConfig)) {
      return message.reply({
        embeds: [await errorEmbed(message.guild.id, 'Permission Denied',
          `${GLYPHS.LOCK} You need Moderator/Staff permissions to manage rules.`)]
      });
    }

    if (!args[0]) {
      return showStatus(message, guildConfig, prefix);
    }

    const action = args[0].toLowerCase();

    switch (action) {
      case 'send':
      case 'post':
        return sendRules(message, args.slice(1), guildConfig, prefix);

      case 'set':
        return setAllRules(message, args.slice(1), guildConfig, prefix);

      case 'add':
        return addRule(message, args.slice(1), guildConfig, prefix);

      case 'remove':
      case 'delete':
        return removeRule(message, args.slice(1), guildConfig, prefix);

      case 'edit':
        return editRule(message, args.slice(1), guildConfig, prefix);

      case 'list':
        return listRules(message, guildConfig, prefix);

      case 'preview':
        return previewRules(message, guildConfig, prefix);

      case 'channel':
        return setChannel(message, args.slice(1), prefix);

      case 'title':
        return setTitle(message, args.slice(1), guildConfig, prefix);

      case 'color':
        return setColor(message, args.slice(1), guildConfig, prefix);

      case 'footer':
        return setFooter(message, args.slice(1), guildConfig, prefix);

      case 'image':
      case 'banner':
        return setBanner(message, args.slice(1), guildConfig, prefix);

      case 'clear':
        return clearRules(message, prefix);

      case 'help':
        return showHelp(message, prefix);

      default:
        return message.reply({
          embeds: [await errorEmbed(message.guild.id, 'Unknown Option',
            `Unknown option: \`${action}\`\n\nUse \`${prefix}rules help\` for available commands.`)]
        });
    }
  }
};

async function showStatus(message, guildConfig, prefix) {
  const rulesConfig = guildConfig.rulesSystem || {};
  const rules = rulesConfig.rules || [];
  const channel = rulesConfig.channel ? message.guild.channels.cache.get(rulesConfig.channel) : null;

  const embed = new EmbedBuilder()
    .setColor(rulesConfig.embedColor || '#5865F2')
    .setTitle('📜 Server Rules System')
    .setDescription('Create and send server rules to any channel!')
    .addFields(
      { name: '▸ Rules Count', value: `\`${rules.length} rules\``, inline: true },
      { name: '▸ Default Channel', value: channel ? `${channel}` : '`Not set`', inline: true },
      { name: '▸ Title', value: `\`${rulesConfig.title || 'Server Rules'}\``, inline: true }
    )
    .addFields(
      { name: '📝 Commands', value:
        `\`${prefix}rules add <rule>\` - Add a new rule\n` +
        `\`${prefix}rules remove <#>\` - Remove a rule\n` +
        `\`${prefix}rules list\` - View all rules\n` +
        `\`${prefix}rules preview\` - Preview the embed\n` +
        `\`${prefix}rules send [#channel]\` - Send rules\n` +
        `\`${prefix}rules help\` - All options`, inline: false }
    )
    .setFooter({ text: `Use ${prefix}rules help for all customization options` });

  return message.reply({ embeds: [embed] });
}

async function showHelp(message, prefix) {
  const embed = new EmbedBuilder()
    .setColor('#5865F2')
    .setTitle('📜 Rules Command Help')
    .setDescription('All available commands for managing server rules.')
    .addFields(
      { name: '📋 Rule Management', value:
        `\`${prefix}rules add <rule>\` - Add a new rule\n` +
        `\`${prefix}rules remove <number>\` - Remove a rule by number\n` +
        `\`${prefix}rules edit <number> <new text>\` - Edit a rule\n` +
        `\`${prefix}rules set <rule1 | rule2 | ...>\` - Set all rules at once\n` +
        `\`${prefix}rules list\` - View all current rules\n` +
        `\`${prefix}rules clear\` - Remove all rules`, inline: false },
      { name: '🎨 Customization', value:
        `\`${prefix}rules title <text>\` - Set embed title\n` +
        `\`${prefix}rules color #hex\` - Set embed color\n` +
        `\`${prefix}rules footer <text>\` - Set embed footer\n` +
        `\`${prefix}rules image <url>\` - Set banner image\n` +
        `\`${prefix}rules channel #channel\` - Set default channel`, inline: false },
      { name: '📤 Sending', value:
        `\`${prefix}rules preview\` - Preview rules in current channel\n` +
        `\`${prefix}rules send\` - Send to default channel\n` +
        `\`${prefix}rules send #channel\` - Send to specific channel`, inline: false }
    )
    .addFields(
      { name: '💡 Tips', value:
        `• Use \`|\` to separate multiple rules with \`${prefix}rules set\`\n` +
        `• Rule numbers start at 1\n` +
        `• Use \`\\n\` for line breaks within a rule`, inline: false }
    );

  return message.reply({ embeds: [embed] });
}

async function addRule(message, args, guildConfig, prefix) {
  const ruleText = args.join(' ');

  if (!ruleText) {
    return message.reply({
      embeds: [await errorEmbed(message.guild.id, 'Missing Rule',
        `Please provide the rule text.\n\n**Usage:** \`${prefix}rules add <rule text>\``)]
    });
  }

  await Guild.updateGuild(message.guild.id, {
    $push: { 'rulesSystem.rules': ruleText }
  });

  const currentRules = guildConfig.rulesSystem?.rules || [];
  const newNumber = currentRules.length + 1;

  return message.reply({
    embeds: [await successEmbed(message.guild.id, 'Rule Added',
      `${GLYPHS.SUCCESS} Rule #${newNumber} has been added:\n\n**${newNumber}.** ${ruleText}`)]
  });
}

async function removeRule(message, args, guildConfig, prefix) {
  const ruleNum = parseInt(args[0]);
  const rules = guildConfig.rulesSystem?.rules || [];

  if (!ruleNum || isNaN(ruleNum)) {
    return message.reply({
      embeds: [await errorEmbed(message.guild.id, 'Invalid Number',
        `Please provide a valid rule number.\n\n**Usage:** \`${prefix}rules remove <number>\``)]
    });
  }

  if (ruleNum < 1 || ruleNum > rules.length) {
    return message.reply({
      embeds: [await errorEmbed(message.guild.id, 'Invalid Rule Number',
        `Rule #${ruleNum} does not exist. You have ${rules.length} rules.`)]
    });
  }

  const removedRule = rules[ruleNum - 1];
  const newRules = rules.filter((_, index) => index !== ruleNum - 1);

  await Guild.updateGuild(message.guild.id, {
    $set: { 'rulesSystem.rules': newRules }
  });

  return message.reply({
    embeds: [await successEmbed(message.guild.id, 'Rule Removed',
      `${GLYPHS.SUCCESS} Rule #${ruleNum} has been removed:\n\n~~${removedRule}~~`)]
  });
}

async function editRule(message, args, guildConfig, prefix) {
  const ruleNum = parseInt(args[0]);
  const newText = args.slice(1).join(' ');
  const rules = guildConfig.rulesSystem?.rules || [];

  if (!ruleNum || isNaN(ruleNum)) {
    return message.reply({
      embeds: [await errorEmbed(message.guild.id, 'Invalid Number',
        `Please provide a valid rule number.\n\n**Usage:** \`${prefix}rules edit <number> <new text>\``)]
    });
  }

  if (!newText) {
    return message.reply({
      embeds: [await errorEmbed(message.guild.id, 'Missing Text',
        `Please provide the new rule text.\n\n**Usage:** \`${prefix}rules edit <number> <new text>\``)]
    });
  }

  if (ruleNum < 1 || ruleNum > rules.length) {
    return message.reply({
      embeds: [await errorEmbed(message.guild.id, 'Invalid Rule Number',
        `Rule #${ruleNum} does not exist. You have ${rules.length} rules.`)]
    });
  }

  const newRules = [...rules];
  newRules[ruleNum - 1] = newText;

  await Guild.updateGuild(message.guild.id, {
    $set: { 'rulesSystem.rules': newRules }
  });

  return message.reply({
    embeds: [await successEmbed(message.guild.id, 'Rule Updated',
      `${GLYPHS.SUCCESS} Rule #${ruleNum} has been updated:\n\n**${ruleNum}.** ${newText}`)]
  });
}

async function setAllRules(message, args, guildConfig, prefix) {
  const rulesText = args.join(' ');

  if (!rulesText) {
    return message.reply({
      embeds: [await infoEmbed(message.guild.id, 'Set All Rules',
        `Set multiple rules at once by separating them with \`|\`\n\n` +
        `**Usage:**\n\`${prefix}rules set Rule 1 | Rule 2 | Rule 3\`\n\n` +
        `**Example:**\n\`${prefix}rules set Be respectful | No spam | No NSFW\``)]
    });
  }

  const rules = rulesText.split('|').map(r => r.trim()).filter(r => r.length > 0);

  if (rules.length === 0) {
    return message.reply({
      embeds: [await errorEmbed(message.guild.id, 'No Rules',
        'No valid rules found. Make sure to separate rules with `|`')]
    });
  }

  await Guild.updateGuild(message.guild.id, {
    $set: { 'rulesSystem.rules': rules }
  });

  const rulesList = rules.map((r, i) => `**${i + 1}.** ${r}`).join('\n');

  return message.reply({
    embeds: [await successEmbed(message.guild.id, 'Rules Set',
      `${GLYPHS.SUCCESS} Set ${rules.length} rules:\n\n${rulesList}`)]
  });
}

async function listRules(message, guildConfig, prefix) {
  const rules = guildConfig.rulesSystem?.rules || [];

  if (rules.length === 0) {
    return message.reply({
      embeds: [await infoEmbed(message.guild.id, 'No Rules',
        `No rules have been set yet.\n\nUse \`${prefix}rules add <rule>\` to add rules.`)]
    });
  }

  const rulesList = rules.map((r, i) => `**${i + 1}.** ${r}`).join('\n\n');

  const embed = new EmbedBuilder()
    .setColor(guildConfig.rulesSystem?.embedColor || '#5865F2')
    .setTitle('📜 Current Rules')
    .setDescription(rulesList)
    .setFooter({ text: `${rules.length} rules total • Use ${prefix}rules edit <#> <text> to modify` });

  return message.reply({ embeds: [embed] });
}

async function clearRules(message, prefix) {
  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('rules_clear_confirm')
        .setLabel('Yes, clear all')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('rules_clear_cancel')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Secondary)
    );

  const response = await message.reply({
    embeds: [await errorEmbed(message.guild.id, 'Confirm Clear',
      '⚠️ Are you sure you want to delete ALL rules?\n\nThis action cannot be undone.')],
    components: [row]
  });

  try {
    const interaction = await response.awaitMessageComponent({
      filter: i => i.user.id === message.author.id,
      time: 30000
    });

    if (interaction.customId === 'rules_clear_confirm') {
      await Guild.updateGuild(message.guild.id, {
        $set: { 'rulesSystem.rules': [] }
      });

      await interaction.update({
        embeds: [await successEmbed(message.guild.id, 'Rules Cleared',
          `${GLYPHS.SUCCESS} All rules have been deleted.`)],
        components: []
      });
    } else {
      await interaction.update({
        embeds: [await infoEmbed(message.guild.id, 'Cancelled',
          'Rule deletion cancelled.')],
        components: []
      });
    }
  } catch (error) {
    await response.edit({
      embeds: [await infoEmbed(message.guild.id, 'Timed Out',
        'Confirmation timed out. Rules were not deleted.')],
      components: []
    });
  }
}

async function previewRules(message, guildConfig, prefix) {
  const rules = guildConfig.rulesSystem?.rules || [];

  if (rules.length === 0) {
    return message.reply({
      embeds: [await errorEmbed(message.guild.id, 'No Rules',
        `No rules have been set yet.\n\nUse \`${prefix}rules add <rule>\` to add rules.`)]
    });
  }

  const embed = buildRulesEmbed(guildConfig, message.guild);

  await message.reply({
    embeds: [await infoEmbed(message.guild.id, 'Preview',
      'Here\'s how your rules will look:')]
  });

  return message.channel.send({ embeds: [embed] });
}

async function sendRules(message, args, guildConfig, prefix) {
  const rules = guildConfig.rulesSystem?.rules || [];

  if (rules.length === 0) {
    return message.reply({
      embeds: [await errorEmbed(message.guild.id, 'No Rules',
        `No rules have been set yet.\n\nUse \`${prefix}rules add <rule>\` to add rules first.`)]
    });
  }

  // Get channel from mention, arg, or config
  let channel = message.mentions.channels.first() ||
    message.guild.channels.cache.get(args[0]);

  if (!channel && guildConfig.rulesSystem?.channel) {
    channel = message.guild.channels.cache.get(guildConfig.rulesSystem.channel);
  }

  if (!channel) {
    channel = message.channel;
  }

  if (channel.type !== ChannelType.GuildText) {
    return message.reply({
      embeds: [await errorEmbed(message.guild.id, 'Invalid Channel',
        'Please select a text channel.')]
    });
  }

  const embed = buildRulesEmbed(guildConfig, message.guild);

  await channel.send({ embeds: [embed] });

  if (channel.id !== message.channel.id) {
    return message.reply({
      embeds: [await successEmbed(message.guild.id, 'Rules Sent',
        `${GLYPHS.SUCCESS} Rules have been sent to ${channel}`)]
    });
  }
}

async function setChannel(message, args, prefix) {
  const channel = message.mentions.channels.first() ||
    message.guild.channels.cache.get(args[0]);

  if (!channel) {
    return message.reply({
      embeds: [await errorEmbed(message.guild.id, 'No Channel',
        `Please mention a channel or provide a channel ID.\n\n**Usage:** \`${prefix}rules channel #channel\``)]
    });
  }

  if (channel.type !== ChannelType.GuildText) {
    return message.reply({
      embeds: [await errorEmbed(message.guild.id, 'Invalid Channel',
        'Please select a text channel.')]
    });
  }

  await Guild.updateGuild(message.guild.id, {
    $set: { 'rulesSystem.channel': channel.id }
  });

  return message.reply({
    embeds: [await successEmbed(message.guild.id, 'Channel Set',
      `${GLYPHS.SUCCESS} Default rules channel set to ${channel}`)]
  });
}

async function setTitle(message, args, guildConfig, prefix) {
  const title = args.join(' ');

  if (!title) {
    return message.reply({
      embeds: [await infoEmbed(message.guild.id, 'Embed Title',
        `**Current Title:**\n${guildConfig.rulesSystem?.title || '📜 Server Rules'}\n\n` +
        `**Usage:**\n\`${prefix}rules title <text>\` - Set custom title\n` +
        `\`${prefix}rules title reset\` - Reset to default`)]
    });
  }

  if (title === 'reset' || title === 'default') {
    await Guild.updateGuild(message.guild.id, {
      $set: { 'rulesSystem.title': null }
    });
    return message.reply({
      embeds: [await successEmbed(message.guild.id, 'Title Reset',
        `${GLYPHS.SUCCESS} Rules title reset to default.`)]
    });
  }

  await Guild.updateGuild(message.guild.id, {
    $set: { 'rulesSystem.title': title }
  });

  return message.reply({
    embeds: [await successEmbed(message.guild.id, 'Title Set',
      `${GLYPHS.SUCCESS} Rules title set to: ${title}`)]
  });
}

async function setColor(message, args, guildConfig, prefix) {
  const colorHex = args[0];

  if (!colorHex) {
    return message.reply({
      embeds: [await infoEmbed(message.guild.id, 'Embed Color',
        `**Current Color:**\n${guildConfig.rulesSystem?.embedColor || '#5865F2'}\n\n` +
        `**Usage:**\n\`${prefix}rules color #hex\` - Set custom color\n` +
        `\`${prefix}rules color reset\` - Reset to default`)]
    });
  }

  if (colorHex === 'reset' || colorHex === 'default') {
    await Guild.updateGuild(message.guild.id, {
      $set: { 'rulesSystem.embedColor': null }
    });
    return message.reply({
      embeds: [await successEmbed(message.guild.id, 'Color Reset',
        `${GLYPHS.SUCCESS} Rules embed color reset to default.`)]
    });
  }

  if (!colorHex.match(/^#?[0-9A-Fa-f]{6}$/)) {
    return message.reply({
      embeds: [await errorEmbed(message.guild.id, 'Invalid Color',
        'Please provide a valid hex color code (e.g., #5865F2)')]
    });
  }

  const normalizedColor = colorHex.startsWith('#') ? colorHex : `#${colorHex}`;
  await Guild.updateGuild(message.guild.id, {
    $set: { 'rulesSystem.embedColor': normalizedColor }
  });

  return message.reply({
    embeds: [await successEmbed(message.guild.id, 'Color Set',
      `${GLYPHS.SUCCESS} Rules embed color set to: ${normalizedColor}`)]
  });
}

async function setFooter(message, args, guildConfig, prefix) {
  const footerText = args.join(' ');

  if (!footerText) {
    return message.reply({
      embeds: [await infoEmbed(message.guild.id, 'Embed Footer',
        `**Current Footer:**\n${guildConfig.rulesSystem?.footer || 'Default (none)'}\n\n` +
        `**Usage:**\n\`${prefix}rules footer <text>\` - Set footer\n` +
        `\`${prefix}rules footer none\` - Remove footer\n` +
        `\`${prefix}rules footer reset\` - Reset to default`)]
    });
  }

  if (footerText === 'reset' || footerText === 'default') {
    await Guild.updateGuild(message.guild.id, {
      $set: { 'rulesSystem.footer': null }
    });
    return message.reply({
      embeds: [await successEmbed(message.guild.id, 'Footer Reset',
        `${GLYPHS.SUCCESS} Rules footer reset to default.`)]
    });
  }

  if (footerText === 'none' || footerText === 'remove') {
    await Guild.updateGuild(message.guild.id, {
      $set: { 'rulesSystem.footer': ' ' }
    });
    return message.reply({
      embeds: [await successEmbed(message.guild.id, 'Footer Removed',
        `${GLYPHS.SUCCESS} Rules footer has been removed.`)]
    });
  }

  await Guild.updateGuild(message.guild.id, {
    $set: { 'rulesSystem.footer': footerText }
  });

  return message.reply({
    embeds: [await successEmbed(message.guild.id, 'Footer Set',
      `${GLYPHS.SUCCESS} Rules footer set to: ${footerText}`)]
  });
}

async function setBanner(message, args, guildConfig, prefix) {
  const imageUrl = args[0];

  if (!imageUrl) {
    return message.reply({
      embeds: [await infoEmbed(message.guild.id, 'Rules Banner',
        guildConfig.rulesSystem?.bannerUrl
          ? `**Current Banner:**\n${guildConfig.rulesSystem.bannerUrl}`
          : `No banner set.\n\n**Usage:**\n\`${prefix}rules image <url>\` - Set banner\n\`${prefix}rules image remove\` - Remove banner`)]
    });
  }

  if (imageUrl === 'remove' || imageUrl === 'none') {
    await Guild.updateGuild(message.guild.id, {
      $set: { 'rulesSystem.bannerUrl': null }
    });
    return message.reply({
      embeds: [await successEmbed(message.guild.id, 'Banner Removed',
        `${GLYPHS.SUCCESS} Rules banner has been removed.`)]
    });
  }

  if (!imageUrl.match(/^https?:\/\/.+/i)) {
    return message.reply({
      embeds: [await errorEmbed(message.guild.id, 'Invalid URL',
        'Please provide a valid image URL starting with http:// or https://')]
    });
  }

  await Guild.updateGuild(message.guild.id, {
    $set: { 'rulesSystem.bannerUrl': imageUrl }
  });

  return message.reply({
    embeds: [await successEmbed(message.guild.id, 'Banner Set',
      `${GLYPHS.SUCCESS} Rules banner has been set.`)]
  });
}

function buildRulesEmbed(guildConfig, guild) {
  const rulesConfig = guildConfig.rulesSystem || {};
  const rules = rulesConfig.rules || [];

  const rulesList = rules.map((r, i) => `**${i + 1}.** ${r.replace(/\\n/g, '\n')}`).join('\n\n');

  const embed = new EmbedBuilder()
    .setColor(rulesConfig.embedColor || '#5865F2')
    .setTitle(rulesConfig.title || '📜 Server Rules')
    .setDescription(rulesList);

  // Footer
  if (rulesConfig.footer && rulesConfig.footer.trim() && rulesConfig.footer !== ' ') {
    embed.setFooter({ text: rulesConfig.footer });
  } else if (rulesConfig.footer !== ' ') {
    embed.setFooter({ text: `${guild.name} • Please follow these rules!` });
  }

  // Banner
  if (rulesConfig.bannerUrl) {
    embed.setImage(rulesConfig.bannerUrl);
  }

  // Thumbnail (server icon)
  if (guild.iconURL()) {
    embed.setThumbnail(guild.iconURL({ dynamic: true, size: 256 }));
  }

  embed.setTimestamp();

  return embed;
}
