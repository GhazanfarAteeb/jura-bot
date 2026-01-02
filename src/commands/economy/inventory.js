import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import Economy from '../../models/Economy.js';
import Guild from '../../models/Guild.js';
import { getPrefix } from '../../utils/helpers.js';
import { getRandomFooter } from '../../utils/raphael.js';

export default {
  name: 'inventory',
  description: 'View your purchased items',
  usage: 'inventory [backgrounds/badges/items]',
  category: 'economy',
  aliases: ['inv', 'bag', 'items'],
  cooldown: 3,

  execute: async (message, args) => {
    const userId = message.author.id;
    const guildId = message.guild.id;

    try {
      const economy = await Economy.getEconomy(userId, guildId);
      const guildConfig = await Guild.getGuild(guildId);

      const category = args[0]?.toLowerCase() || 'backgrounds';

      if (category === 'backgrounds' || category === 'bg') {
        // Filter out the default background from display
        const ownedBackgrounds = economy.inventory.backgrounds.filter(bg => bg.id !== 'default');

        if (ownedBackgrounds.length === 0) {
          const prefix = await getPrefix(guildId);
          return message.reply(`**Notice:** Your inventory is vacant, Master. Visit \`${prefix}shop\` to acquire assets.`);
        }

        // Get shop items to find images
        const shopItems = guildConfig.customShopItems || [];

        let currentPage = 0;
        const maxPages = ownedBackgrounds.length;

        const generateEmbed = (page) => {
          const bg = ownedBackgrounds[page];
          const isEquipped = economy.profile.background === bg.id;

          // Find the image from shop items
          const shopItem = shopItems.find(item => item.id === bg.id);
          const imageUrl = shopItem?.image || bg.image || '';

          const embed = new EmbedBuilder()
            .setColor('#00CED1')
            .setAuthor({
              name: `${message.author.tag}'s Inventory`,
              iconURL: message.author.displayAvatarURL({ dynamic: true })
            })
            .setTitle(`『 ${bg.name} 』`)
            .addFields(
              { name: '▸ Status', value: isEquipped ? '◉ **ACTIVE**' : '○ Inactive', inline: true },
              { name: '▸ Acquired', value: `<t:${Math.floor(bg.purchasedAt.getTime() / 1000)}:R>`, inline: true }
            )
            .setFooter({
              text: `${getRandomFooter()} | Item ${page + 1} of ${maxPages} | Use !setbg ${bg.id} to equip`
            })
            .setTimestamp();

          if (imageUrl) {
            embed.setImage(imageUrl);
          }

          return embed;
        };

        const generateButtons = (page) => {
          const bg = ownedBackgrounds[page];
          const isEquipped = economy.profile.background === bg.id;

          return new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder()
                .setCustomId('previous')
                .setLabel('◀ Previous')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(page === 0),
              new ButtonBuilder()
                .setCustomId('equip')
                .setLabel(isEquipped ? '◉ Active' : 'Activate')
                .setStyle(isEquipped ? ButtonStyle.Secondary : ButtonStyle.Success)
                .setDisabled(isEquipped),
              new ButtonBuilder()
                .setCustomId('next')
                .setLabel('Next ▶')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(page === maxPages - 1)
            );
        };

        const embed = generateEmbed(currentPage);
        const buttons = generateButtons(currentPage);

        const invMessage = await message.reply({
          embeds: [embed],
          components: [buttons]
        });

        const collector = invMessage.createMessageComponentCollector({
          componentType: ComponentType.Button,
          filter: (i) => i.user.id === message.author.id,
          time: 120000
        });

        collector.on('collect', async (interaction) => {
          if (interaction.customId === 'previous') {
            currentPage = Math.max(0, currentPage - 1);
            await interaction.update({
              embeds: [generateEmbed(currentPage)],
              components: [generateButtons(currentPage)]
            });
          } else if (interaction.customId === 'next') {
            currentPage = Math.min(maxPages - 1, currentPage + 1);
            await interaction.update({
              embeds: [generateEmbed(currentPage)],
              components: [generateButtons(currentPage)]
            });
          } else if (interaction.customId === 'equip') {
            const bg = ownedBackgrounds[currentPage];
            economy.profile.background = bg.id;
            await economy.save();

            await interaction.update({
              embeds: [generateEmbed(currentPage)],
              components: [generateButtons(currentPage)]
            });
          }
        });

        collector.on('end', () => {
          invMessage.edit({ components: [] }).catch(() => { });
        });

      } else if (category === 'badges') {
        const embed = new EmbedBuilder()
          .setColor('#FFD700')
          .setAuthor({
            name: `${message.author.tag}'s Inventory`,
            iconURL: message.author.displayAvatarURL({ dynamic: true })
          })
          .setTitle('🏅 Badges')
          .setDescription(
            economy.inventory.badges.length > 0
              ? economy.inventory.badges.map((badge, i) =>
                `${i + 1}. 🏅 **${badge.name}**\nEarned: <t:${Math.floor(badge.earnedAt.getTime() / 1000)}:R>`
              ).join('\n\n')
              : 'No badges earned yet! Complete achievements to earn badges.'
          )
          .setFooter({ text: `Total: ${economy.inventory.badges.length} badges` })
          .setTimestamp();

        message.reply({ embeds: [embed] });

      } else if (category === 'items') {
        const embed = new EmbedBuilder()
          .setColor('#3498DB')
          .setAuthor({
            name: `${message.author.tag}'s Inventory`,
            iconURL: message.author.displayAvatarURL({ dynamic: true })
          })
          .setTitle('📦 Items')
          .setDescription(
            economy.inventory.items.length > 0
              ? economy.inventory.items.map((item, i) =>
                `${i + 1}. **${item.name}** x${item.quantity}\nPurchased: <t:${Math.floor(item.purchasedAt.getTime() / 1000)}:R>`
              ).join('\n\n')
              : 'No items yet!'
          )
          .setFooter({ text: `Total: ${economy.inventory.items.length} item types` })
          .setTimestamp();

        message.reply({ embeds: [embed] });

      } else {
        message.reply('**Error:** Invalid category specified. Use: `backgrounds`, `badges`, or `items`, Master.');
      }

    } catch (error) {
      console.error('Inventory command error:', error);
      message.reply('**Error:** An anomaly occurred while loading inventory data, Master.');
    }
  }
};
