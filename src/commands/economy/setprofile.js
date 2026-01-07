import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import Economy from '../../models/Economy.js';
import Guild from '../../models/Guild.js';
import { getPrefix } from '../../utils/helpers.js';
import { successEmbed, errorEmbed, GLYPHS } from '../../utils/embeds.js';

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
  name: 'setprofile',
  description: 'Customize your profile settings',
  usage: 'setprofile <description|overlay> [value]',
  category: 'economy',
  aliases: ['customize', 'profileset'],
  cooldown: 5,

  // Slash command data
  slashCommand: true,
  data: new SlashCommandBuilder()
    .setName('setprofile')
    .setDescription('Customize your profile settings')
    .addSubcommand(subcommand =>
      subcommand
        .setName('description')
        .setDescription('Set your profile description (max 500 chars)')
        .addStringOption(option =>
          option.setName('text')
            .setDescription('Your description text (leave empty to clear)')
            .setRequired(false)
            .setMaxLength(500)))
    .addSubcommandGroup(group =>
      group
        .setName('overlay')
        .setDescription('Customize your card overlay')
        .addSubcommand(subcommand =>
          subcommand
            .setName('color')
            .setDescription('Set your overlay color')
            .addStringOption(option =>
              option.setName('hex')
                .setDescription('Hex color (e.g., #000000)')
                .setRequired(true)))
        .addSubcommand(subcommand =>
          subcommand
            .setName('opacity')
            .setDescription('Set your overlay opacity')
            .addIntegerOption(option =>
              option.setName('percent')
                .setDescription('Opacity percentage (0-100)')
                .setRequired(true)
                .setMinValue(0)
                .setMaxValue(100))))
    .addSubcommand(subcommand =>
      subcommand
        .setName('view')
        .setDescription('View your current profile settings'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('reset')
        .setDescription('Reset overlay customizations to default')),

  async execute(message, args) {
    const userId = message.author.id;
    const guildId = message.guild.id;
    const prefix = await getPrefix(guildId);

    const guildConfig = await Guild.getGuild(guildId);
    const customizationEnabled = guildConfig.economy?.profileCustomization?.enabled !== false;

    // No args - show help
    if (!args[0]) {
      return showHelp(message, guildId, prefix, customizationEnabled);
    }

    const setting = args[0].toLowerCase();
    const value = args.slice(1).join(' ');

    // View current settings
    if (setting === 'view' || setting === 'show' || setting === 'status') {
      return showProfileSettings(message, userId, guildId, customizationEnabled);
    }

    // Reset settings
    if (setting === 'reset' || setting === 'clear') {
      return resetProfileSettings(message, userId, guildId, customizationEnabled);
    }

    // Set description
    if (setting === 'description' || setting === 'desc') {
      return setDescription(message, userId, guildId, value);
    }

    // Overlay subcommands: overlay color <hex> or overlay opacity <0-100>
    if (setting === 'overlay') {
      if (!customizationEnabled) {
        const embed = await errorEmbed(guildId, 'Customization Disabled',
          `${GLYPHS.WARNING} Profile customization is disabled on this server.\n\n` +
          `Server admins control the overlay using \`${prefix}setoverlay\`.`
        );
        return message.reply({ embeds: [embed] });
      }

      const subSetting = args[1]?.toLowerCase();
      const subValue = args[2];

      if (!subSetting || !['color', 'colour', 'opacity'].includes(subSetting)) {
        const embed = await errorEmbed(guildId, 'Invalid Overlay Setting',
          `${GLYPHS.WARNING} Please specify \`color\` or \`opacity\`.\n\n` +
          `**Usage:**\n` +
          `\`${prefix}setprofile overlay color <hex>\`\n` +
          `\`${prefix}setprofile overlay opacity <0-100>\``
        );
        return message.reply({ embeds: [embed] });
      }

      if (subSetting === 'color' || subSetting === 'colour') {
        return setOverlayColor(message, userId, guildId, subValue, prefix);
      }

      if (subSetting === 'opacity') {
        return setOverlayOpacity(message, userId, guildId, subValue, prefix);
      }
    }

    // Unknown setting
    const embed = await errorEmbed(guildId, 'Invalid Setting',
      `${GLYPHS.WARNING} Unknown setting. Use \`description\`, \`overlay\`, \`view\`, or \`reset\`.\n\n` +
      `Use \`${prefix}setprofile\` to see all options.`
    );
    return message.reply({ embeds: [embed] });
  },

  // Slash command execution
  async executeSlash(interaction) {
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;

    const guildConfig = await Guild.getGuild(guildId);
    const customizationEnabled = guildConfig.economy?.profileCustomization?.enabled !== false;

    const subcommandGroup = interaction.options.getSubcommandGroup(false);
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'view') {
      return showProfileSettings(interaction, userId, guildId, customizationEnabled, true);
    }

    if (subcommand === 'reset') {
      return resetProfileSettings(interaction, userId, guildId, customizationEnabled, true);
    }

    if (subcommand === 'description') {
      const text = interaction.options.getString('text') || '';
      return setDescription(interaction, userId, guildId, text, true);
    }

    // Overlay subcommand group
    if (subcommandGroup === 'overlay') {
      if (!customizationEnabled) {
        const embed = await errorEmbed(guildId, 'Customization Disabled',
          `${GLYPHS.WARNING} Profile customization is disabled on this server.\n\n` +
          `Server admins control the overlay using \`/setoverlay\`.`
        );
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      if (subcommand === 'color') {
        const hex = interaction.options.getString('hex');
        return setOverlayColor(interaction, userId, guildId, hex, null, true);
      }

      if (subcommand === 'opacity') {
        const percent = interaction.options.getInteger('percent');
        return setOverlayOpacity(interaction, userId, guildId, String(percent), null, true);
      }
    }
  }
};

// Show help message
async function showHelp(context, guildId, prefix, customizationEnabled) {
  const fields = [
    {
      name: `${GLYPHS.ARROW_RIGHT} Description`,
      value: `\`${prefix}setprofile description <text>\`\nSet profile description (max 500 chars)\n\`${prefix}setprofile description\` to clear`,
      inline: false
    }
  ];

  // Only show overlay options if customization is enabled
  if (customizationEnabled) {
    fields.push(
      {
        name: `${GLYPHS.ARROW_RIGHT} Overlay Color`,
        value: `\`${prefix}setprofile overlay color <hex>\`\nSet your overlay color (e.g., #000000)`,
        inline: false
      },
      {
        name: `${GLYPHS.ARROW_RIGHT} Overlay Opacity`,
        value: `\`${prefix}setprofile overlay opacity <0-100>\`\nSet your overlay opacity percentage`,
        inline: false
      }
    );
  }

  fields.push(
    {
      name: `${GLYPHS.ARROW_RIGHT} View / Reset`,
      value: `\`${prefix}setprofile view\` - View your settings\n\`${prefix}setprofile reset\` - Reset overlay to default`,
      inline: false
    }
  );

  const embed = new EmbedBuilder()
    .setColor('#00CED1')
    .setTitle('『 Profile Customization 』')
    .setDescription(customizationEnabled 
      ? '**Customize your profile, Master:**' 
      : '**Profile customization is managed by admins.**\nYou can only set your description.')
    .addFields(fields)
    .setFooter({ text: `Use ${prefix}profile to preview your card` });

  return context.reply({ embeds: [embed] });
}

// Show current profile settings
async function showProfileSettings(context, userId, guildId, customizationEnabled, isSlash = false) {
  const economy = await Economy.getEconomy(userId, guildId);
  const profile = economy.profile || {};

  const overlayColor = profile.overlayColor || '#000000';
  const overlayOpacity = profile.overlayOpacity ?? 0.5;
  const overlayRgba = hexToRgba(overlayColor, overlayOpacity);

  const fields = [
    {
      name: '📄 Description',
      value: profile.description ? `\`\`\`${profile.description.substring(0, 150)}${profile.description.length > 150 ? '...' : ''}\`\`\`` : '`Not set`',
      inline: false
    },
    {
      name: '🎨 Overlay Color',
      value: `\`${overlayColor}\``,
      inline: true
    },
    {
      name: '💧 Overlay Opacity',
      value: `\`${Math.round(overlayOpacity * 100)}%\``,
      inline: true
    },
    {
      name: '📋 Result',
      value: `\`${overlayRgba}\``,
      inline: true
    },
    {
      name: '🖼️ Background',
      value: `\`${profile.background || 'default'}\``,
      inline: true
    }
  ];

  const embed = new EmbedBuilder()
    .setColor('#00CED1')
    .setTitle('『 Your Profile Settings 』')
    .setDescription(customizationEnabled 
      ? '**You can customize your overlay.**' 
      : '**Overlay is controlled by server admins.**')
    .addFields(fields)
    .setFooter({ text: 'Use /profile to preview your card' });

  if (isSlash) {
    return context.reply({ embeds: [embed], ephemeral: true });
  }
  return context.reply({ embeds: [embed] });
}

// Reset profile settings (overlay only)
async function resetProfileSettings(context, userId, guildId, customizationEnabled, isSlash = false) {
  if (!customizationEnabled) {
    const embed = await errorEmbed(guildId, 'Customization Disabled',
      `${GLYPHS.WARNING} Profile customization is disabled.\nOverlay is controlled by server admins.`
    );
    if (isSlash) return context.reply({ embeds: [embed], ephemeral: true });
    return context.reply({ embeds: [embed] });
  }

  await Economy.updateEconomy(userId, guildId, {
    $set: {
      'profile.overlayColor': '#000000',
      'profile.overlayOpacity': 0.5
    }
  });

  const embed = await successEmbed(guildId, 'Overlay Reset',
    `${GLYPHS.SUCCESS} Your overlay has been reset to default, Master.\n\n` +
    `**Default Values:**\n` +
    `◇ Color: \`#000000\`\n` +
    `◇ Opacity: \`50%\``
  );

  if (isSlash) return context.reply({ embeds: [embed] });
  return context.reply({ embeds: [embed] });
}

// Set description
async function setDescription(context, userId, guildId, value, isSlash = false) {
  const economy = await Economy.getEconomy(userId, guildId);

  if (!value) {
    economy.profile.description = '';
    await economy.save();

    const embed = await successEmbed(guildId, 'Description Cleared',
      `${GLYPHS.SUCCESS} Your description has been cleared, Master.`
    );
    if (isSlash) return context.reply({ embeds: [embed] });
    return context.reply({ embeds: [embed] });
  }

  if (value.length > 500) {
    const embed = await errorEmbed(guildId, 'Description Too Long',
      `${GLYPHS.WARNING} Description must not exceed 500 characters, Master.\n\n` +
      `Your text: **${value.length}** characters`
    );
    if (isSlash) return context.reply({ embeds: [embed], ephemeral: true });
    return context.reply({ embeds: [embed] });
  }

  economy.profile.description = value;
  await economy.save();

  const embed = await successEmbed(guildId, 'Description Updated',
    `${GLYPHS.SUCCESS} Your description has been updated, Master.\n\n` +
    `**Length:** ${value.length}/500 characters`
  );

  if (isSlash) return context.reply({ embeds: [embed] });
  return context.reply({ embeds: [embed] });
}

// Set overlay color
async function setOverlayColor(context, userId, guildId, value, prefix, isSlash = false) {
  if (!value) {
    const embed = await errorEmbed(guildId, 'Missing Value',
      `${GLYPHS.WARNING} Please provide a hex color (e.g., #000000), Master.`
    );
    if (isSlash) return context.reply({ embeds: [embed], ephemeral: true });
    return context.reply({ embeds: [embed] });
  }

  // Validate hex color
  const hexRegex = /^#?([0-9A-Fa-f]{6})$/;
  const match = value.match(hexRegex);

  if (!match) {
    const embed = await errorEmbed(guildId, 'Invalid Color',
      `${GLYPHS.WARNING} Invalid hex color format, Master.\n\n` +
      `**Examples:**\n` +
      `◇ \`#000000\` - Black\n` +
      `◇ \`#1a1a2e\` - Dark Blue\n` +
      `◇ \`#2C2F33\` - Discord Dark`
    );
    if (isSlash) return context.reply({ embeds: [embed], ephemeral: true });
    return context.reply({ embeds: [embed] });
  }

  const hexColor = value.startsWith('#') ? value.toLowerCase() : `#${value.toLowerCase()}`;

  const economy = await Economy.getEconomy(userId, guildId);
  economy.profile.overlayColor = hexColor;
  await economy.save();

  const embed = new EmbedBuilder()
    .setColor(hexColor)
    .setTitle('『 Overlay Color Updated 』')
    .setDescription(`${GLYPHS.SUCCESS} **Confirmed:** Set to \`${hexColor}\`, Master.`)
    .setFooter({ text: 'Applied to your profile and level cards.' });

  if (isSlash) return context.reply({ embeds: [embed] });
  return context.reply({ embeds: [embed] });
}

// Set overlay opacity
async function setOverlayOpacity(context, userId, guildId, value, prefix, isSlash = false) {
  if (!value) {
    const embed = await errorEmbed(guildId, 'Missing Value',
      `${GLYPHS.WARNING} Please provide an opacity value (0-100), Master.`
    );
    if (isSlash) return context.reply({ embeds: [embed], ephemeral: true });
    return context.reply({ embeds: [embed] });
  }

  const opacityPercent = parseInt(value);

  if (isNaN(opacityPercent) || opacityPercent < 0 || opacityPercent > 100) {
    const embed = await errorEmbed(guildId, 'Invalid Opacity',
      `${GLYPHS.WARNING} Please provide a value between 0 and 100, Master.\n\n` +
      `**Examples:**\n` +
      `◇ \`0\` - Fully transparent\n` +
      `◇ \`50\` - Half opacity\n` +
      `◇ \`100\` - Fully opaque`
    );
    if (isSlash) return context.reply({ embeds: [embed], ephemeral: true });
    return context.reply({ embeds: [embed] });
  }

  const opacity = opacityPercent / 100;

  const economy = await Economy.getEconomy(userId, guildId);
  economy.profile.overlayOpacity = opacity;
  await economy.save();

  const embed = await successEmbed(guildId, 'Overlay Opacity Updated',
    `${GLYPHS.SUCCESS} **Confirmed:** Set to \`${opacityPercent}%\`, Master.\n\n` +
    `Applied to your profile and level cards.`
  );

  if (isSlash) return context.reply({ embeds: [embed] });
  return context.reply({ embeds: [embed] });
}
