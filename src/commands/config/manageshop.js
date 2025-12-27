import { EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import Guild from '../../models/Guild.js';
import { successEmbed, errorEmbed, infoEmbed, GLYPHS } from '../../utils/embeds.js';
import { getPrefix, formatNumber } from '../../utils/helpers.js';

export default {
  name: 'manageshop',
  description: 'Add, remove, or modify shop backgrounds',
  usage: '<add|remove|edit|list|setprice> [options]',
  aliases: ['shopmanage', 'editshop', 'customshop'],
  category: 'config',
  permissions: [PermissionFlagsBits.ManageGuild],
  cooldown: 3,

  async execute(message, args, client) {
    const prefix = await getPrefix(message.guild.id);
    const guildConfig = await Guild.getGuild(message.guild.id, message.guild.name);

    // Initialize if not exists
    if (!guildConfig.customShopItems) {
      guildConfig.customShopItems = [];
    }

    const subcommand = args[0]?.toLowerCase();
    const coinEmoji = guildConfig.economy?.coinEmoji || '💰';
    const coinName = guildConfig.economy?.coinName || 'coins';

    if (!subcommand) {
      const fallbackBg = guildConfig.economy?.fallbackBackground;
      const embed = new EmbedBuilder()
        .setTitle('🖼️ Background Shop Management')
        .setColor(guildConfig.embedStyle?.color || '#667eea')
        .setDescription('Manage custom backgrounds in your server shop.')
        .addFields(
          { name: `${prefix}manageshop add <name> <price> <image_url>`, value: 'Add a new background', inline: false },
          { name: `${prefix}manageshop remove <id>`, value: 'Remove a background', inline: true },
          { name: `${prefix}manageshop list`, value: 'List all backgrounds', inline: true },
          { name: `${prefix}manageshop setprice <id> <price>`, value: 'Change price', inline: false },
          { name: `${prefix}manageshop edit <id> <field> <value>`, value: 'Edit properties (name, description, image)', inline: false },
          { name: `${prefix}manageshop stock <id> <amount>`, value: 'Set stock (-1 = unlimited)', inline: true },
          { name: `${prefix}manageshop fallback <url|color> <value>`, value: 'Set default background', inline: false }
        )
        .addFields(
          {
            name: '📊 Current Backgrounds',
            value: `${guildConfig.customShopItems.length} background(s) in shop`
          },
          {
            name: '🖼️ Fallback Background',
            value: fallbackBg?.image ? `Image: ${fallbackBg.image.substring(0, 50)}...` : `Color: ${fallbackBg?.color || '#2C2F33'}`
          }
        );

      return message.reply({ embeds: [embed] });
    }

    switch (subcommand) {
      case 'add': {
        // Parse: manageshop add "Background Name" 1000 https://image.url
        // Or: manageshop add BackgroundName 1000 https://image.url

        let itemName, price, imageUrl;

        // Check for quoted name
        const quotedMatch = args.slice(1).join(' ').match(/^"([^"]+)"\s+(\d+)\s+(.+)/);
        const unquotedMatch = args.slice(1).join(' ').match(/^(\S+)\s+(\d+)\s+(.+)/);

        if (quotedMatch) {
          [, itemName, price, imageUrl] = quotedMatch;
        } else if (unquotedMatch) {
          [, itemName, price, imageUrl] = unquotedMatch;
        } else {
          const embed = await errorEmbed(message.guild.id, 'Invalid Format',
            `${GLYPHS.ERROR} **Usage:**\n` +
            `\`${prefix}manageshop add "Background Name" <price> <image_url>\`\n` +
            `\`${prefix}manageshop add BackgroundName <price> <image_url>\`\n\n` +
            `**Example:** \`${prefix}manageshop add "Galaxy" 5000 https://example.com/galaxy.png\``
          );
          return message.reply({ embeds: [embed] });
        }

        price = parseInt(price);

        if (isNaN(price) || price < 0) {
          const embed = await errorEmbed(message.guild.id, 'Invalid Price',
            `${GLYPHS.ERROR} Price must be a positive number!`
          );
          return message.reply({ embeds: [embed] });
        }

        // Validate image URL
        if (!imageUrl || !imageUrl.match(/^https?:\/\/.+\.(png|jpg|jpeg|gif|webp)(\?.*)?$/i)) {
          const embed = await errorEmbed(message.guild.id, 'Invalid Image URL',
            `${GLYPHS.ERROR} Please provide a valid image URL (png, jpg, gif, or webp)`
          );
          return message.reply({ embeds: [embed] });
        }

        // Generate unique ID
        const itemId = `bg_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 4)}`;

        const newItem = {
          id: itemId,
          name: itemName,
          description: 'A custom background',
          price: price,
          type: 'background',
          image: imageUrl,
          stock: -1,
          createdBy: message.author.id,
          createdAt: new Date()
        };

        guildConfig.customShopItems.push(newItem);
        await guildConfig.save();

        const embed = new EmbedBuilder()
          .setColor('#667eea')
          .setTitle('✅ Background Added to Shop')
          .addFields(
            { name: '🖼️ Name', value: itemName, inline: true },
            { name: '💰 Price', value: `${formatNumber(price)} ${coinEmoji}`, inline: true },
            { name: '🆔 ID', value: `\`${itemId}\``, inline: true }
          )
          .setImage(imageUrl)
          .setFooter({ text: 'Background preview shown above' });

        return message.reply({ embeds: [embed] });
      }

      case 'remove': {
        const itemId = args[1];

        if (!itemId) {
          const embed = await errorEmbed(message.guild.id, 'Missing Item ID',
            `${GLYPHS.ERROR} Please provide the item ID!\n\n**Usage:** \`${prefix}manageshop remove <id>\`\n**Tip:** Use \`${prefix}manageshop list\` to see item IDs`
          );
          return message.reply({ embeds: [embed] });
        }

        const index = guildConfig.customShopItems.findIndex(item => item.id === itemId);
        if (index === -1) {
          const embed = await errorEmbed(message.guild.id, 'Item Not Found',
            `${GLYPHS.ERROR} No item found with ID: \`${itemId}\``
          );
          return message.reply({ embeds: [embed] });
        }

        const removedItem = guildConfig.customShopItems[index];
        guildConfig.customShopItems.splice(index, 1);
        await guildConfig.save();

        const embed = await successEmbed(message.guild.id, 'Item Removed',
          `${GLYPHS.SUCCESS} Removed **${removedItem.name}** from the shop.`
        );
        return message.reply({ embeds: [embed] });
      }

      case 'list': {
        if (guildConfig.customShopItems.length === 0) {
          const embed = await infoEmbed(message.guild.id, 'No Backgrounds',
            `${GLYPHS.INFO} No custom backgrounds in the shop yet.\n\nUse \`${prefix}manageshop add\` to add backgrounds!`
          );
          return message.reply({ embeds: [embed] });
        }

        const itemsPerPage = 5;
        let currentPage = 0;
        const maxPages = Math.ceil(guildConfig.customShopItems.length / itemsPerPage);

        const generateListEmbed = (page) => {
          const start = page * itemsPerPage;
          const items = guildConfig.customShopItems.slice(start, start + itemsPerPage);

          const embed = new EmbedBuilder()
            .setTitle('🖼️ Shop Backgrounds')
            .setColor(guildConfig.embedStyle?.color || '#667eea')
            .setFooter({ text: `Page ${page + 1}/${maxPages} | Total: ${guildConfig.customShopItems.length} backgrounds` });

          items.forEach(item => {
            const stockText = item.stock === -1 ? '∞' : item.stock;
            embed.addFields({
              name: `🖼️ ${item.name}`,
              value: `**ID:** \`${item.id}\`\n**Price:** ${formatNumber(item.price)} ${coinEmoji}\n**Stock:** ${stockText}${item.image ? `\n**Image:** [Preview](${item.image})` : ''}`,
              inline: false
            });
          });

          return embed;
        };

        if (maxPages === 1) {
          return message.reply({ embeds: [generateListEmbed(0)] });
        }

        const buttons = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('prev')
              .setLabel('◀️ Previous')
              .setStyle(ButtonStyle.Primary)
              .setDisabled(true),
            new ButtonBuilder()
              .setCustomId('next')
              .setLabel('Next ▶️')
              .setStyle(ButtonStyle.Primary)
              .setDisabled(maxPages <= 1)
          );

        const listMessage = await message.reply({
          embeds: [generateListEmbed(0)],
          components: [buttons]
        });

        const collector = listMessage.createMessageComponentCollector({
          filter: i => i.user.id === message.author.id,
          time: 60000
        });

        collector.on('collect', async (interaction) => {
          if (interaction.customId === 'prev') {
            currentPage = Math.max(0, currentPage - 1);
          } else if (interaction.customId === 'next') {
            currentPage = Math.min(maxPages - 1, currentPage + 1);
          }

          const newButtons = new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder()
                .setCustomId('prev')
                .setLabel('◀️ Previous')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(currentPage === 0),
              new ButtonBuilder()
                .setCustomId('next')
                .setLabel('Next ▶️')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(currentPage === maxPages - 1)
            );

          await interaction.update({
            embeds: [generateListEmbed(currentPage)],
            components: [newButtons]
          });
        });

        collector.on('end', () => {
          listMessage.edit({ components: [] }).catch(() => { });
        });

        return;
      }

      case 'setprice': {
        const itemId = args[1];
        const newPrice = parseInt(args[2]);

        if (!itemId || isNaN(newPrice)) {
          const embed = await errorEmbed(message.guild.id, 'Invalid Usage',
            `${GLYPHS.ERROR} **Usage:** \`${prefix}manageshop setprice <id> <price>\`\n\n**Example:** \`${prefix}manageshop setprice custom_abc123 2500\``
          );
          return message.reply({ embeds: [embed] });
        }

        if (newPrice < 0) {
          const embed = await errorEmbed(message.guild.id, 'Invalid Price',
            `${GLYPHS.ERROR} Price must be 0 or greater!`
          );
          return message.reply({ embeds: [embed] });
        }

        const item = guildConfig.customShopItems.find(i => i.id === itemId);
        if (!item) {
          const embed = await errorEmbed(message.guild.id, 'Item Not Found',
            `${GLYPHS.ERROR} No item found with ID: \`${itemId}\``
          );
          return message.reply({ embeds: [embed] });
        }

        const oldPrice = item.price;
        item.price = newPrice;
        await guildConfig.save();

        const embed = await successEmbed(message.guild.id, 'Price Updated',
          `${GLYPHS.SUCCESS} Updated **${item.name}** price:\n\n` +
          `**Old Price:** ${formatNumber(oldPrice)} ${coinEmoji}\n` +
          `**New Price:** ${formatNumber(newPrice)} ${coinEmoji}`
        );
        return message.reply({ embeds: [embed] });
      }

      case 'edit': {
        const itemId = args[1];
        const field = args[2]?.toLowerCase();
        const value = args.slice(3).join(' ');

        if (!itemId || !field) {
          const embed = await errorEmbed(message.guild.id, 'Invalid Usage',
            `${GLYPHS.ERROR} **Usage:** \`${prefix}manageshop edit <id> <field> <value>\`\n\n` +
            `**Fields:** name, description, image\n\n` +
            `**Example:** \`${prefix}manageshop edit bg_abc123 description "A beautiful galaxy background"\``
          );
          return message.reply({ embeds: [embed] });
        }

        const item = guildConfig.customShopItems.find(i => i.id === itemId);
        if (!item) {
          const embed = await errorEmbed(message.guild.id, 'Item Not Found',
            `${GLYPHS.ERROR} No item found with ID: \`${itemId}\``
          );
          return message.reply({ embeds: [embed] });
        }

        // Remove quotes if present
        const cleanValue = value.replace(/^["']|["']$/g, '');

        switch (field) {
          case 'name':
            if (!cleanValue) {
              return message.reply({ embeds: [await errorEmbed(message.guild.id, 'Missing Value', `${GLYPHS.ERROR} Please provide a name!`)] });
            }
            item.name = cleanValue;
            break;
          case 'description':
          case 'desc':
            if (!cleanValue) {
              return message.reply({ embeds: [await errorEmbed(message.guild.id, 'Missing Value', `${GLYPHS.ERROR} Please provide a description!`)] });
            }
            item.description = cleanValue;
            break;
          case 'image':
            if (!cleanValue || !cleanValue.match(/^https?:\/\/.+\.(png|jpg|jpeg|gif|webp)(\?.*)?$/i)) {
              return message.reply({ embeds: [await errorEmbed(message.guild.id, 'Invalid Image URL', `${GLYPHS.ERROR} Please provide a valid image URL!`)] });
            }
            item.image = cleanValue;
            break;
          default:
            return message.reply({ embeds: [await errorEmbed(message.guild.id, 'Unknown Field', `${GLYPHS.ERROR} Valid fields: name, description, image`)] });
        }

        await guildConfig.save();

        const embed = await successEmbed(message.guild.id, 'Background Updated',
          `${GLYPHS.SUCCESS} Updated **${item.name}**'s ${field} to: **${cleanValue}**`
        );
        return message.reply({ embeds: [embed] });
      }

      case 'stock': {
        const itemId = args[1];
        const stock = parseInt(args[2]);

        if (!itemId || isNaN(stock)) {
          const embed = await errorEmbed(message.guild.id, 'Invalid Usage',
            `${GLYPHS.ERROR} **Usage:** \`${prefix}manageshop stock <id> <amount>\`\n\n` +
            `Use \`-1\` for unlimited stock.\n\n` +
            `**Example:** \`${prefix}manageshop stock bg_abc123 50\``
          );
          return message.reply({ embeds: [embed] });
        }

        const item = guildConfig.customShopItems.find(i => i.id === itemId);
        if (!item) {
          const embed = await errorEmbed(message.guild.id, 'Item Not Found',
            `${GLYPHS.ERROR} No item found with ID: \`${itemId}\``
          );
          return message.reply({ embeds: [embed] });
        }

        item.stock = stock;
        await guildConfig.save();

        const stockText = stock === -1 ? 'Unlimited' : stock.toString();
        const embed = await successEmbed(message.guild.id, 'Stock Updated',
          `${GLYPHS.SUCCESS} **${item.name}** stock set to: **${stockText}**`
        );
        return message.reply({ embeds: [embed] });
      }

      case 'fallback': {
        const type = args[1]?.toLowerCase();
        const value = args.slice(2).join(' ') || args[2];

        if (!type || !value) {
          const currentFallback = guildConfig.economy?.fallbackBackground;
          const embed = await infoEmbed(message.guild.id, 'Fallback Background',
            `${GLYPHS.INFO} Set the default background for profiles.\n\n` +
            `**Usage:**\n` +
            `\`${prefix}manageshop fallback url <image_url>\` - Set image URL\n` +
            `\`${prefix}manageshop fallback color <hex_color>\` - Set solid color\n` +
            `\`${prefix}manageshop fallback clear\` - Reset to default\n\n` +
            `**Current Settings:**\n` +
            `Image: ${currentFallback?.image || 'None'}\n` +
            `Color: ${currentFallback?.color || '#2C2F33'}`
          );
          return message.reply({ embeds: [embed] });
        }

        // Initialize economy if not exists
        if (!guildConfig.economy) {
          guildConfig.economy = {};
        }
        if (!guildConfig.economy.fallbackBackground) {
          guildConfig.economy.fallbackBackground = { image: '', color: '#2C2F33' };
        }

        if (type === 'url' || type === 'image') {
          // Validate URL format
          if (!value.startsWith('http://') && !value.startsWith('https://')) {
            const embed = await errorEmbed(message.guild.id, 'Invalid URL',
              `${GLYPHS.ERROR} Please provide a valid image URL starting with http:// or https://`
            );
            return message.reply({ embeds: [embed] });
          }

          guildConfig.economy.fallbackBackground.image = value;
          await guildConfig.save();

          const embed = await successEmbed(message.guild.id, 'Fallback Background Updated',
            `${GLYPHS.SUCCESS} Default background image set!\n\nURL: ${value.substring(0, 60)}...`
          );
          embed.setImage(value);
          return message.reply({ embeds: [embed] });

        } else if (type === 'color') {
          // Validate hex color
          if (!/^#[0-9A-F]{6}$/i.test(value)) {
            const embed = await errorEmbed(message.guild.id, 'Invalid Color',
              `${GLYPHS.ERROR} Please provide a valid hex color (e.g., #FF0000)`
            );
            return message.reply({ embeds: [embed] });
          }

          guildConfig.economy.fallbackBackground.color = value;
          await guildConfig.save();

          const embed = new EmbedBuilder()
            .setColor(value)
            .setTitle('✅ Fallback Color Updated')
            .setDescription(`${GLYPHS.SUCCESS} Default background color set to: **${value}**`);
          return message.reply({ embeds: [embed] });

        } else if (type === 'clear' || type === 'reset') {
          guildConfig.economy.fallbackBackground = { image: '', color: '#2C2F33' };
          await guildConfig.save();

          const embed = await successEmbed(message.guild.id, 'Fallback Reset',
            `${GLYPHS.SUCCESS} Default background reset to default dark theme.`
          );
          return message.reply({ embeds: [embed] });

        } else {
          const embed = await errorEmbed(message.guild.id, 'Invalid Type',
            `${GLYPHS.ERROR} Use \`url\`, \`color\`, or \`clear\``
          );
          return message.reply({ embeds: [embed] });
        }
      }

      default: {
        const embed = await errorEmbed(message.guild.id, 'Unknown Subcommand',
          `${GLYPHS.ERROR} Unknown subcommand: \`${subcommand}\`\n\nUse \`${prefix}manageshop\` to see available options.`
        );
        return message.reply({ embeds: [embed] });
      }
    }
  }
};
