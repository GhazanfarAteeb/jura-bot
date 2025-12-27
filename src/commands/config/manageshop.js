import { EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import Guild from '../../models/Guild.js';
import { successEmbed, errorEmbed, infoEmbed, GLYPHS } from '../../utils/embeds.js';
import { getPrefix, formatNumber } from '../../utils/helpers.js';

const ITEM_TYPES = ['role', 'item', 'background', 'other'];
const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];
const RARITY_COLORS = {
  common: '#95A5A6',
  uncommon: '#2ECC71',
  rare: '#3498DB',
  epic: '#9B59B6',
  legendary: '#F39C12',
  mythic: '#E74C3C'
};

export default {
  name: 'manageshop',
  description: 'Add, remove, or modify custom shop items',
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
      const embed = new EmbedBuilder()
        .setTitle('🛒 Shop Management')
        .setColor(guildConfig.embedStyle?.color || '#5865F2')
        .setDescription('Manage custom items in your server shop.')
        .addFields(
          { name: `${prefix}manageshop add <name> <price>`, value: 'Add a new item', inline: false },
          { name: `${prefix}manageshop remove <id>`, value: 'Remove an item', inline: true },
          { name: `${prefix}manageshop list`, value: 'List all custom items', inline: true },
          { name: `${prefix}manageshop setprice <id> <price>`, value: 'Change item price', inline: false },
          { name: `${prefix}manageshop edit <id> <field> <value>`, value: 'Edit item properties', inline: false },
          { name: `${prefix}manageshop role <id> @role`, value: 'Set role for item', inline: true },
          { name: `${prefix}manageshop stock <id> <amount>`, value: 'Set stock (-1 = unlimited)', inline: true }
        )
        .addFields({
          name: '📊 Current Items',
          value: `${guildConfig.customShopItems.length} custom item(s) in shop`
        })
        .setFooter({ text: `Item types: ${ITEM_TYPES.join(', ')} | Rarities: ${RARITIES.join(', ')}` });

      return message.reply({ embeds: [embed] });
    }

    switch (subcommand) {
      case 'add': {
        // Parse: manageshop add "Item Name" 1000 [type] [rarity]
        // Or: manageshop add ItemName 1000 [type] [rarity]

        let itemName, price, type, rarity;

        // Check for quoted name
        const quotedMatch = args.slice(1).join(' ').match(/^"([^"]+)"\s+(\d+)(?:\s+(\w+))?(?:\s+(\w+))?/);
        const unquotedMatch = args.slice(1).join(' ').match(/^(\S+)\s+(\d+)(?:\s+(\w+))?(?:\s+(\w+))?/);

        if (quotedMatch) {
          [, itemName, price, type, rarity] = quotedMatch;
        } else if (unquotedMatch) {
          [, itemName, price, type, rarity] = unquotedMatch;
        } else {
          const embed = await errorEmbed(message.guild.id, 'Invalid Format',
            `${GLYPHS.ERROR} **Usage:**\n` +
            `\`${prefix}manageshop add "Item Name" <price> [type] [rarity]\`\n` +
            `\`${prefix}manageshop add ItemName <price> [type] [rarity]\`\n\n` +
            `**Example:** \`${prefix}manageshop add "VIP Badge" 5000 item rare\``
          );
          return message.reply({ embeds: [embed] });
        }

        price = parseInt(price);
        type = type?.toLowerCase() || 'item';
        rarity = rarity?.toLowerCase() || 'common';

        if (isNaN(price) || price < 0) {
          const embed = await errorEmbed(message.guild.id, 'Invalid Price',
            `${GLYPHS.ERROR} Price must be a positive number!`
          );
          return message.reply({ embeds: [embed] });
        }

        if (!ITEM_TYPES.includes(type)) {
          const embed = await errorEmbed(message.guild.id, 'Invalid Type',
            `${GLYPHS.ERROR} Valid types: ${ITEM_TYPES.join(', ')}`
          );
          return message.reply({ embeds: [embed] });
        }

        if (!RARITIES.includes(rarity)) {
          const embed = await errorEmbed(message.guild.id, 'Invalid Rarity',
            `${GLYPHS.ERROR} Valid rarities: ${RARITIES.join(', ')}`
          );
          return message.reply({ embeds: [embed] });
        }

        // Generate unique ID
        const itemId = `custom_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 4)}`;

        const newItem = {
          id: itemId,
          name: itemName,
          description: `A custom ${rarity} ${type}`,
          price: price,
          type: type,
          rarity: rarity,
          stock: -1,
          createdBy: message.author.id,
          createdAt: new Date()
        };

        guildConfig.customShopItems.push(newItem);
        await guildConfig.save();

        const embed = new EmbedBuilder()
          .setColor(RARITY_COLORS[rarity])
          .setTitle('✅ Item Added to Shop')
          .addFields(
            { name: '📦 Name', value: itemName, inline: true },
            { name: '💰 Price', value: `${formatNumber(price)} ${coinEmoji}`, inline: true },
            { name: '🎨 Rarity', value: rarity.charAt(0).toUpperCase() + rarity.slice(1), inline: true },
            { name: '📋 Type', value: type.charAt(0).toUpperCase() + type.slice(1), inline: true },
            { name: '🆔 ID', value: `\`${itemId}\``, inline: true },
            { name: '📊 Stock', value: 'Unlimited', inline: true }
          )
          .setFooter({ text: `Use ${prefix}manageshop edit ${itemId} description "Your description" to add a description` });

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
          const embed = await infoEmbed(message.guild.id, 'No Custom Items',
            `${GLYPHS.INFO} No custom items in the shop yet.\n\nUse \`${prefix}manageshop add\` to add items!`
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
            .setTitle('🛒 Custom Shop Items')
            .setColor(guildConfig.embedStyle?.color || '#5865F2')
            .setFooter({ text: `Page ${page + 1}/${maxPages} | Total: ${guildConfig.customShopItems.length} items` });

          items.forEach(item => {
            const stockText = item.stock === -1 ? '∞' : item.stock;
            embed.addFields({
              name: `${item.name} (${item.rarity})`,
              value: `**ID:** \`${item.id}\`\n**Price:** ${formatNumber(item.price)} ${coinEmoji}\n**Type:** ${item.type} | **Stock:** ${stockText}${item.roleId ? `\n**Role:** <@&${item.roleId}>` : ''}`,
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
            `**Fields:** name, description, rarity, type, image\n\n` +
            `**Example:** \`${prefix}manageshop edit custom_abc123 description "A super cool item!"\``
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
          case 'rarity':
            if (!RARITIES.includes(cleanValue.toLowerCase())) {
              return message.reply({ embeds: [await errorEmbed(message.guild.id, 'Invalid Rarity', `${GLYPHS.ERROR} Valid rarities: ${RARITIES.join(', ')}`)] });
            }
            item.rarity = cleanValue.toLowerCase();
            break;
          case 'type':
            if (!ITEM_TYPES.includes(cleanValue.toLowerCase())) {
              return message.reply({ embeds: [await errorEmbed(message.guild.id, 'Invalid Type', `${GLYPHS.ERROR} Valid types: ${ITEM_TYPES.join(', ')}`)] });
            }
            item.type = cleanValue.toLowerCase();
            break;
          case 'image':
            item.image = cleanValue;
            break;
          default:
            return message.reply({ embeds: [await errorEmbed(message.guild.id, 'Unknown Field', `${GLYPHS.ERROR} Valid fields: name, description, rarity, type, image`)] });
        }

        await guildConfig.save();

        const embed = await successEmbed(message.guild.id, 'Item Updated',
          `${GLYPHS.SUCCESS} Updated **${item.name}**'s ${field} to: **${cleanValue}**`
        );
        return message.reply({ embeds: [embed] });
      }

      case 'role': {
        const itemId = args[1];
        const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[2]);

        if (!itemId) {
          const embed = await errorEmbed(message.guild.id, 'Missing Item ID',
            `${GLYPHS.ERROR} **Usage:** \`${prefix}manageshop role <id> @role\`\n\nThis sets a role to be given when the item is purchased.`
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

        if (!role) {
          // Remove role from item
          item.roleId = undefined;
          item.type = 'item';
          await guildConfig.save();

          const embed = await successEmbed(message.guild.id, 'Role Removed',
            `${GLYPHS.SUCCESS} Removed role from **${item.name}**.`
          );
          return message.reply({ embeds: [embed] });
        }

        item.roleId = role.id;
        item.type = 'role';
        await guildConfig.save();

        const embed = await successEmbed(message.guild.id, 'Role Set',
          `${GLYPHS.SUCCESS} **${item.name}** will now give ${role} when purchased.`
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
            `**Example:** \`${prefix}manageshop stock custom_abc123 50\``
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

      default: {
        const embed = await errorEmbed(message.guild.id, 'Unknown Subcommand',
          `${GLYPHS.ERROR} Unknown subcommand: \`${subcommand}\`\n\nUse \`${prefix}manageshop\` to see available options.`
        );
        return message.reply({ embeds: [embed] });
      }
    }
  }
};
