import { EmbedBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';
import Guild from '../../models/Guild.js';
import { successEmbed, errorEmbed, infoEmbed, GLYPHS } from '../../utils/embeds.js';
import { getPrefix } from '../../utils/helpers.js';

// Default color options
const DEFAULT_COLORS = [
  { emoji: '❤️', name: 'Red', color: '#FF0000' },
  { emoji: '🧡', name: 'Orange', color: '#FF8000' },
  { emoji: '💛', name: 'Yellow', color: '#FFFF00' },
  { emoji: '💚', name: 'Green', color: '#00FF00' },
  { emoji: '💙', name: 'Blue', color: '#0080FF' },
  { emoji: '💜', name: 'Purple', color: '#8000FF' },
  { emoji: '🩷', name: 'Pink', color: '#FF80C0' },
  { emoji: '🤍', name: 'White', color: '#FFFFFF' },
  { emoji: '🖤', name: 'Black', color: '#000001' },
  { emoji: '🩵', name: 'Cyan', color: '#00FFFF' },
  { emoji: '🤎', name: 'Brown', color: '#8B4513' },
  { emoji: '💗', name: 'Hot Pink', color: '#FF69B4' }
];

export default {
  name: 'colorroles',
  description: 'Set up a color reaction roles channel and panel',
  usage: 'colorroles setup | colorroles set <option> <value>',
  aliases: ['colorpanel', 'colormenu', 'reactioncolors'],
  permissions: {
    user: PermissionFlagsBits.ManageRoles,
    client: PermissionFlagsBits.ManageRoles
  },
  cooldown: 5,

  async execute(message, args) {
    const guildId = message.guild.id;
    const subCommand = args[0]?.toLowerCase();
    const prefix = await getPrefix(guildId);

    try {
      const guildConfig = await Guild.getGuild(guildId);

      // No args - show help
      if (!subCommand) {
        return this.showHelp(message, guildId, guildConfig);
      }

      // Setup command - creates channel and panel
      if (subCommand === 'setup' || subCommand === 'create') {
        return this.setupColorRoles(message, args, guildConfig);
      }

      // Set command - edit preferences
      if (subCommand === 'set' || subCommand === 'edit') {
        return this.setPreference(message, args.slice(1), guildConfig);
      }

      // Preview command
      if (subCommand === 'preview') {
        return this.previewPanel(message, guildConfig);
      }

      // Refresh/update command
      if (subCommand === 'refresh' || subCommand === 'update') {
        return this.refreshPanel(message, guildConfig);
      }

      // Delete command
      if (subCommand === 'delete' || subCommand === 'remove') {
        return this.deletePanel(message, guildConfig);
      }

      // Fix position command - moves color roles to top
      if (subCommand === 'fixposition' || subCommand === 'fixpos' || subCommand === 'position') {
        return this.fixRolePositions(message, guildConfig);
      }

      // Settings/info command
      if (subCommand === 'settings' || subCommand === 'info') {
        return this.showSettings(message, guildConfig);
      }

      // Unknown subcommand - show help
      return this.showHelp(message, guildId, guildConfig);

    } catch (error) {
      console.error('Color roles error:', error);
      const embed = await errorEmbed(guildId, 'Error',
        `${GLYPHS.ERROR} An error occurred. Please try again.\n\n**Error:** ${error.message}`
      );
      return message.reply({ embeds: [embed] });
    }
  },

  async showHelp(message, guildId, guildConfig) {
    const hasPanel = !!guildConfig.settings?.colorRoles?.messageId;
    const prefix = await getPrefix(guildId);

    const embed = new EmbedBuilder()
      .setColor('#00CED1')
      .setTitle('『 Color Roles System 』')
      .setDescription(
        `**▸ Status:** ${hasPanel ? '◉ Active' : '○ Not configured'}\n\n` +
        `**Commands:**\n` +
        `${GLYPHS.ARROW_RIGHT} \`${prefix}colorroles setup\` - Create channel & panel\n` +
        `${GLYPHS.ARROW_RIGHT} \`${prefix}colorroles settings\` - View current settings\n` +
        `${GLYPHS.ARROW_RIGHT} \`${prefix}colorroles preview\` - Preview the panel\n` +
        `${GLYPHS.ARROW_RIGHT} \`${prefix}colorroles refresh\` - Update existing panel\n` +
        `${GLYPHS.ARROW_RIGHT} \`${prefix}colorroles fixposition\` - Move roles to top\n` +
        `${GLYPHS.ARROW_RIGHT} \`${prefix}colorroles delete\` - Delete panel & channel\n\n` +
        `**Customization:**\n` +
        `${GLYPHS.ARROW_RIGHT} \`${prefix}colorroles set title <text>\`\n` +
        `${GLYPHS.ARROW_RIGHT} \`${prefix}colorroles set description <text>\`\n` +
        `${GLYPHS.ARROW_RIGHT} \`${prefix}colorroles set color <hex>\`\n` +
        `${GLYPHS.ARROW_RIGHT} \`${prefix}colorroles set image <url>\`\n` +
        `${GLYPHS.ARROW_RIGHT} \`${prefix}colorroles set thumbnail <url>\`\n` +
        `${GLYPHS.ARROW_RIGHT} \`${prefix}colorroles set footer <text>\``
      )
      .setFooter({ text: `Use ${prefix}colorroles setup to get started!` })
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  },

  async fixRolePositions(message, guildConfig) {
    const guildId = message.guild.id;

    try {
      // Get all color roles
      const allColorRoles = message.guild.roles.cache.filter(r => r.name.startsWith('🎨 '));

      if (allColorRoles.size === 0) {
        const embed = await errorEmbed(guildId, 'No Color Roles',
          `${GLYPHS.ERROR} No color roles found in this server.\n\nRun \`${await getPrefix(guildId)}colorroles setup\` first.`
        );
        return message.reply({ embeds: [embed] });
      }

      // Get the bot's highest role position
      const botMember = await message.guild.members.fetch(message.client.user.id);
      const botHighestRole = botMember.roles.highest;
      const targetPosition = Math.max(1, botHighestRole.position - 1);

      const statusMsg = await message.reply({
        embeds: [new EmbedBuilder()
          .setColor('#5865F2')
          .setDescription(`🔄 Moving ${allColorRoles.size} color roles to position ${targetPosition}...`)
        ]
      });

      // Build position array
      const rolePositions = [];
      let pos = targetPosition;

      for (const [roleId] of allColorRoles) {
        rolePositions.push({ role: roleId, position: pos });
        pos = Math.max(1, pos - 1);
      }

      await message.guild.roles.setPositions(rolePositions);

      const embed = await successEmbed(guildId, 'Roles Repositioned',
        `${GLYPHS.SUCCESS} Successfully moved ${allColorRoles.size} color roles to the top!\n\n` +
        `Color roles are now positioned just below the bot's highest role.`
      );
      return statusMsg.edit({ embeds: [embed] });

    } catch (error) {
      console.error('Fix position error:', error);
      const embed = await errorEmbed(guildId, 'Failed to Reposition',
        `${GLYPHS.ERROR} Failed to move roles.\n\n**Error:** ${error.message}\n\n` +
        `Make sure the bot's role is higher than the color roles.`
      );
      return message.reply({ embeds: [embed] });
    }
  },

  async setupColorRoles(message, args, guildConfig) {
    const guildId = message.guild.id;

    // Check if already setup
    if (guildConfig.settings?.colorRoles?.messageId) {
      const prefix = await getPrefix(guildId);
      const embed = await errorEmbed(guildId, 'Already Setup',
        `${GLYPHS.ERROR} Color roles panel already exists!\n\n` +
        `Use \`${prefix}colorroles refresh\` to update it, or\n` +
        `Use \`${prefix}colorroles delete\` to remove it first.`
      );
      return message.reply({ embeds: [embed] });
    }

    // Status message
    const statusMsg = await message.reply({
      embeds: [new EmbedBuilder()
        .setColor('#5865F2')
        .setDescription('🎨 Setting up color roles system... This may take a moment.')
      ]
    });

    try {
      // 1. Create the channel
      const category = message.channel.parent;
      const colorChannel = await message.guild.channels.create({
        name: '🎨・color-roles',
        type: ChannelType.GuildText,
        parent: category?.id,
        topic: 'React to get a color role! You can only have one color at a time.',
        permissionOverwrites: [
          {
            id: message.guild.id, // @everyone
            deny: ['SendMessages'],
            allow: ['ViewChannel', 'AddReactions', 'ReadMessageHistory']
          },
          {
            id: message.client.user.id, // Bot
            allow: ['SendMessages', 'ManageMessages', 'AddReactions', 'EmbedLinks']
          }
        ],
        reason: 'Color roles setup'
      });

      // 2. Create roles if they don't exist
      const createdRoles = [];
      const existingRoles = [];

      // Get the bot's highest role position to determine where to place color roles
      const botMember = await message.guild.members.fetch(message.client.user.id);
      const botHighestRole = botMember.roles.highest;
      // Place color roles just below the bot's highest role
      const targetPosition = Math.max(1, botHighestRole.position - 1);

      for (const colorData of DEFAULT_COLORS) {
        let role = message.guild.roles.cache.find(r => r.name === `🎨 ${colorData.name}`);

        if (!role) {
          try {
            role = await message.guild.roles.create({
              name: `🎨 ${colorData.name}`,
              color: colorData.color,
              reason: 'Color roles setup',
              permissions: [],
              position: targetPosition
            });
            createdRoles.push(role);
          } catch (err) {
            console.error(`Failed to create role ${colorData.name}:`, err);
            continue;
          }
        } else {
          existingRoles.push(role);
        }
      }

      // 2.5 Reposition all color roles to be near the top (below bot's role)
      try {
        const allColorRoles = message.guild.roles.cache.filter(r => r.name.startsWith('🎨 '));
        const rolePositions = [];
        let pos = targetPosition;

        for (const [roleId, role] of allColorRoles) {
          rolePositions.push({ role: roleId, position: pos });
          pos = Math.max(1, pos - 1);
        }

        if (rolePositions.length > 0) {
          await message.guild.roles.setPositions(rolePositions);
        }
      } catch (err) {
        console.error('Failed to reposition color roles:', err);
        // Continue anyway, roles will still work just might not show color
      }

      // 3. Get settings or use defaults
      const settings = guildConfig.settings?.colorRoles || {};
      const title = settings.title || '🎨 Color Roles';
      const description = settings.description || '**React to get a color role!**\nYou can only have one color at a time.';
      const embedColor = settings.embedColor || '#667eea';
      const footerText = settings.footerText || 'Click a reaction to get/remove a color role';

      // 4. Create the embed
      const colorEmbed = new EmbedBuilder()
        .setColor(embedColor)
        .setTitle(title)
        .setDescription(
          description + '\n\n' +
          DEFAULT_COLORS.map(c => `${c.emoji} → \`${c.name}\``).join('\n')
        )
        .setFooter({ text: footerText })
        .setTimestamp();

      if (settings.image) colorEmbed.setImage(settings.image);
      if (settings.thumbnail) colorEmbed.setThumbnail(settings.thumbnail);

      // 5. Send the embed
      const colorMessage = await colorChannel.send({ embeds: [colorEmbed] });

      // 6. Add reactions
      for (const colorData of DEFAULT_COLORS) {
        try {
          await colorMessage.react(colorData.emoji);
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (err) {
          console.error(`Failed to add reaction ${colorData.emoji}:`, err);
        }
      }

      // 7. Build roles mapping
      const rolesMapping = [];
      for (const colorData of DEFAULT_COLORS) {
        const role = message.guild.roles.cache.find(r => r.name === `🎨 ${colorData.name}`);
        if (role) {
          rolesMapping.push({
            emoji: colorData.emoji,
            roleId: role.id
          });
        }
      }

      // 8. Save to database
      const existingMessages = guildConfig.settings?.reactionRoles?.messages || [];
      existingMessages.push({
        messageId: colorMessage.id,
        channelId: colorChannel.id,
        roles: rolesMapping
      });

      await Guild.updateGuild(guildId, {
        $set: {
          'settings.reactionRoles.enabled': true,
          'settings.reactionRoles.messages': existingMessages,
          'settings.colorRoles.enabled': true,
          'settings.colorRoles.channelId': colorChannel.id,
          'settings.colorRoles.messageId': colorMessage.id
        }
      });

      const prefix = await getPrefix(guildId);
      // Update status
      const successEmb = await successEmbed(guildId, '🎨 Color Roles Setup Complete!',
        `${GLYPHS.SUCCESS} Color roles system is now active!\n\n` +
        `**Channel:** ${colorChannel}\n` +
        `**Roles Created:** ${createdRoles.length}\n` +
        `**Roles Existing:** ${existingRoles.length}\n\n` +
        `Use \`${prefix}colorroles set\` to customize the panel!`
      );

      await statusMsg.edit({ embeds: [successEmb] });

    } catch (error) {
      console.error('Setup error:', error);
      const embed = await errorEmbed(guildId, 'Setup Failed',
        `${GLYPHS.ERROR} Failed to set up color roles.\n\n**Error:** ${error.message}`
      );
      await statusMsg.edit({ embeds: [embed] });
    }
  },

  async setPreference(message, args, guildConfig) {
    const guildId = message.guild.id;
    const option = args[0]?.toLowerCase();
    const value = args.slice(1).join(' ');

    if (!option) {
      const prefix = await getPrefix(guildId);
      const embed = await infoEmbed(guildId, 'Set Preference',
        `**Available Options:**\n\n` +
        `${GLYPHS.ARROW_RIGHT} \`title\` - Panel title\n` +
        `${GLYPHS.ARROW_RIGHT} \`description\` - Panel description\n` +
        `${GLYPHS.ARROW_RIGHT} \`color\` - Embed color (hex)\n` +
        `${GLYPHS.ARROW_RIGHT} \`image\` - Large image/banner URL\n` +
        `${GLYPHS.ARROW_RIGHT} \`thumbnail\` - Small image URL\n` +
        `${GLYPHS.ARROW_RIGHT} \`footer\` - Footer text\n\n` +
        `**Example:**\n` +
        `\`${prefix}colorroles set title 🌈 Pick Your Color!\`\n` +
        `\`${prefix}colorroles set image https://example.com/banner.gif\``
      );
      return message.reply({ embeds: [embed] });
    }

    if (!value && option !== 'image' && option !== 'thumbnail') {
      const prefix = await getPrefix(guildId);
      const embed = await errorEmbed(guildId, 'Missing Value',
        `${GLYPHS.ERROR} Please provide a value for \`${option}\`.\n\n` +
        `Use \`${prefix}colorroles set ${option} none\` to reset to default.`
      );
      return message.reply({ embeds: [embed] });
    }

    // Initialize colorRoles settings if not exists
    if (!guildConfig.settings.colorRoles) {
      guildConfig.settings.colorRoles = {};
    }

    const settings = guildConfig.settings.colorRoles;
    let settingName = '';
    let displayValue = value;

    switch (option) {
      case 'title':
        settings.title = value === 'none' ? '🎨 Color Roles' : value;
        settingName = 'Title';
        break;

      case 'description':
      case 'desc':
        settings.description = value === 'none'
          ? '**React to get a color role!**\nYou can only have one color at a time.'
          : value.replace(/\\n/g, '\n'); // Allow \n for new lines
        settingName = 'Description';
        break;

      case 'color':
      case 'embedcolor':
        if (!/^#?[0-9A-Fa-f]{6}$/.test(value) && value !== 'none') {
          const embed = await errorEmbed(guildId, 'Invalid Color',
            `${GLYPHS.ERROR} Please provide a valid hex color.\n\n` +
            `**Example:** \`#667eea\` or \`667eea\``
          );
          return message.reply({ embeds: [embed] });
        }
        settings.embedColor = value === 'none' ? '#667eea' : (value.startsWith('#') ? value : `#${value}`);
        settingName = 'Embed Color';
        displayValue = settings.embedColor;
        break;

      case 'image':
      case 'banner':
      case 'gif':
        if (value === 'none' || !value) {
          settings.image = null;
          displayValue = 'Removed';
        } else if (!value.match(/^https?:\/\/.+\.(png|jpg|jpeg|gif|webp)(\?.*)?$/i) && !value.includes('tenor.com') && !value.includes('giphy.com')) {
          const embed = await errorEmbed(guildId, 'Invalid URL',
            `${GLYPHS.ERROR} Please provide a valid image URL.\n\n` +
            `Supported: png, jpg, gif, webp, tenor, giphy`
          );
          return message.reply({ embeds: [embed] });
        } else {
          settings.image = value;
        }
        settingName = 'Image/Banner';
        break;

      case 'thumbnail':
      case 'thumb':
      case 'icon':
        if (value === 'none' || !value) {
          settings.thumbnail = null;
          displayValue = 'Removed';
        } else if (!value.match(/^https?:\/\/.+\.(png|jpg|jpeg|gif|webp)(\?.*)?$/i) && !value.includes('tenor.com') && !value.includes('giphy.com')) {
          const embed = await errorEmbed(guildId, 'Invalid URL',
            `${GLYPHS.ERROR} Please provide a valid image URL.\n\n` +
            `Supported: png, jpg, gif, webp, tenor, giphy`
          );
          return message.reply({ embeds: [embed] });
        } else {
          settings.thumbnail = value;
        }
        settingName = 'Thumbnail';
        break;

      case 'footer':
      case 'footertext':
        settings.footerText = value === 'none' ? 'Click a reaction to get/remove a color role' : value;
        settingName = 'Footer';
        break;

      default:
        const embed = await errorEmbed(guildId, 'Unknown Option',
          `${GLYPHS.ERROR} Unknown option: \`${option}\`\n\n` +
          `Valid options: title, description, color, image, thumbnail, footer`
        );
        return message.reply({ embeds: [embed] });
    }

    await Guild.updateGuild(guildId, { $set: { 'settings.colorRoles': settings } });

    const prefixForMsg = await getPrefix(guildId);
    const embed = await successEmbed(guildId, 'Setting Updated',
      `${GLYPHS.SUCCESS} **${settingName}** has been updated!\n\n` +
      `**New Value:** ${displayValue.length > 100 ? displayValue.substring(0, 100) + '...' : displayValue}\n\n` +
      `${settings.messageId ? `Use \`${prefixForMsg}colorroles refresh\` to apply changes.` : `Use \`${prefixForMsg}colorroles setup\` to create the panel.`}`
    );
    return message.reply({ embeds: [embed] });
  },

  async previewPanel(message, guildConfig) {
    const settings = guildConfig.settings?.colorRoles || {};
    const title = settings.title || '🎨 Color Roles';
    const description = settings.description || '**React to get a color role!**\nYou can only have one color at a time.';
    const embedColor = settings.embedColor || '#667eea';
    const footerText = settings.footerText || 'Click a reaction to get/remove a color role';

    const embed = new EmbedBuilder()
      .setColor(embedColor)
      .setTitle(title)
      .setDescription(
        description + '\n\n' +
        DEFAULT_COLORS.map(c => `${c.emoji} → \`${c.name}\``).join('\n')
      )
      .setFooter({ text: footerText })
      .setTimestamp();

    if (settings.image) embed.setImage(settings.image);
    if (settings.thumbnail) embed.setThumbnail(settings.thumbnail);

    return message.reply({
      content: '**Preview of your color roles panel:**',
      embeds: [embed]
    });
  },

  async refreshPanel(message, guildConfig) {
    const guildId = message.guild.id;
    const settings = guildConfig.settings?.colorRoles;

    if (!settings?.messageId || !settings?.channelId) {
      const prefix = await getPrefix(guildId);
      const embed = await errorEmbed(guildId, 'No Panel Found',
        `${GLYPHS.ERROR} No color roles panel exists.\n\n` +
        `Use \`${prefix}colorroles setup\` to create one.`
      );
      return message.reply({ embeds: [embed] });
    }

    try {
      const channel = message.guild.channels.cache.get(settings.channelId);
      if (!channel) {
        const prefix = await getPrefix(guildId);
        const embed = await errorEmbed(guildId, 'Channel Not Found',
          `${GLYPHS.ERROR} The color roles channel was deleted.\n\n` +
          `Use \`${prefix}colorroles delete\` then \`${prefix}colorroles setup\` to recreate.`
        );
        return message.reply({ embeds: [embed] });
      }

      const panelMessage = await channel.messages.fetch(settings.messageId).catch(() => null);
      if (!panelMessage) {
        const prefix = await getPrefix(guildId);
        const embed = await errorEmbed(guildId, 'Message Not Found',
          `${GLYPHS.ERROR} The panel message was deleted.\n\n` +
          `Use \`${prefix}colorroles delete\` then \`${prefix}colorroles setup\` to recreate.`
        );
        return message.reply({ embeds: [embed] });
      }

      // Build new embed
      const title = settings.title || '🎨 Color Roles';
      const description = settings.description || '**React to get a color role!**\nYou can only have one color at a time.';
      const embedColor = settings.embedColor || '#667eea';
      const footerText = settings.footerText || 'Click a reaction to get/remove a color role';

      const embed = new EmbedBuilder()
        .setColor(embedColor)
        .setTitle(title)
        .setDescription(
          description + '\n\n' +
          DEFAULT_COLORS.map(c => `${c.emoji} → \`${c.name}\``).join('\n')
        )
        .setFooter({ text: footerText })
        .setTimestamp();

      if (settings.image) embed.setImage(settings.image);
      if (settings.thumbnail) embed.setThumbnail(settings.thumbnail);

      await panelMessage.edit({ embeds: [embed] });

      const successEmb = await successEmbed(guildId, 'Panel Updated',
        `${GLYPHS.SUCCESS} Color roles panel has been refreshed!`
      );
      return message.reply({ embeds: [successEmb] });

    } catch (error) {
      console.error('Refresh error:', error);
      const embed = await errorEmbed(guildId, 'Refresh Failed',
        `${GLYPHS.ERROR} Failed to refresh panel.\n\n**Error:** ${error.message}`
      );
      return message.reply({ embeds: [embed] });
    }
  },

  async deletePanel(message, guildConfig) {
    const guildId = message.guild.id;
    const settings = guildConfig.settings?.colorRoles;

    if (!settings?.channelId) {
      const embed = await errorEmbed(guildId, 'No Panel Found',
        `${GLYPHS.ERROR} No color roles panel exists to delete.`
      );
      return message.reply({ embeds: [embed] });
    }

    try {
      // Delete the channel
      const channel = message.guild.channels.cache.get(settings.channelId);
      if (channel) {
        await channel.delete('Color roles panel deleted');
      }

      // Remove from reaction roles and clear color roles settings
      const filteredMessages = (guildConfig.settings?.reactionRoles?.messages || [])
        .filter(m => m.messageId !== settings.messageId);

      await Guild.updateGuild(guildId, {
        $set: {
          'settings.reactionRoles.messages': filteredMessages,
          'settings.colorRoles.channelId': null,
          'settings.colorRoles.messageId': null
        }
      });

      const prefix = await getPrefix(guildId);
      const embed = await successEmbed(guildId, 'Panel Deleted',
        `${GLYPHS.SUCCESS} Color roles panel and channel have been deleted.\n\n` +
        `Your customization settings are preserved.\n` +
        `Use \`${prefix}colorroles setup\` to create a new panel.`
      );
      return message.reply({ embeds: [embed] });

    } catch (error) {
      console.error('Delete error:', error);
      const embed = await errorEmbed(guildId, 'Delete Failed',
        `${GLYPHS.ERROR} Failed to delete panel.\n\n**Error:** ${error.message}`
      );
      return message.reply({ embeds: [embed] });
    }
  },

  async showSettings(message, guildConfig) {
    const guildId = message.guild.id;
    const settings = guildConfig.settings?.colorRoles || {};
    const hasPanel = !!settings.messageId;

    const embed = new EmbedBuilder()
      .setColor(settings.embedColor || '#00CED1')
      .setTitle('『 Color Roles Settings 』')
      .addFields(
        {
          name: '▸ Status',
          value: hasPanel ? `◉ Active in <#${settings.channelId}>` : '○ Not configured',
          inline: true
        },
        {
          name: '▸ Title',
          value: `\`${settings.title || '🎨 Color Roles'}\``,
          inline: true
        },
        {
          name: '▸ Embed Color',
          value: `\`${settings.embedColor || '#667eea'}\``,
          inline: true
        },
        {
          name: '▸ Description',
          value: (settings.description || 'Default').substring(0, 100) + (settings.description?.length > 100 ? '...' : ''),
          inline: false
        },
        {
          name: '▸ Image/Banner',
          value: settings.image ? `[View Image](${settings.image})` : 'Not configured',
          inline: true
        },
        {
          name: '📎 Thumbnail',
          value: settings.thumbnail ? `[View](${settings.thumbnail})` : 'Not set',
          inline: true
        },
        {
          name: '👣 Footer',
          value: `\`${settings.footerText || 'Default'}\``,
          inline: true
        }
      )
      .setFooter({ text: 'Use !colorroles set <option> <value> to customize' })
      .setTimestamp();

    if (settings.thumbnail) embed.setThumbnail(settings.thumbnail);

    return message.reply({ embeds: [embed] });
  }
};
