import { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import Guild from '../../models/Guild.js';
import { successEmbed, errorEmbed, GLYPHS } from '../../utils/embeds.js';
import { getPrefix } from '../../utils/helpers.js';

// Helper function to convert hex to rgba
function hexToRgba(hex, opacity) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

export default {
  name: 'setoverlay',
  description: 'Configure overlay color and opacity for profile and level cards',
  usage: 'setoverlay <color|opacity> <value>',
  aliases: ['overlay', 'cardoverlay', 'setcardoverlay'],
  category: 'config',
  permissions: {
    user: PermissionFlagsBits.Administrator,
    client: null
  },
  cooldown: 5,

  // Slash command data
  slashCommand: true,
  data: new SlashCommandBuilder()
    .setName('setoverlay')
    .setDescription('Configure overlay color and opacity for profile and level cards')
    .addSubcommand(subcommand =>
      subcommand
        .setName('color')
        .setDescription('Set the overlay color for all cards')
        .addStringOption(option =>
          option.setName('hex')
            .setDescription('Hex color (e.g., #000000, #1a1a2e)')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('opacity')
        .setDescription('Set the overlay opacity for all cards')
        .addIntegerOption(option =>
          option.setName('percent')
            .setDescription('Opacity percentage (0-100)')
            .setRequired(true)
            .setMinValue(0)
            .setMaxValue(100)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('view')
        .setDescription('View current overlay settings'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('reset')
        .setDescription('Reset overlay settings to default'))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(message, args) {
    const guildId = message.guild.id;
    const prefix = await getPrefix(guildId);

    // No args - show help
    if (!args[0]) {
      return showHelp(message, prefix);
    }

    const setting = args[0].toLowerCase();
    const value = args[1];

    // View current settings
    if (setting === 'view' || setting === 'show' || setting === 'status') {
      return showOverlaySettings(message, guildId);
    }

    // Reset settings
    if (setting === 'reset') {
      return resetOverlaySettings(message, guildId);
    }

    // Set color
    if (setting === 'color' || setting === 'colour') {
      if (!value) {
        const embed = await errorEmbed(guildId, 'Missing Value',
          `${GLYPHS.WARNING} Please provide a hex color.\n\n` +
          `**Usage:** \`${prefix}setoverlay color #000000\``
        );
        return message.reply({ embeds: [embed] });
      }
      return setOverlayColor(message, guildId, value);
    }

    // Set opacity
    if (setting === 'opacity') {
      if (!value) {
        const embed = await errorEmbed(guildId, 'Missing Value',
          `${GLYPHS.WARNING} Please provide an opacity value (0-100).\n\n` +
          `**Usage:** \`${prefix}setoverlay opacity 50\``
        );
        return message.reply({ embeds: [embed] });
      }
      return setOverlayOpacity(message, guildId, value);
    }

    // Unknown setting
    const embed = await errorEmbed(guildId, 'Invalid Setting',
      `${GLYPHS.WARNING} Unknown setting. Use \`color\`, \`opacity\`, \`view\`, or \`reset\`.`
    );
    return message.reply({ embeds: [embed] });
  },

  // Slash command execution
  async executeSlash(interaction) {
    const guildId = interaction.guild.id;
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'view') {
      return showOverlaySettings(interaction, guildId, true);
    }

    if (subcommand === 'reset') {
      return resetOverlaySettings(interaction, guildId, true);
    }

    if (subcommand === 'color') {
      const hex = interaction.options.getString('hex');
      return setOverlayColor(interaction, guildId, hex, true);
    }

    if (subcommand === 'opacity') {
      const percent = interaction.options.getInteger('percent');
      return setOverlayOpacity(interaction, guildId, String(percent), true);
    }
  }
};

// Show help message
async function showHelp(message, prefix) {
  const embed = new EmbedBuilder()
    .setColor('#667eea')
    .setTitle('『 Card Overlay Customization 』')
    .setDescription('**Configure overlay settings for profile and level cards, Master.**\n\n' +
      'The overlay is applied on top of background images to improve text readability.\n' +
      'Settings apply to **both** profile and level/rank cards.')
    .addFields(
      {
        name: `${GLYPHS.ARROW_RIGHT} Set Color`,
        value: `\`${prefix}setoverlay color <hex>\`\n` +
          `Example: \`${prefix}setoverlay color #1a1a2e\``,
        inline: false
      },
      {
        name: `${GLYPHS.ARROW_RIGHT} Set Opacity`,
        value: `\`${prefix}setoverlay opacity <0-100>\`\n` +
          `Example: \`${prefix}setoverlay opacity 60\``,
        inline: false
      },
      {
        name: `${GLYPHS.ARROW_RIGHT} View Settings`,
        value: `\`${prefix}setoverlay view\`\n` +
          `Shows current overlay configuration`,
        inline: false
      },
      {
        name: `${GLYPHS.ARROW_RIGHT} Reset Settings`,
        value: `\`${prefix}setoverlay reset\`\n` +
          `Reset to default values`,
        inline: false
      }
    )
    .setFooter({ text: 'Default: #000000 at 50% opacity • Applies to profile & level cards' });

  return message.reply({ embeds: [embed] });
}

// Show current overlay settings
async function showOverlaySettings(context, guildId, isSlash = false) {
  const guildConfig = await Guild.getGuild(guildId);

  const cardOverlay = guildConfig.economy?.cardOverlay || { color: '#000000', opacity: 0.5 };
  const overlayRgba = hexToRgba(cardOverlay.color, cardOverlay.opacity);

  const embed = new EmbedBuilder()
    .setColor(cardOverlay.color || '#667eea')
    .setTitle('『 Current Overlay Settings 』')
    .setDescription('**Overlay configuration for profile and level cards:**')
    .addFields(
      {
        name: '🎨 Color',
        value: `\`${cardOverlay.color}\``,
        inline: true
      },
      {
        name: '💧 Opacity',
        value: `\`${Math.round(cardOverlay.opacity * 100)}%\``,
        inline: true
      },
      {
        name: '📋 Result',
        value: `\`${overlayRgba}\``,
        inline: true
      }
    )
    .setFooter({ text: 'Applies to both profile and level/rank cards' });

  if (isSlash) {
    return context.reply({ embeds: [embed] });
  }
  return context.reply({ embeds: [embed] });
}

// Set overlay color
async function setOverlayColor(context, guildId, value, isSlash = false) {
  // Validate hex color
  const hexRegex = /^#?([0-9A-Fa-f]{6})$/;
  const match = value.match(hexRegex);

  if (!match) {
    const embed = await errorEmbed(guildId, 'Invalid Color',
      `${GLYPHS.WARNING} Please provide a valid hex color.\n\n` +
      `**Examples:**\n` +
      `◇ \`#000000\` - Black\n` +
      `◇ \`#1a1a2e\` - Dark Blue\n` +
      `◇ \`#2C2F33\` - Discord Dark\n` +
      `◇ \`#667eea\` - Purple`
    );
    if (isSlash) return context.reply({ embeds: [embed], ephemeral: true });
    return context.reply({ embeds: [embed] });
  }

  const hexColor = `#${match[1].toUpperCase()}`;

  await Guild.updateGuild(guildId, {
    $set: { 'economy.cardOverlay.color': hexColor }
  });

  const embed = await successEmbed(guildId, 'Overlay Color Updated',
    `${GLYPHS.SUCCESS} Card overlay color set to \`${hexColor}\`\n\n` +
    `This applies to both **profile** and **level/rank** cards.`
  );
  embed.setColor(hexColor);

  if (isSlash) return context.reply({ embeds: [embed] });
  return context.reply({ embeds: [embed] });
}

// Set overlay opacity
async function setOverlayOpacity(context, guildId, value, isSlash = false) {
  // Parse opacity (0-100)
  const opacityPercent = parseInt(value);

  if (isNaN(opacityPercent) || opacityPercent < 0 || opacityPercent > 100) {
    const embed = await errorEmbed(guildId, 'Invalid Opacity',
      `${GLYPHS.WARNING} Please provide a number between 0 and 100.\n\n` +
      `**Examples:**\n` +
      `◇ \`0\` - Fully transparent (no overlay)\n` +
      `◇ \`50\` - 50% opacity (default)\n` +
      `◇ \`75\` - 75% opacity (darker)\n` +
      `◇ \`100\` - Fully opaque`
    );
    if (isSlash) return context.reply({ embeds: [embed], ephemeral: true });
    return context.reply({ embeds: [embed] });
  }

  const opacity = opacityPercent / 100;

  await Guild.updateGuild(guildId, {
    $set: { 'economy.cardOverlay.opacity': opacity }
  });

  const embed = await successEmbed(guildId, 'Overlay Opacity Updated',
    `${GLYPHS.SUCCESS} Card overlay opacity set to \`${opacityPercent}%\`\n\n` +
    `This applies to both **profile** and **level/rank** cards.`
  );

  if (isSlash) return context.reply({ embeds: [embed] });
  return context.reply({ embeds: [embed] });
}

// Reset overlay settings
async function resetOverlaySettings(context, guildId, isSlash = false) {
  const defaultSettings = { color: '#000000', opacity: 0.5 };

  await Guild.updateGuild(guildId, {
    $set: { 'economy.cardOverlay': defaultSettings }
  });

  const embed = await successEmbed(guildId, 'Overlay Settings Reset',
    `${GLYPHS.SUCCESS} Card overlay settings reset to default.\n\n` +
    `**Default Values:**\n` +
    `◇ Color: \`#000000\`\n` +
    `◇ Opacity: \`50%\`\n\n` +
    `This applies to both **profile** and **level/rank** cards.`
  );

  if (isSlash) return context.reply({ embeds: [embed] });
  return context.reply({ embeds: [embed] });
}
